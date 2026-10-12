import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Forward-only migration runner for the chat MariaDB schema.
 *
 * The runner is intentionally decoupled from mysql2: it depends only on the
 * narrow {@link MigrationRunnerDatabase} surface, so ordering, checksum,
 * idempotency and drift logic can be unit-tested with an in-memory fake, while
 * the real adapter records each migration with a SHA-256 checksum.
 *
 * Guarantees:
 * - Migrations are validated for unique, ascending ids before any database work.
 * - Each migration runs inside a transaction and is recorded exactly once.
 * - An already-recorded migration is skipped (idempotent) unless its checksum
 *   changed, which is treated as drift and aborts the run.
 * - Migration discovery is explicit and configurable; it reads committed `.sql`
 *   files, never generated build output.
 *
 * Limitation: MariaDB DDL statements cause implicit commits, so a migration that
 * contains DDL is not fully atomic even though it is wrapped in a transaction.
 * Keep data migrations (DML) separate from schema changes.
 */

/** Bookkeeping table that records which migrations have been applied. */
export const MIGRATIONS_TABLE = "chat_schema_migrations";

export const MIGRATIONS_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
  id VARCHAR(191) NOT NULL,
  checksum CHAR(64) NOT NULL,
  applied_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`.trim();

export type ChatMigration = {
  /** Stable, ordered, unique identifier (for example `0001_create_chat_schema`). */
  readonly id: string;
  /** Ordered SQL statements executed sequentially inside one transaction. */
  readonly statements: readonly string[];
};

export type AppliedMigration = {
  readonly id: string;
  readonly checksum: string;
};

export type MigrationRunResult = {
  readonly applied: readonly string[];
  readonly skipped: readonly string[];
};

/**
 * Narrow database surface required by the runner. Implemented for MariaDB in
 * `lib/chat/db.ts`; faked in tests.
 */
export interface MigrationRunnerDatabase {
  /** Creates the bookkeeping table when it does not exist yet. */
  ensureMigrationsTable(): Promise<void>;
  /** Returns every recorded migration id with its stored checksum. */
  getAppliedMigrations(): Promise<readonly AppliedMigration[]>;
  /** Applies one migration and records its checksum atomically. */
  applyMigration(
    migration: ChatMigration,
    checksum: string,
    appliedAt: Date
  ): Promise<void>;
}

export interface MigrationSource {
  load(): Promise<readonly ChatMigration[]>;
}

export interface RunMigrationsOptions {
  /** Timestamp source, injectable for deterministic tests. */
  readonly now?: () => Date;
}

export class MigrationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MigrationValidationError";
  }
}

export class MigrationChecksumMismatchError extends Error {
  readonly migrationId: string;
  readonly recordedChecksum: string;
  readonly computedChecksum: string;

  constructor(
    migrationId: string,
    recordedChecksum: string,
    computedChecksum: string
  ) {
    super(
      `Checksum drift detected for migration ${migrationId}. ` +
        `Recorded ${recordedChecksum}, computed ${computedChecksum}. ` +
        `Never edit an applied migration; add a new one instead.`
    );
    this.name = "MigrationChecksumMismatchError";
    this.migrationId = migrationId;
    this.recordedChecksum = recordedChecksum;
    this.computedChecksum = computedChecksum;
  }
}

/**
 * Computes a deterministic SHA-256 checksum over a migration's identity and
 * statements. Line endings are normalized so the same migration checksums
 * identically across operating systems.
 */
export function computeMigrationChecksum(migration: ChatMigration): string {
  const hash = createHash("sha256");
  hash.update(migration.id);
  hash.update("\n");
  for (const statement of migration.statements) {
    hash.update(statement.replace(/\r\n/g, "\n").trim());
    hash.update("\n--\n");
  }
  return hash.digest("hex");
}

/**
 * Validates that migrations have non-empty, unique ids and are in ascending
 * order. Runs before any database access so a bad list never partially applies.
 */
export function validateMigrations(migrations: readonly ChatMigration[]): void {
  const seen = new Set<string>();
  let previous: string | null = null;

  for (const migration of migrations) {
    if (migration.id.trim() === "") {
      throw new MigrationValidationError("Migration id must be a non-empty string.");
    }
    if (seen.has(migration.id)) {
      throw new MigrationValidationError(`Duplicate migration id: ${migration.id}.`);
    }
    seen.add(migration.id);

    if (previous !== null && migration.id <= previous) {
      throw new MigrationValidationError(
        `Migrations must be ordered ascending by id: ${migration.id} follows ${previous}.`
      );
    }
    previous = migration.id;
  }
}

/**
 * Applies every pending migration in order and returns which ids were applied
 * and which were already recorded.
 */
export async function runMigrations(
  database: MigrationRunnerDatabase,
  migrations: readonly ChatMigration[],
  options: RunMigrationsOptions = {}
): Promise<MigrationRunResult> {
  validateMigrations(migrations);

  const now = options.now ?? (() => new Date());

  await database.ensureMigrationsTable();
  const appliedRows = await database.getAppliedMigrations();
  const recordedChecksums = new Map(
    appliedRows.map((row) => [row.id, row.checksum])
  );

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const migration of migrations) {
    const checksum = computeMigrationChecksum(migration);
    const recordedChecksum = recordedChecksums.get(migration.id);

    if (recordedChecksum !== undefined) {
      if (recordedChecksum !== checksum) {
        throw new MigrationChecksumMismatchError(
          migration.id,
          recordedChecksum,
          checksum
        );
      }
      skipped.push(migration.id);
      continue;
    }

    await database.applyMigration(migration, checksum, now());
    applied.push(migration.id);
  }

  return { applied, skipped };
}

/**
 * Splits a SQL script into individual statements on top-level semicolons while
 * ignoring semicolons inside string literals, quoted identifiers and comments.
 *
 * `multipleStatements` is deliberately disabled on the pool, so each returned
 * statement is executed on its own. Comments are stripped to keep token
 * separation; MySQL executable comments (`/*! ... *\/`) are not supported.
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let index = 0;
  const length = sql.length;

  const flush = (): void => {
    const trimmed = current.trim();
    if (trimmed.length > 0) {
      statements.push(trimmed);
    }
    current = "";
  };

  while (index < length) {
    const char = sql[index];
    const next = sql[index + 1];

    // Line comment: `-- ...` or `# ...`
    if ((char === "-" && next === "-") || char === "#") {
      while (index < length && sql[index] !== "\n") {
        index += 1;
      }
      current += " ";
      continue;
    }

    // Block comment: `/* ... */`
    if (char === "/" && next === "*") {
      index += 2;
      while (index < length && !(sql[index] === "*" && sql[index + 1] === "/")) {
        index += 1;
      }
      index += 2;
      current += " ";
      continue;
    }

    // Quoted literal or identifier: '...', "..." or `...`
    if (char === "'" || char === '"' || char === "`") {
      const quote = char;
      current += quote;
      index += 1;
      while (index < length) {
        const inner = sql[index];
        if (inner === "\\" && quote !== "`") {
          current += inner;
          if (index + 1 < length) {
            current += sql[index + 1];
          }
          index += 2;
          continue;
        }
        if (inner === quote) {
          if (sql[index + 1] === quote) {
            current += quote + quote;
            index += 2;
            continue;
          }
          current += quote;
          index += 1;
          break;
        }
        current += inner;
        index += 1;
      }
      continue;
    }

    if (char === ";") {
      flush();
      index += 1;
      continue;
    }

    current += char;
    index += 1;
  }

  flush();
  return statements;
}

