# NIKKE Data Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep GitHub Pages static while refreshing NIKKE Outpost data through GitHub Actions instead of browser cross-origin requests.

**Architecture:** Add a Node ESM snapshot module that converts remote `chapters.json` and `outpost.json` payloads into the existing `window.NIKKE_DATA_SNAPSHOT` format. A scheduled GitHub Actions workflow runs the sync command and commits `nikke-data.js` only when the generated snapshot changes. The browser app starts from the committed local snapshot and no longer fetches the external site at runtime.

**Tech Stack:** Static HTML, browser JavaScript, Node ESM, Node `node:test`, GitHub Actions

---

## File Map

**Create:**
- `E:/code/NikkeCoreDustCalculator/scripts/nikke-snapshot.mjs` - pure payload normalization plus file generation helpers
- `E:/code/NikkeCoreDustCalculator/scripts/sync-nikke-data.mjs` - CLI entrypoint that fetches remote JSON and writes `nikke-data.js`
- `E:/code/NikkeCoreDustCalculator/tests/nikke-snapshot.test.js` - conversion and output-format tests
- `E:/code/NikkeCoreDustCalculator/.github/workflows/sync-nikke-data.yml` - scheduled/manual sync workflow

**Modify:**
- `E:/code/NikkeCoreDustCalculator/app.js` - remove runtime remote fetch and apply the local snapshot once
- `E:/code/NikkeCoreDustCalculator/package.json` - add a `sync:nikke-data` script
- `E:/code/NikkeCoreDustCalculator/README.md` - document the Action-based data refresh flow

## Tasks

- [ ] Add failing tests for snapshot conversion and generated `nikke-data.js` output.
- [ ] Implement `scripts/nikke-snapshot.mjs` to pass the conversion tests.
- [ ] Add `scripts/sync-nikke-data.mjs` and package script.
- [ ] Update `app.js` so production browser runtime does not fetch `nikkeoutpost.netlify.app`.
- [ ] Add the scheduled GitHub Actions workflow.
- [ ] Update README with the new refresh model.
- [ ] Run the full Node test suite.
