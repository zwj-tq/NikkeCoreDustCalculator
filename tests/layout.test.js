import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildCollectionCardFields,
  buildCollectionCardHeader,
  buildCompactStatusItems,
  clampFloatingDialogPosition,
  buildDetailTableCells,
  buildMainlineScatterData,
  buildMobileCollectionCardFields,
  buildSummaryTableCells,
  buildToolbarActionGroups,
  ensureStrategyIds,
  getEffectiveViewportWidth,
  getLayoutDensityTokens,
  getLayoutMode,
  getMainlineTimelinePresentation,
  hasLayoutModeChanged,
  getStrategySelectionKey,
  buildMobileSummaryCards,
  buildMobileDetailCards,
  getDetailViewRenderMode,
  getDetailViewToggleLabel,
  getInitialSectionOpenState,
  getResponsiveSectionOpenState,
  getSummaryRenderMode,
} from "../ui/layout.js";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("getLayoutMode returns mobile at and below 720px", () => {
  assert.equal(getLayoutMode(720), "mobile");
  assert.equal(getLayoutMode(480), "mobile");
  assert.equal(getLayoutMode(721), "tablet");
  assert.equal(getLayoutMode(1079), "tablet");
  assert.equal(getLayoutMode(1080), "desktop");
});

test("getEffectiveViewportWidth prefers the actual visual/client viewport over window.innerWidth", () => {
  assert.equal(
    getEffectiveViewportWidth({
      visualViewportWidth: null,
      clientWidth: 390,
      innerWidth: 664,
    }),
    390,
  );

  assert.equal(
    getEffectiveViewportWidth({
      visualViewportWidth: 390,
      clientWidth: 390,
      innerWidth: 664,
    }),
    390,
  );
});

test("mobile editor rendering does not branch on raw window.innerWidth", () => {
  assert.doesNotMatch(
    appSource,
    /function isMobileLayout\(\)\s*\{\s*return getLayoutMode\(window\.innerWidth\) === "mobile";\s*\}/s,
  );
});

