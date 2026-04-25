export const NIKKE_REMOTE_BASE = "https://nikkeoutpost.netlify.app";
export const NIKKE_SNAPSHOT_SOURCE = "nikkeoutpost.netlify.app";

function chapterFromStageLabel(label) {
  const match = String(label || "").match(/^(\d+)-/);
  return match ? Number(match[1]) : null;
}

function normalizeStageOptions(chaptersPayload) {
  const allStages = [];
  (chaptersPayload?.Chapters || []).forEach((chapter) => {
    (chapter.Sections || []).forEach((section) => {
      allStages.push({
        id: String(section.id),
        label: String(section.Section),
      });
    });
  });
  return allStages;
}

export function buildNikkeSnapshot(chaptersPayload, outpostPayload, snapshotDate = new Date().toISOString().slice(0, 10)) {
  const allStages = normalizeStageOptions(chaptersPayload);
  const normalStartIndex = allStages.findIndex((item) => item.label.startsWith("2-12"));
  const outpostCoreDustMul = [null];

  (outpostPayload?.outpost || []).forEach((row) => {
    outpostCoreDustMul[Number(row.level)] = Number.parseFloat(row.core_dust_mul);
  });

  return {
    source: NIKKE_SNAPSHOT_SOURCE,
    chaptersVersion: String(chaptersPayload?.version || ""),
    outpostVersion: String(outpostPayload?.version || ""),
    snapshotDate,
    maxChapter: Math.max(0, ...allStages.map((item) => chapterFromStageLabel(item.label) || 0)),
    normalProgressOptions: normalStartIndex >= 0 ? allStages.slice(normalStartIndex) : allStages,
    hardProgressOptions: allStages,
    outpostCoreDustMul,
  };
}

export function formatNikkeDataFile(snapshot) {
  return `window.NIKKE_DATA_SNAPSHOT = ${JSON.stringify(snapshot)};\n`;
}

export async function fetchRemoteNikkePayloads(fetchImpl = fetch) {
  const [chaptersResponse, outpostResponse] = await Promise.all([
    fetchImpl(`${NIKKE_REMOTE_BASE}/chapters.json`),
    fetchImpl(`${NIKKE_REMOTE_BASE}/outpost.json`),
  ]);

  if (!chaptersResponse.ok) {
    throw new Error(`chapters.json 请求失败: HTTP ${chaptersResponse.status}`);
  }
  if (!outpostResponse.ok) {
    throw new Error(`outpost.json 请求失败: HTTP ${outpostResponse.status}`);
  }

  const [chaptersPayload, outpostPayload] = await Promise.all([
    chaptersResponse.json(),
    outpostResponse.json(),
  ]);

  return { chaptersPayload, outpostPayload };
}
