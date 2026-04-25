import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildNikkeSnapshot,
  formatNikkeDataFile,
} from "../scripts/nikke-snapshot.mjs";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

const chaptersPayload = {
  version: "202604",
  Chapters: [
    {
      Sections: [
        { id: 1, Section: "1-1" },
        { id: 19, Section: "2-12 BOSS" },
        { id: 20, Section: "3-1" },
      ],
    },
    {
      Sections: [
        { id: 41, Section: "4-6" },
        { id: 42, Section: "4-7" },
      ],
    },
  ],
};

const outpostPayload = {
  version: "202605",
  outpost: [
    { level: 1, core_dust_mul: "20.23" },
    { level: 2, core_dust_mul: "21.93" },
  ],
};

test("buildNikkeSnapshot converts remote NIKKE Outpost payloads into local app data", () => {
  const snapshot = buildNikkeSnapshot(chaptersPayload, outpostPayload, "2026-04-25");

  assert.deepEqual(snapshot, {
    source: "nikkeoutpost.netlify.app",
    chaptersVersion: "202604",
    outpostVersion: "202605",
    snapshotDate: "2026-04-25",
    maxChapter: 4,
    normalProgressOptions: [
      { id: "19", label: "2-12 BOSS" },
      { id: "20", label: "3-1" },
      { id: "41", label: "4-6" },
      { id: "42", label: "4-7" },
    ],
    hardProgressOptions: [
      { id: "1", label: "1-1" },
      { id: "19", label: "2-12 BOSS" },
      { id: "20", label: "3-1" },
      { id: "41", label: "4-6" },
      { id: "42", label: "4-7" },
    ],
    outpostCoreDustMul: [null, 20.23, 21.93],
  });
});

test("formatNikkeDataFile writes the browser global consumed by app.js", () => {
  const snapshot = buildNikkeSnapshot(chaptersPayload, outpostPayload, "2026-04-25");
  const source = formatNikkeDataFile(snapshot);

  assert.match(source, /^window\.NIKKE_DATA_SNAPSHOT = \{/);
  assert.match(source, /"snapshotDate":"2026-04-25"/);
  assert.match(source, /"normalProgressOptions":\[/);
  assert.match(source, /\};\n$/);
});

test("browser runtime does not fetch NIKKE Outpost directly", () => {
  assert.doesNotMatch(appSource, /nikkeoutpost\.netlify\.app/);
  assert.doesNotMatch(appSource, /fetch\(`?\$\{?NIKKE_REMOTE_BASE/);
});