test("resize handler refreshes density tokens even when staying in the same breakpoint", () => {
  assert.match(
    appSource,
    /window\.addEventListener\("resize",[\s\S]*?const nextLayoutMode = getCurrentLayoutMode\(\);[\s\S]*?applyLayoutDensity\(nextLayoutMode\);/s,
  );
});

test("fillSelect safely no-ops when a target select is missing", () => {
  assert.match(
    appSource,
    /function fillSelect\(select, options, value, allowEmpty = false\)\s*\{\s*if \(!select\) return;/s,
  );
});

test("detail render path guards against missing DOM nodes", () => {
  assert.match(
    appSource,
    /function renderDetailTable\(\)\s*\{[\s\S]*?if \(!detailBody \|\| !detailViewToggle \|\| !detailWrap \|\| !detailMobileShell \|\| !detailMobileCardsHost\) return;/s,
  );
});

test("bindEvents does not assume the detail strategy select always exists", () => {
  assert.match(
    appSource,
    /detailStrategySelect\?\.\s*addEventListener\("change"/s,
  );
});

test("getLayoutDensityTokens enlarges touch targets and typography on mobile", () => {
  const desktop = getLayoutDensityTokens("desktop");
  const mobile = getLayoutDensityTokens("mobile", 390);

  assert.deepEqual(mobile, {
    pageShellWidth: "374px",
    pageShellPaddingTop: "18px",
    heroTitleSize: "clamp(34px, 9vw, 40px)",
    sourceBadgeFontSize: "15px",
    sourceBadgePadding: "10px 16px",
    stickyToolbarPadding: "16px",
    stickyToolbarGap: "14px",
    toolbarButtonMinHeight: "54px",
    toolbarButtonFontSize: "16px",
    toolbarStatusNoteSize: "14px",
    sectionPadding: "22px 18px",
    sectionTitleSize: "26px",
    collapseIconSize: "46px",
    fieldLabelSize: "12px",
    fieldControlFontSize: "16px",
    fieldControlPadding: "15px 16px",
    fieldControlMinHeight: "54px",
    mobileCardPadding: "18px",
    mobileCardLabelSize: "13px",
    mobileCardValueSize: "17px",
    mobileCardStrongSize: "19px",
    mobileCardGridColumns: "1fr",
  });

  assert.equal(desktop.toolbarButtonMinHeight, "46px");
  assert.equal(desktop.fieldControlMinHeight, "46px");
  assert.equal(desktop.mobileCardGridColumns, "repeat(2, minmax(0, 1fr))");
});

test("hasLayoutModeChanged only returns true when crossing a breakpoint", () => {
  assert.equal(hasLayoutModeChanged("mobile", 640), false);
  assert.equal(hasLayoutModeChanged("tablet", 900), false);
  assert.equal(hasLayoutModeChanged("desktop", 1440), false);
  assert.equal(hasLayoutModeChanged("mobile", 721), true);
  assert.equal(hasLayoutModeChanged("tablet", 1080), true);
  assert.equal(hasLayoutModeChanged("desktop", 1079), true);
});

test("buildMobileSummaryCards prefers id over name for active selection", () => {
  const cards = buildMobileSummaryCards(
    [
      {
        id: "strategy-baseline",
        name: "保底",
        strategyType: "BASELINE",
        finalDisplayLevel: 301.2,
        finalBoxes: 120,
        totalOpenedBoxes: 80,
      },
      {
        id: "strategy-target-a",
        name: "同名策略",
        strategyType: "TARGET_DAY",
        finalDisplayLevel: 305.8,
        finalBoxes: 40,
        totalOpenedBoxes: 160,
      },
      {
        id: "strategy-target-b",
        name: "同名策略",
        strategyType: "TARGET_LEVEL",
        finalDisplayLevel: 299.2,
        finalBoxes: 60,
        totalOpenedBoxes: 90,
      },
    ],
    "strategy-target-b",
  );

  assert.equal(cards[1].isActive, false);
  assert.deepEqual(cards[1], {
    selectionKey: "strategy-target-a",
    name: "同名策略",
    strategyType: "TARGET_DAY",
    finalLevelText: "305.80",
    finalBoxesText: "40",
    totalOpenedText: "160",
    isActive: false,
  });

  assert.deepEqual(cards[2], {
    selectionKey: "strategy-target-b",
    name: "同名策略",
    strategyType: "TARGET_LEVEL",
    finalLevelText: "299.20",
    finalBoxesText: "60",
    totalOpenedText: "90",
    isActive: true,
  });
});

test("buildMobileSummaryCards falls back to name when id is missing", () => {
  const cards = buildMobileSummaryCards(
    [
      {
        name: "保底",
        strategyType: "BASELINE",
        finalDisplayLevel: 301.2,
        finalBoxes: 120,
        totalOpenedBoxes: 80,
      },
      {
        name: "冲榜",
        strategyType: "TARGET_DAY",
        finalDisplayLevel: 305.8,
        finalBoxes: 40,
        totalOpenedBoxes: 160,
      },
    ],
    "冲榜",
  );

  assert.deepEqual(cards[1], {
    selectionKey: "冲榜",
    name: "冲榜",
    strategyType: "TARGET_DAY",
    finalLevelText: "305.80",
    finalBoxesText: "40",
    totalOpenedText: "160",
    isActive: true,
  });
});

test("getStrategySelectionKey prefers id and falls back to name", () => {
  assert.equal(
    getStrategySelectionKey({
      id: "strategy-target-b",
      name: "同名策略",
    }),
    "strategy-target-b",
  );

  assert.equal(
    getStrategySelectionKey({
      name: "保底",
    }),
    "保底",
  );
});

test("buildMobileDetailCards maps detail rows into readable card fields", () => {
  const cards = buildMobileDetailCards([
    {
      day: 7,
      level: 240,
      progressDust: 700,
      boxes: 88,
      openedBoxesToday: 3,
      dailyDust: 412,
      extraDust: 120,
      strategyNote: "活动补给",
    },
  ]);

  assert.deepEqual(cards[0], {
    dayText: "第 7 天",
    levelText: "240",
    progressText: "700",
    boxesText: "88",
    openedText: "3",
    dailyDustText: "412",
    extraDustText: "120",
    noteText: "活动补给",
  });
});

test("buildMobileDetailCards falls back when day is missing", () => {
  const cards = buildMobileDetailCards([
    {
      level: 240,
      progressDust: 700,
      boxes: 88,
      openedBoxesToday: 3,
      dailyDust: 412,
      extraDust: 120,
      strategyNote: "活动补给",
    },
  ]);

  assert.deepEqual(cards[0], {
    dayText: "",
    levelText: "240",
    progressText: "700",
    boxesText: "88",
    openedText: "3",
    dailyDustText: "412",
    extraDustText: "120",
    noteText: "活动补给",
  });
});

test("getDetailViewToggleLabel switches between table and cards copy", () => {
  assert.equal(getDetailViewToggleLabel("cards"), "查看完整表格");
  assert.equal(getDetailViewToggleLabel("table"), "查看卡片明细");
});

test("summary and detail render modes keep mobile cards isolated from desktop tables", () => {
  assert.equal(getSummaryRenderMode("mobile"), "cards");
  assert.equal(getSummaryRenderMode("tablet"), "table");
  assert.equal(getSummaryRenderMode("desktop"), "table");

  assert.equal(getDetailViewRenderMode("mobile", "cards"), "cards");
  assert.equal(getDetailViewRenderMode("mobile", "table"), "table");
  assert.equal(getDetailViewRenderMode("desktop", "cards"), "table");
  assert.equal(getDetailViewRenderMode("tablet", "table"), "table");
});

test("getInitialSectionOpenState collapses daily detail by default only on mobile", () => {
  assert.equal(getInitialSectionOpenState("section-detail", "mobile", true), false);
  assert.equal(getInitialSectionOpenState("section-detail", "tablet", true), true);
  assert.equal(getInitialSectionOpenState("section-detail", "desktop", true), true);
  assert.equal(getInitialSectionOpenState("section-summary", "mobile", true), true);
  assert.equal(getInitialSectionOpenState("section-detail", "mobile", false), false);
});

test("getResponsiveSectionOpenState reapplies target layout defaults unless that layout was manually changed", () => {
  assert.equal(
    getResponsiveSectionOpenState("section-detail", "mobile", {}, true),
    false,
  );

  assert.equal(
    getResponsiveSectionOpenState("section-detail", "tablet", {}, true),
    true,
  );

  assert.equal(
    getResponsiveSectionOpenState("section-detail", "mobile", { mobile: true }, true),
    true,
  );

  assert.equal(
    getResponsiveSectionOpenState("section-detail", "tablet", { tablet: false }, true),
    false,
  );
});

test("buildCompactStatusItems keeps the most important mobile status items", () => {
  const items = buildCompactStatusItems({
    statusText: "计算完成",
    bestStrategyText: "价值判断开箱",
    currentLevelText: "241.80",
    finalLevelText: "318.60",
    strategyCountText: "6",
  });

  assert.deepEqual(items, [
    { key: "bestStrategy", label: "最佳策略", value: "价值判断开箱" },
    { key: "finalLevel", label: "最终等级", value: "318.60" },
    { key: "strategyCount", label: "策略数", value: "6" },
  ]);
});

test("buildCompactStatusItems falls back to current level when best strategy or final level is missing", () => {
  const items = buildCompactStatusItems({
    statusText: "请先填写当前等级",
    bestStrategyText: "--",
    currentLevelText: "240.00",
    finalLevelText: "--",
    strategyCountText: "0",
  });

  assert.deepEqual(items, [
    { key: "strategyCount", label: "策略数", value: "0" },
    { key: "currentLevel", label: "当前等级", value: "240.00" },
  ]);
});

test("buildToolbarActionGroups keeps primary action separate from secondary exports on mobile", () => {
  const groups = buildToolbarActionGroups([
    { id: "run-btn", label: "重新计算", priority: "primary" },
    { id: "export-csv-btn", label: "导出当前明细 CSV", priority: "secondary" },
    { id: "export-png-btn", label: "导出图表 PNG", priority: "secondary" },
  ], "mobile");

  assert.deepEqual(groups, {
    primary: [{ id: "run-btn", label: "重新计算", priority: "primary" }],
    secondary: [
      { id: "export-csv-btn", label: "导出当前明细 CSV", priority: "secondary" },
      { id: "export-png-btn", label: "导出图表 PNG", priority: "secondary" },
    ],
  });
});

test("buildToolbarActionGroups keeps export actions visible on desktop", () => {
  const groups = buildToolbarActionGroups([
    { id: "run-btn", label: "重新计算", priority: "primary" },
    { id: "export-csv-btn", label: "导出当前明细 CSV", priority: "secondary" },
    { id: "export-png-btn", label: "导出图表 PNG", priority: "secondary" },
  ], "desktop");

  assert.deepEqual(groups, {
    primary: [
      { id: "run-btn", label: "重新计算", priority: "primary" },
      { id: "export-csv-btn", label: "导出当前明细 CSV", priority: "secondary" },
      { id: "export-png-btn", label: "导出图表 PNG", priority: "secondary" },
    ],
    secondary: [],
  });
});

test("buildCollectionCardFields returns strategy fields in mobile order", () => {
  const fields = buildCollectionCardFields("strategies", {
    name: "冲榜",
    type: "TARGET_LEVEL",
    targetDay: 30,
    targetLevel: 320,
    note: "优先冲等级",
    enabled: true,
  });

  assert.deepEqual(fields, [
    { key: "name", label: "名称", value: "冲榜" },
    { key: "type", label: "类型", value: "TARGET_LEVEL" },
    { key: "targetDay", label: "目标天", value: 30 },
    { key: "targetLevel", label: "目标级", value: 320 },
    { key: "note", label: "备注", value: "优先冲等级" },
    { key: "enabled", label: "启用", value: true },
  ]);
});

test("buildCollectionCardFields returns event fields in mobile order", () => {
  const fields = buildCollectionCardFields("events", {
    name: "21天大型活动",
    startDate: "2026-04-25",
    durationDays: 21,
    boxes: 472,
  });

  assert.deepEqual(fields, [
    { key: "name", label: "名称", value: "21天大型活动" },
    { key: "startDate", label: "开始日期", value: "2026-04-25" },
    { key: "durationDays", label: "持续天数", value: 21 },
    { key: "boxes", label: "获得箱子", value: 472 },
  ]);
});

test("buildCollectionCardFields returns extra fields in mobile order", () => {
  const fields = buildCollectionCardFields("extras", {
    name: "每日补充",
    startDate: "2026-04-25",
    startDay: 0,
    endDay: 30,
    frequency: "每日",
    amount: 12,
    note: "活动商店",
  });

  assert.deepEqual(fields, [
    { key: "name", label: "名称", value: "每日补充" },
    { key: "frequency", label: "类型", value: "每日" },
    { key: "amount", label: "芯尘箱", value: 12 },
    { key: "range", label: "起始范围", value: "2026-04-25 · 第 0-30 天" },
    { key: "note", label: "备注", value: "活动商店" },
  ]);
});

test("buildCollectionCardHeader lifts strategy status into mobile header", () => {
  const header = buildCollectionCardHeader("strategies", {
    name: "冲榜",
    type: "TARGET_LEVEL",
    enabled: false,
  });

  assert.deepEqual(header, {
    title: "冲榜",
    subtitle: "TARGET_LEVEL",
    statusText: "未启用",
  });
});

test("buildCollectionCardHeader uses frequency for extra subtitle", () => {
  const header = buildCollectionCardHeader("extras", {
    name: "每日补充",
    frequency: "每日",
  });

  assert.deepEqual(header, {
    title: "每日补充",
    subtitle: "每日",
    statusText: "",
  });
});

test("buildSummaryTableCells returns plain text values for rendering", () => {
  const cells = buildSummaryTableCells({
    name: "<img src=x onerror=alert(1)>",
    strategyType: "TARGET_LEVEL",
    finalDisplayLevel: 305.8,
    finalBoxes: 40,
    totalOpenedBoxes: 160,
  });

  assert.deepEqual(cells, [
    "<img src=x onerror=alert(1)>",
    "TARGET_LEVEL",
    "305.80",
    "40",
    "160",
  ]);
});

test("buildDetailTableCells returns plain text values for rendering", () => {
  const cells = buildDetailTableCells({
    day: 7,
    level: 240,
    progressDust: 700,
    nextCost: 8000,
    hourlyRate: 52.5,
    boxes: 88,
    openedBoxesToday: 3,
    dailyDust: 412,
    extraDust: 120,
    strategyNote: "<b>活动补给</b>",
  });

  assert.deepEqual(cells, [
    "7",
    "240",
    "700",
    "8000",
    "52.50",
    "88",
    "3",
    "412",
    "120",
    "<b>活动补给</b>",
  ]);
});

test("ensureStrategyIds preserves ids and fills unique ids for duplicate names", () => {
  const strategies = ensureStrategyIds([
    { id: "strategy-existing", name: "同名策略", type: "BASELINE" },
    { name: "同名策略", type: "TARGET_DAY" },
    { name: "同名策略", type: "TARGET_LEVEL" },
  ]);

  assert.equal(strategies[0].id, "strategy-existing");
  assert.equal(typeof strategies[1].id, "string");
  assert.equal(typeof strategies[2].id, "string");
  assert.notEqual(strategies[1].id, "");
  assert.notEqual(strategies[2].id, "");
  assert.notEqual(strategies[1].id, strategies[2].id);
  assert.notEqual(strategies[1].id, "strategy-existing");
  assert.notEqual(strategies[2].id, "strategy-existing");
});

test("buildMobileCollectionCardFields keeps strategy enabled state in the header instead of the body", () => {
  const fields = buildMobileCollectionCardFields("strategies", {
    name: "保底",
    type: "BASELINE",
    targetDay: null,
    targetLevel: null,
    note: "",
    enabled: true,
  });

  assert.deepEqual(
    fields.map((field) => field.key),
    ["name", "type", "targetDay", "targetLevel", "note"],
  );
});

test("getMainlineTimelinePresentation compacts chart spacing and labels on mobile", () => {
  assert.deepEqual(getMainlineTimelinePresentation("mobile"), {
    titleTop: 6,
    titleFontSize: 16,
    subtextFontSize: 11,
    grid: { left: 18, right: 18, top: 52, bottom: 28 },
    labelDistance: 12,
    labelFontSize: 10,
    labelLineHeight: 15,
    shortenDate: true,
    hideOverlap: true,
  });

  assert.deepEqual(getMainlineTimelinePresentation("desktop"), {
    titleTop: 8,
    titleFontSize: 18,
    subtextFontSize: 12,
    grid: { left: 24, right: 24, top: 56, bottom: 36 },
    labelDistance: 18,
    labelFontSize: 12,
    labelLineHeight: 18,
    shortenDate: false,
    hideOverlap: false,
  });
});

test("buildMainlineScatterData shortens and thins labels on mobile", () => {
  const entries = [
    { index: 0, label: "主线48章", date: "2026-06-14", timestamp: 1 },
    { index: 1, label: "主线50章", date: "2026-08-03", timestamp: 2 },
    { index: 2, label: "主线52章", date: "2026-09-22", timestamp: 3 },
    { index: 3, label: "主线54章", date: "2026-11-11", timestamp: 4 },
    { index: 4, label: "主线56章", date: "2026-12-31", timestamp: 5 },
  ];

  const mobile = buildMainlineScatterData(entries, 2, "mobile");
  const desktop = buildMainlineScatterData(entries, 2, "desktop");

  assert.equal(mobile[0].label.show, true);
  assert.equal(mobile[0].label.formatter, "主线48章\n06-14");
  assert.equal(mobile[0].label.fontSize, 10);
  assert.equal(mobile[1].label.show, false);
  assert.equal(mobile[2].label.show, true);
  assert.equal(mobile[2].label.formatter, "主线52章\n09-22");

  assert.equal(desktop[1].label.show, true);
  assert.equal(desktop[1].label.formatter, "主线50章\n2026-08-03");
  assert.equal(desktop[1].label.fontSize, 12);
});

test("clampFloatingDialogPosition keeps anchored dialogs inside the actual viewport", () => {
  assert.deepEqual(
    clampFloatingDialogPosition({
      anchorX: 500,
      anchorY: 700,
      scrollX: 0,
      scrollY: 0,
      viewportWidth: 390,
      viewportHeight: 844,
      dialogWidth: 366,
      dialogHeight: 320,
      inset: 12,
    }),
    {
      x: 12,
      y: 512,
    },
  );
});

test("collapse header copy can shrink and wrap inside narrow mobile cards", () => {
  assert.match(
    stylesSource,
    /\.collapse-copy\s*\{[^}]*flex:\s*1\s+1\s+auto;[^}]*min-width:\s*0;[^}]*\}/s,
  );
});

test("mobile layout mode forces the params form into a single responsive column", () => {
  assert.match(
    stylesSource,
    /body\[data-layout-mode="mobile"\]\s+\.form-grid[\s\S]*?grid-template-columns:\s*1fr;/,
  );
});

test("section cards and params layout can shrink inside grid containers", () => {
  assert.match(
    stylesSource,
    /\.section-card\s*\{[^}]*min-width:\s*0;[^}]*width:\s*100%;[^}]*\}/s,
  );
  assert.match(
    stylesSource,
    /\.collapse-body\s*\{[^}]*min-width:\s*0;[^}]*\}/s,
  );
  assert.match(
    stylesSource,
    /\.form-grid\s*\{[^}]*min-width:\s*0;[^}]*width:\s*100%;[^}]*\}/s,
  );
});