export interface SqlMigrationLoaderDependencies {
  readonly readDirectory?: (directory: string) => Promise<readonly string[]>;
  readonly readFile?: (path: string) => Promise<string>;
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

/**
 * Loads migrations from a directory of committed `.sql` files. Each file is one
 * migration whose id is the file name without the extension; statements are
 * split on top-level semicolons. A missing directory resolves to an empty list
 * so the runner is safe before the first migration is authored.
 */
export async function loadSqlDirectoryMigrations(
  directory: string,
  dependencies: SqlMigrationLoaderDependencies = {}
): Promise<ChatMigration[]> {
  const readDirectory = dependencies.readDirectory ?? readdir;
  const readFileContents = dependencies.readFile ?? ((path: string) => readFile(path, "utf8"));

  let entries: readonly string[];
  try {
    entries = await readDirectory(directory);
  } catch (error) {
    if (isNotFoundError(error)) {
      return [];
    }
    throw error;
  }

  const sqlFiles = entries.filter((name) => name.endsWith(".sql")).sort();
  const migrations: ChatMigration[] = [];

  for (const file of sqlFiles) {
    const content = await readFileContents(join(directory, file));
    migrations.push({
      id: file.replace(/\.sql$/, ""),
      statements: splitSqlStatements(content),
    });
  }

  return migrations;
}

/** Builds a {@link MigrationSource} backed by a directory of committed `.sql` files. */
export function createSqlDirectoryMigrationSource(directory: string): MigrationSource {
  return {
    load: () => loadSqlDirectoryMigrations(directory),
  };
}
