/**
 * Applies forward-only chat migrations to the configured MariaDB instance.
 *
 * Run: npm run chat:migrate
 *
 * The script resolves the database configuration from the environment, loads
 * committed `.sql` migrations from an explicit directory, and records each
 * applied migration with a SHA-256 checksum. It never prints credentials or a
 * connection string.
 *
 * The `server-only` guard on the database modules resolves to its no-op server
 * build under the `react-server` condition set by the `chat:migrate` script.
 */
import * as dotenv from "dotenv";
import { resolve } from "node:path";

import {
  ChatDatabaseConfigError,
  createChatDatabaseConfig,
} from "../lib/chat/database-config";
import {
  closeChatPool,
  createChatMigrationDatabase,
  getChatPool,
} from "../lib/chat/db";
import { loadSqlDirectoryMigrations, runMigrations } from "../lib/chat/migrations";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const DEFAULT_MIGRATIONS_DIR = resolve(process.cwd(), "lib/chat/migrations");

/** Replaces any occurrence of a secret with a constant marker. */
function redact(message: string, secrets: readonly string[]): string {
  let result = message;
  for (const secret of secrets) {
    if (secret.length > 0) {
      result = result.split(secret).join("[redacted]");
    }
  }
  return result;
}

async function main(): Promise<void> {
  const directory =
    process.env.CHAT_MIGRATIONS_DIR?.trim() || DEFAULT_MIGRATIONS_DIR;

  let config: ReturnType<typeof createChatDatabaseConfig>;
  try {
    config = createChatDatabaseConfig(process.env);
  } catch (error) {
    const message =
      error instanceof ChatDatabaseConfigError
        ? error.message
        : "Invalid database configuration.";
    console.error(`[chat:migrate] ${message}`);
    process.exitCode = 1;
    return;
  }

  try {
    const migrations = await loadSqlDirectoryMigrations(directory);
    if (migrations.length === 0) {
      console.log(`[chat:migrate] No SQL migrations found in ${directory}.`);
      return;
    }

    const result = await runMigrations(
      createChatMigrationDatabase(getChatPool()),
      migrations
    );

    if (result.applied.length === 0) {
      console.log(
        `[chat:migrate] Already up to date (${result.skipped.length} migration(s) verified).`
      );
    } else {
      console.log(
        `[chat:migrate] Applied ${result.applied.length} migration(s): ${result.applied.join(", ")}.`
      );
      if (result.skipped.length > 0) {
        console.log(
          `[chat:migrate] Verified ${result.skipped.length} previously applied migration(s).`
        );
      }
    }
  } catch (error) {
    const rawMessage =
      error instanceof Error ? error.message : "Migration failed.";
    console.error(
      `[chat:migrate] ${redact(rawMessage, [config.password, config.user])}`
    );
    process.exitCode = 1;
  } finally {
    await closeChatPool();
  }
}

void main();
