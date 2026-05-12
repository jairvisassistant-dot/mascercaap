#!/usr/bin/env npx ts-node
/**
 * Validates i18n keys between messages/es.json and source files.
 * Reports: orphan JSON keys (defined but never accessed) and es/en parity gaps.
 *
 * Run: npx ts-node scripts/validate-i18n.ts
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SOURCE_DIRS = ["app", "components", "lib"];
const EXT = new Set([".ts", ".tsx"]);
const IGNORE = new Set(["node_modules", ".next", "dist", ".git"]);

// ─── flatten JSON to dot-notation leaf paths ──────────────────────────────────

function flattenKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return prefix ? [prefix] : [];
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) {
      keys.push(full);
      if (v.length > 0 && typeof v[0] === "object" && v[0] !== null) {
        keys.push(...flattenKeys(v[0], `${full}[]`));
      }
    } else if (typeof v === "object" && v !== null) {
      keys.push(...flattenKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

// ─── collect all source files recursively ────────────────────────────────────

function collectFiles(dir: string): string[] {
  const result: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return result;
  }
  for (const e of entries) {
    if (IGNORE.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      result.push(...collectFiles(full));
    } else if (e.isFile() && EXT.has(path.extname(e.name))) {
      result.push(full);
    }
  }
  return result;
}

// ─── check if a key path appears in source ───────────────────────────────────

function isKeyReferenced(keyPath: string, source: string): boolean {
  const normalized = keyPath.replace(/\[\]/g, "");
  const segments = normalized.split(".");

  // 1. Literal match: "dict.a.b.c" or full path segment
  if (source.includes(normalized)) return true;

  // 2. Partial path from second segment onward (handles `const t = dict.section; t.key`)
  if (segments.length >= 2) {
    const partial = segments.slice(1).join(".");
    if (partial && source.includes(partial)) return true;
  }

  const leaf = segments[segments.length - 1];
  const esc = leaf.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // 3. Property access: .leaf (e.g. slide.title, item.label)
  if (source.includes(`.${leaf}`)) return true;

  // 4. Last segment as string literal (dynamic access: dict.menu["order"])
  if (leaf.length >= 3) {
    const leafRe = new RegExp(`["'\`]${esc}["'\`]`);
    if (leafRe.test(source)) return true;
  }

  return false;
}

// ─── main ─────────────────────────────────────────────────────────────────────

function main() {
  const esFile = path.join(ROOT, "messages", "es.json");
  const enFile = path.join(ROOT, "messages", "en.json");

  const esJson = JSON.parse(fs.readFileSync(esFile, "utf8"));
  const allKeys = flattenKeys(esJson);

  // Collect all source text
  const files: string[] = [];
  for (const d of SOURCE_DIRS) {
    files.push(...collectFiles(path.join(ROOT, d)));
  }
  const source = files.map((f) => fs.readFileSync(f, "utf8")).join("\n");

  const orphans: string[] = [];
  const used: string[] = [];

  for (const key of allKeys) {
    if (isKeyReferenced(key, source)) {
      used.push(key);
    } else {
      orphans.push(key);
    }
  }

  // ─── report ─────────────────────────────────────────────────────────────────
  const hr = "─".repeat(62);
  console.log(`\n${hr}`);
  console.log("i18n Key Validation — messages/es.json");
  console.log(hr);
  console.log(`Source files scanned : ${files.length}`);
  console.log(`Total keys analysed  : ${allKeys.length}`);
  console.log(`Referenced           : ${used.length}`);
  console.log(`Potential orphans    : ${orphans.length}\n`);

  if (orphans.length === 0) {
    console.log("✅  No orphan keys found.");
  } else {
    console.log("⚠️  Potential orphan keys (defined in JSON, not found in source):");
    console.log("   Dynamic access patterns may cause false positives.\n");
    const bySection: Record<string, string[]> = {};
    for (const k of orphans) {
      const sec = k.split(".")[0];
      (bySection[sec] ??= []).push(k);
    }
    for (const [sec, keys] of Object.entries(bySection)) {
      console.log(`  [${sec}]`);
      for (const k of keys) console.log(`    - ${k}`);
    }
  }

  // ─── es / en parity check ────────────────────────────────────────────────
  if (fs.existsSync(enFile)) {
    const enJson = JSON.parse(fs.readFileSync(enFile, "utf8"));
    const enKeys = new Set(flattenKeys(enJson));
    const esKeys = new Set(allKeys);

    const missingInEn = [...esKeys].filter((k) => !enKeys.has(k));
    const missingInEs = [...enKeys].filter((k) => !esKeys.has(k));

    console.log(`\n${hr}`);
    console.log("🌐  Language parity — es.json vs en.json");
    if (!missingInEn.length && !missingInEs.length) {
      console.log("✅  Perfect parity.");
    } else {
      if (missingInEn.length) {
        console.log(`\n  Missing in en.json (${missingInEn.length}):`);
        missingInEn.slice(0, 30).forEach((k) => console.log(`    - ${k}`));
        if (missingInEn.length > 30) console.log(`    … and ${missingInEn.length - 30} more`);
      }
      if (missingInEs.length) {
        console.log(`\n  Missing in es.json (${missingInEs.length}):`);
        missingInEs.slice(0, 30).forEach((k) => console.log(`    - ${k}`));
        if (missingInEs.length > 30) console.log(`    … and ${missingInEs.length - 30} more`);
      }
    }
  }

  console.log(`\n${hr}\n`);
  process.exit(orphans.length > 0 ? 1 : 0);
}

main();
