import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  buildNikkeSnapshot,
  fetchRemoteNikkePayloads,
  formatNikkeDataFile,
} from "./nikke-snapshot.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(scriptDir);
const outputPath = join(repoRoot, "nikke-data.js");

const { chaptersPayload, outpostPayload } = await fetchRemoteNikkePayloads();
const snapshot = buildNikkeSnapshot(chaptersPayload, outpostPayload);

await writeFile(outputPath, formatNikkeDataFile(snapshot), "utf8");

console.log(
  `NIKKE data snapshot synced: chapters ${snapshot.chaptersVersion || "-"}, outpost ${snapshot.outpostVersion || "-"}, ${snapshot.snapshotDate}`,
);