test("checkbox fields do not inherit generic text-input chrome", () => {
  assert.match(
    stylesSource,
    /\.field input:not\(\[type="checkbox"\]\),\s*[\r\n\s]*\.field select\s*\{/s,
  );
});

test("mobile strategy status pills can act as toggles", () => {
  assert.match(
    stylesSource,
    /\.mobile-editor-card-status\.is-actionable\s*\{[^}]*cursor:\s*pointer;[^}]*\}/s,
  );
});

test("mobile mainline chart keeps a taller viewport for compact labels", () => {
  assert.match(
    stylesSource,
    /body\[data-layout-mode="mobile"\]\s+\.mainline-chart\s*\{[^}]*height:\s*360px;[^}]*\}/s,
  );
});

test("mobile editor cards remove the decorative side rail", () => {
  assert.match(
    stylesSource,
    /body\[data-layout-mode="mobile"\]\s+\.mobile-editor-card::before\s*\{[^}]*display:\s*none;[^}]*\}/s,
  );
});

test("mobile mainline modal uses a fixed in-viewport sheet layout", () => {
  assert.match(
    stylesSource,
    /\.mainline-modal-dialog\.is-mobile\s*\{[^}]*position:\s*fixed;[^}]*left:\s*12px;[^}]*right:\s*12px;[^}]*max-height:\s*calc\(100vh - 24px\);[^}]*\}/s,
  );
});
