// Writes each legal document version's record hash (DECISIONS §66) into src/legal/documents.ts.
// `--documents <file>` and `--texts <file>` point it at another registry (the script's own test uses that).
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { build } from "tsup";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const { values } = parseArgs({ options: { documents: { type: "string" }, texts: { type: "string" } } });
const documentsPath = resolve(values.documents ?? join(ROOT, "src/legal/documents.ts"));
const textsPath = resolve(values.texts ?? join(ROOT, "src/legal-texts/texts.ts"));

const fail = (message) => {
  console.error(`legal:hash: ${message}`);
  process.exit(1);
};

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

// Entries are plain object literals with no nested braces, so each `{...}` without braces inside is one
// candidate; the one naming this type and version is the entry.
const replaceSha256 = (source, entry, sha256) => {
  const type = new RegExp(`\\btype:\\s*"${escape(entry.type)}"`, "u");
  const version = new RegExp(`\\bversion:\\s*"${escape(entry.version)}"`, "u");
  const matches = [...source.matchAll(/\{[^{}]*\}/gu)].filter((m) => type.test(m[0]) && version.test(m[0]));
  if (matches.length !== 1) fail(`found ${matches.length} literals for ${entry.type}@${entry.version} in ${documentsPath}`);
  const [match] = matches;
  const literal = match[0].replace(/(\bsha256:\s*")[0-9a-f]*(")/u, `$1${sha256}$2`);
  if (literal === match[0]) fail(`no sha256 in the literal for ${entry.type}@${entry.version}`);
  return source.slice(0, match.index) + literal + source.slice(match.index + match[0].length);
};

// Bundled inside the repo so the bundle resolves the package's own dependencies.
mkdirSync(join(ROOT, "node_modules/.cache"), { recursive: true });
const outDir = mkdtempSync(join(ROOT, "node_modules/.cache/legal-hash-"));
try {
  await build({
    config: false,
    entry: { documents: documentsPath, texts: textsPath, hash: join(ROOT, "src/legal-texts/hash.ts") },
    outDir,
    format: ["esm"],
    outExtension: () => ({ js: ".mjs" }),
    platform: "node",
    target: "node20",
    dts: false,
    sourcemap: false,
    splitting: false,
    silent: true,
  });
  const load = (name) => import(pathToFileURL(join(outDir, `${name}.mjs`)).href);
  const [{ LEGAL_DOCUMENTS }, { LEGAL_TEXTS }, { legalRecordSha256 }] = await Promise.all(
    ["documents", "texts", "hash"].map(load),
  );

  let source = readFileSync(documentsPath, "utf8");
  const written = [];
  for (const entry of LEGAL_DOCUMENTS) {
    const key = `${entry.type}@${entry.version}`;
    const blocks = LEGAL_TEXTS[key];
    // A version from before §66 keeps the hash it was stored with.
    if (entry.title === undefined && entry.summary === undefined && entry.material === undefined) {
      if (blocks !== undefined) fail(`${key} has blocks but no title, summary and material`);
      continue;
    }
    if (blocks === undefined) fail(`${key} has no LEGAL_TEXTS entry`);
    const sha256 = legalRecordSha256(entry, blocks);
    if (sha256 === entry.sha256) continue;
    source = replaceSha256(source, entry, sha256);
    written.push(`${key} ${sha256}`);
  }

  if (written.length > 0) writeFileSync(documentsPath, source);
  console.log(written.length > 0 ? written.join("\n") : "legal:hash: every hash is current");
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
