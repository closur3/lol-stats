import { mkdir, rm, writeFile } from "node:fs/promises";
import process from "node:process";
import { generateMarkdown } from "./markdownRenderer.js";

const url = process.env.WORKER_URL;
if (!url) throw new Error("WORKER_URL missing");
const includeArchive = process.env.INCLUDE_ARCHIVE === "true";

function buildBackupUrl(baseUrl) {
  const backupUrl = new URL(baseUrl);
  if (includeArchive) backupUrl.searchParams.set("includeArchive", "true");
  return backupUrl.toString();
}

const headers = {};
if (process.env.ADMIN_SECRET) headers.Authorization = `Bearer ${process.env.ADMIN_SECRET}`;

const backupUrl = buildBackupUrl(url);
console.log(`🚀 开始抓取: ${backupUrl}`);
const response = await fetch(backupUrl, { headers });
if (!response.ok) throw new Error(`Backup request failed: ${response.status} ${await response.text()}`);

const data = await response.json();
if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Backup payload must be object");
if (!data.home || typeof data.home !== "object" || Array.isArray(data.home)) throw new Error("Backup payload home must be object");
if (includeArchive && (!data.archive || typeof data.archive !== "object" || Array.isArray(data.archive))) {
  throw new Error("Backup payload archive must be object");
}

async function writeSnapshotMarkdown(slug, snapshot, written) {
  if (!snapshot?.tournament || snapshot.tournament.slug !== slug) throw new Error(`Invalid backup snapshot: ${slug}`);
  if (!snapshot.stats || typeof snapshot.stats !== "object" || Array.isArray(snapshot.stats)) throw new Error(`Invalid backup stats: ${slug}`);
  if (!snapshot.timeGrid || typeof snapshot.timeGrid !== "object" || Array.isArray(snapshot.timeGrid)) throw new Error(`Invalid backup timeGrid: ${slug}`);
  if (written.has(slug)) throw new Error(`Duplicate markdown slug: ${slug}`);
  const markdown = generateMarkdown(snapshot.tournament, snapshot.stats, { [slug]: snapshot.timeGrid });
  await writeFile(`markdown/${slug}.md`, markdown, "utf8");
  written.add(slug);
  console.log(`📝 [写入] markdown/${slug}.md`);
}

if (includeArchive) {
  await rm("markdown", { recursive: true, force: true });
}
await mkdir("markdown", { recursive: true });

const written = new Set();
for (const [slug, snapshot] of Object.entries(data.home).sort()) {
  await writeSnapshotMarkdown(slug, snapshot, written);
}
if (includeArchive) {
  for (const [slug, snapshot] of Object.entries(data.archive).sort()) {
    await writeSnapshotMarkdown(slug, snapshot, written);
  }
}

console.log(`\n✅ 处理完成。共写入 ${written.size} 个文件。`);
