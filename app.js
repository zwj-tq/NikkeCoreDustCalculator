import {
  buildCollectionCardHeader,
  buildCompactStatusItems,
  clampFloatingDialogPosition,
  buildDetailTableCells,
  buildMainlineScatterData,
  getEffectiveViewportWidth,
  buildMobileDetailCards,
  buildMobileCollectionCardFields,
  buildMobileSummaryCards,
  buildSummaryTableCells,
  buildToolbarActionGroups,
  getDetailViewRenderMode,
  getDetailViewToggleLabel,
  getInitialSectionOpenState,
  getLayoutDensityTokens,
  getResponsiveSectionOpenState,
  getMainlineTimelinePresentation,
  hasLayoutModeChanged,
  ensureStrategyIds,
  getLayoutMode,
  getSummaryRenderMode,
  getStrategySelectionKey,
} from "./ui/layout.js";

const CHART_COLORS = [
  "#D35D3D",
  "#2F6FED",
  "#2E8B57",
  "#B7791F",
  "#D53F8C",
  "#1F4E5F",
  "#6B46C1",
  "#DD6B20",
];

const EXTRA_FREQUENCIES = ["每日", "每周", "每月", "一次性"];
const STRATEGY_TYPES = [
  "BASELINE",
  "OPEN_ALL_NOW",
  "NO_BOX",
  "CUSTOM_GATE",
  "SMART_GATE",
  "OPEN_EVERY_MILESTONE",
  "SMART_VALUE_GATE",
];

const EVENT_EDITOR_SCHEMA = [
  { key: "name", label: "名称", type: "text", columnClass: "col-name" },
  { key: "startDate", label: "开始日期", type: "date", columnClass: "col-date" },
  { key: "durationDays", label: "持续天数", type: "number", cast: "number", columnClass: "col-day" },
  { key: "boxes", label: "获得箱子", type: "number", cast: "number", step: "1", columnClass: "col-amount" },
];

const EXTRA_EDITOR_SCHEMA = [
  { key: "name", label: "名称", type: "text", columnClass: "col-name" },
  { key: "startDate", label: "开始日期", type: "date", columnClass: "col-date" },
  { key: "frequency", label: "类型", type: "select", options: EXTRA_FREQUENCIES, columnClass: "col-frequency" },
  { key: "amount", label: "芯尘箱", type: "number", cast: "number", step: "0.1", columnClass: "col-amount" },
  { key: "note", label: "备注", type: "text", columnClass: "col-note" },
];

const DESKTOP_STRATEGY_EDITOR_SCHEMA = [
  { key: "name", label: "名称", type: "text", hideLabel: true },
  { key: "type", label: "类型", type: "select", options: STRATEGY_TYPES, hideLabel: true },
  { key: "targetDay", label: "目标天", type: "text", cast: "optionalInt", hideLabel: true },
  { key: "targetLevel", label: "目标级", type: "text", cast: "optionalInt", hideLabel: true },
  { key: "note", label: "备注", type: "text", hideLabel: true },
];

const MOBILE_STRATEGY_EDITOR_SCHEMA = [
  { key: "name", label: "名称", type: "text", columnClass: "col-name" },
  { key: "type", label: "类型", type: "select", options: STRATEGY_TYPES, columnClass: "col-frequency" },
  { key: "targetDay", label: "目标天", type: "text", cast: "optionalInt", columnClass: "col-day" },
  { key: "targetLevel", label: "目标级", type: "text", cast: "optionalInt", columnClass: "col-amount" },
  { key: "note", label: "备注", type: "text", columnClass: "col-note" },
  { key: "enabled", label: "启用", type: "checkbox", columnClass: "col-toggle" },
];

const ACTIVITY_MODES = {
  DAILY: "daily",
  WEEKLY: "weekly",
  ONCE: "once",
};

const ACTIVITY_EDITOR_MODES = {
  CUSTOM: "自定义",
  PRESET: "预设",
};

const FIXED_BASE_DAILY_HOURS = 24;
const FIXED_FREE_SWEEPS = 1;
const FIXED_HOURS_PER_SWEEP = 2;
const FIXED_FIRST_BIG_LEVEL = 381;
const FIXED_BIG_INTERVAL = 20;
const DEFAULT_START_DATE = new Date().toISOString().slice(0, 10);
const NIKKE_REMOTE_BASE = "https://nikkeoutpost.netlify.app";
const FALLBACK_NIKKE_DATA = window.NIKKE_DATA_SNAPSHOT || null;
const echarts = window.echarts;
const PARAMS_STORAGE_KEY = "nikke_calc_params";
const PERSISTED_PARAM_KEYS = [
  "startLevel",
  "startBoxes",
  "latestMainlineChapter",
  "currentNormalStageId",
  "currentHardStageId",
  "simulateDays",
  "paidSweeps",
  "startDate",
  "endDate",
];

const TOOLBAR_ACTIONS = [
  { id: "run-btn", label: "重新计算", className: "primary-btn", priority: "primary" },
  { id: "export-csv-btn", label: "导出当前明细 CSV", className: "ghost-btn", priority: "secondary" },
  { id: "export-png-btn", label: "导出图表 PNG", className: "ghost-btn", priority: "secondary" },
];

const CORE_DUST_BREAKPOINTS = [
  { nextLevel: 11, cost: 20 },
  { nextLevel: 21, cost: 40 },
  { nextLevel: 41, cost: 80 },
  { nextLevel: 61, cost: 400 },
  { nextLevel: 81, cost: 1000 },
  { nextLevel: 101, cost: 2000 },
  { nextLevel: 121, cost: 4500 },
  { nextLevel: 141, cost: 7000 },
  { nextLevel: 161, cost: 7000 },
  { nextLevel: 181, cost: 8000 },
];

const CORE_DUST_RANGES = [
  { from: 201, to: 250, cost: 10000 },
  { from: 251, to: 300, cost: 10000 },
  { from: 301, to: 350, cost: 10000 },
  { from: 351, to: 400, cost: 11000 },
  { from: 401, to: 450, cost: 12000 },
  { from: 451, to: 500, cost: 13000 },
  { from: 501, to: 550, cost: 14000 },
  { from: 551, to: 600, cost: 15000 },
  { from: 601, to: 650, cost: 16000 },
  { from: 651, to: 700, cost: 17000 },
  { from: 701, to: 750, cost: 18000 },
  { from: 751, to: 800, cost: 19000 },
  { from: 801, to: 9999, cost: 20000 },
];

function parseDateInput(text) {
  if (!text) return null;
  const [year, month, day] = String(text).split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function offsetDateString(baseText, days) {
  const baseDate = parseDateInput(baseText) ?? new Date();
  const next = new Date(baseDate);
  next.setDate(next.getDate() + days);
  return formatDateInput(next);
}

function syncDateRange(changedKey) {
  const start = parseDateInput(state.params.startDate);
  const end = parseDateInput(state.params.endDate);
  const days = toFiniteNumber(state.params.simulateDays, 0);

  if (changedKey === "startDate") {
    if (!start) return;
    state.params.endDate = offsetDateString(state.params.startDate, days);
    return;
  }

  if (changedKey === "endDate") {
    if (!start || !end) return;
    state.params.simulateDays = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
    return;
  }

  if (changedKey === "simulateDays") {
    if (!start) return;
    state.params.endDate = offsetDateString(state.params.startDate, days);
  }
}

function mainlineChapterForIndex(index) {
  return Number(state.params.latestMainlineChapter || 34) + 2 + index * 2;
}

function formatMainlineLabel(chapter) {
  return `主线${chapter}章`;
}

function defaultMainlineLabel(index) {
  return formatMainlineLabel(mainlineChapterForIndex(index));
}

function syncMainlineChaptersByDate() {
  const sorted = state.mainlines
    .map((item, index) => ({
      index,
      timestamp: parseDateInput(item.date)?.getTime() ?? Date.now() + index * 86400000,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  sorted.forEach((item, order) => {
    state.mainlines[item.index].chapter = mainlineChapterForIndex(order);
  });
}

const state = {
  params: {
    startLevel: "",
    startProgress: 0,
    startHourlyRate: "",
    startBoxes: "",
    latestMainlineChapter: "",
    currentNormalStageId: "",
    currentHardStageId: "",
    currentBaseLevel: "",
    currentMainlineChapter: "",
    simulateDays: 300,
    paidSweeps: 2,
    bigRateBonus: 1.5,
    startDate: DEFAULT_START_DATE,
    endDate: offsetDateString(DEFAULT_START_DATE, 300),
  },
  mainlines: [
    { chapter: 36, date: offsetDateString(DEFAULT_START_DATE, 50), rateBonus: 2.5, gateLevel: null },
    { chapter: 38, date: offsetDateString(DEFAULT_START_DATE, 100), rateBonus: 2.5, gateLevel: null },
    { chapter: 40, date: offsetDateString(DEFAULT_START_DATE, 150), rateBonus: 2.5, gateLevel: null },
    { chapter: 42, date: offsetDateString(DEFAULT_START_DATE, 200), rateBonus: 2.5, gateLevel: null },
    { chapter: 44, date: offsetDateString(DEFAULT_START_DATE, 250), rateBonus: 2.5, gateLevel: null },
  ],
  events: [],
  activityConfig: {
    mode: ACTIVITY_EDITOR_MODES.PRESET,
  },
  extras: [
    { name: "每日补充", startDate: DEFAULT_START_DATE, startDay: 0, endDay: 300, frequency: "每日", amount: 0, enabled: true, note: "" },
    { name: "每周补充", startDate: DEFAULT_START_DATE, startDay: 0, endDay: 300, frequency: "每周", amount: 0, enabled: true, note: "" },
    { name: "每月补充", startDate: DEFAULT_START_DATE, startDay: 0, endDay: 300, frequency: "每月", amount: 0, enabled: true, note: "" },
  ],
  strategies: ensureStrategyIds([
    { name: "完全囤箱", type: "BASELINE", targetDay: null, targetLevel: null, enabled: true, note: "全程不开箱，只靠自然获取推进，适合作为最保守基线。" },
    { name: "立刻全开", type: "OPEN_ALL_NOW", targetDay: 0, targetLevel: null, enabled: true, note: "开局第一天把现有箱子全部打开，用来观察短期爆发收益。" },
    { name: "最后一天全开", type: "NO_BOX", targetDay: null, targetLevel: null, enabled: true, note: "全程囤箱到模拟最后一天再统一开箱，适合观察极限囤箱收益。" },
    { name: "门槛即开", type: "SMART_GATE", targetDay: null, targetLevel: null, enabled: true, note: "每次遇到主线门槛时，只开到当前门槛需要的量，不额外超开。" },
    { name: "大关卡分段开", type: "OPEN_EVERY_MILESTONE", targetDay: null, targetLevel: null, enabled: true, note: "遇到大关卡节点再分段释放箱子，兼顾推进与资源留存。" },
    { name: "价值判断开箱", type: "SMART_VALUE_GATE", targetDay: null, targetLevel: null, enabled: true, note: "在门槛节点按额外收益与开箱成本做启发式判断，划算时才开箱。" },
  ]),
  results: {},
  summaries: [],
  detailStrategy: "",
  mobileDetailView: "cards",
  mainlineEditorIndex: 0,
  mainlineModalOpen: false,
  mainlinePopupPosition: { x: 0, y: 0 },
  nikkeData: {
    sourceLabel: FALLBACK_NIKKE_DATA ? "本地快照" : "未加载",
    chaptersVersion: FALLBACK_NIKKE_DATA?.chaptersVersion ?? "",
    outpostVersion: FALLBACK_NIKKE_DATA?.outpostVersion ?? "",
    maxChapter: FALLBACK_NIKKE_DATA?.maxChapter ?? 0,
    normalProgressOptions: FALLBACK_NIKKE_DATA?.normalProgressOptions ?? [],
    hardProgressOptions: FALLBACK_NIKKE_DATA?.hardProgressOptions ?? [],
    outpostCoreDustMul: FALLBACK_NIKKE_DATA?.outpostCoreDustMul ?? [null],
  },
};

const mainlineTimelineChart = echarts.init(document.getElementById("mainline-timeline-chart"));
const lineChart = echarts.init(document.getElementById("line-chart"));
const barChart = echarts.init(document.getElementById("bar-chart"));
const toolbarActionsHost = document.getElementById("toolbar-actions");
const toolbarStatusHost = document.getElementById("toolbar-status");
const detailStrategySelect = document.getElementById("detail-strategy-select");
const detailViewToggle = document.getElementById("detail-view-toggle");
const summaryTableWrap = document.querySelector("#section-summary .table-wrap");
const summaryBody = document.getElementById("summary-body");
const summaryMobileCardsHost = document.getElementById("summary-mobile-cards");
const detailBody = document.getElementById("detail-body");
const detailWrap = document.querySelector(".detail-wrap");
const detailMobileShell = document.getElementById("detail-mobile-shell");
const detailMobileCardsHost = document.getElementById("detail-mobile-cards");
const pageNavList = document.getElementById("page-nav-list");
const mainlineEditorHost = document.getElementById("mainline-editor");
const mainlineModalRoot = document.createElement("div");
mainlineModalRoot.className = "mainline-modal";
document.body.appendChild(mainlineModalRoot);

const toolbarStatusState = {
  statusText: "等待计算",
  bestStrategyText: "--",
  currentLevelText: "--",
  finalLevelText: "--",
  strategyCountText: "--",
};

const sectionOpenOverrides = {};

let currentLayoutMode = getCurrentLayoutMode();

function getCurrentViewportWidth() {
  return getEffectiveViewportWidth({
    visualViewportWidth: window.visualViewport?.width,
    clientWidth: document.documentElement.clientWidth,
    innerWidth: window.innerWidth,
  });
}

function getCurrentLayoutMode() {
  return getLayoutMode(getCurrentViewportWidth());
}

function getCurrentViewportHeight() {
  return getEffectiveViewportWidth({
    visualViewportWidth: window.visualViewport?.height,
    clientWidth: document.documentElement.clientHeight,
    innerWidth: window.innerHeight,
  });
}

function applyLayoutDensity(layoutMode) {
  const tokens = getLayoutDensityTokens(layoutMode, getCurrentViewportWidth());
  Object.entries(tokens).forEach(([token, value]) => {
    document.documentElement.style.setProperty(`--${token}`, value);
  });
  document.body.dataset.layoutMode = layoutMode;
}

function dailyHours() {
  return FIXED_BASE_DAILY_HOURS + (FIXED_FREE_SWEEPS + state.params.paidSweeps) * FIXED_HOURS_PER_SWEEP;
}

function toFiniteNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function persistParamsToStorage() {
  const payload = {};
  PERSISTED_PARAM_KEYS.forEach((key) => {
    payload[key] = state.params[key] ?? "";
  });
  try {
    window.localStorage.setItem(PARAMS_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("写入本地存储失败，已忽略。", error);
  }
}

function loadParamsFromStorage() {
  try {
    const raw = window.localStorage.getItem(PARAMS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    PERSISTED_PARAM_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(parsed, key)) state.params[key] = parsed[key];
    });
  } catch (error) {
    console.warn("读取本地存储失败，已忽略。", error);
  }
}

function parseOptionalInt(value) {
  const text = String(value ?? "").trim();
  const lowered = text.toLowerCase();
  if (!text || lowered.includes("none") || ["null", "nil", "na", "n/a"].includes(lowered)) return null;
  const num = Number(text);
  return Number.isFinite(num) ? Math.trunc(num) : null;
}

function normalizeNikkeData(chaptersPayload, outpostPayload) {
  const allStages = [];
  (chaptersPayload?.Chapters || []).forEach((chapter) => {
    (chapter.Sections || []).forEach((section) => {
      allStages.push({
        id: String(section.id),
        label: String(section.Section),
      });
    });
  });

  const normalStartIndex = allStages.findIndex((item) => item.label.startsWith("2-12"));
  const normalProgressOptions = normalStartIndex >= 0 ? allStages.slice(normalStartIndex) : allStages;
  const hardProgressOptions = allStages;
  const outpostCoreDustMul = [null];
  (outpostPayload?.outpost || []).forEach((row) => {
    outpostCoreDustMul[Number(row.level)] = Number.parseFloat(row.core_dust_mul);
  });

  return {
    sourceLabel: "远程实时",
    chaptersVersion: String(chaptersPayload?.version || ""),
    outpostVersion: String(outpostPayload?.version || ""),
    maxChapter: Math.max(0, ...allStages.map((item) => chapterFromStageLabel(item.label) || 0)),
    normalProgressOptions,
    hardProgressOptions,
    outpostCoreDustMul,
  };
}

function applyNikkeData(data, sourceLabel = data?.sourceLabel || "本地快照") {
  if (!data) return;
  state.nikkeData = {
    sourceLabel,
    chaptersVersion: data.chaptersVersion || "",
    outpostVersion: data.outpostVersion || "",
    maxChapter: data.maxChapter || 0,
    normalProgressOptions: data.normalProgressOptions || [],
    hardProgressOptions: data.hardProgressOptions || [],
    outpostCoreDustMul: data.outpostCoreDustMul || [null],
  };
  syncDerivedProgressData();
  persistParamsToStorage();
}

function findLastStageIdForChapter(chapter, options) {
  const prefix = `${chapter}-`;
  const matches = (options || []).filter((item) => item.label.startsWith(prefix));
  return matches.at(-1)?.id || "";
}

function findStageLabelById(options, id) {
  return (options || []).find((item) => String(item.id) === String(id))?.label || "";
}

function normalizeStageQuery(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/主线/g, "")
    .replace(/困难/g, "")
    .replace(/hard/g, "")
    .replace(/boss/g, "");
}

function chapterFromStageLabel(label) {
  const match = String(label || "").match(/^(\d+)-/);
  return match ? Number(match[1]) : null;
}

function getLatestMainlineChapterOptions() {
  const maxChapter = Number(state.nikkeData.maxChapter || 0);
  if (!maxChapter) return [];
  const results = [];
  for (let chapter = 2; chapter <= maxChapter; chapter += 1) {
    results.push({
      id: String(chapter),
      label: `主线${chapter}章`,
    });
  }
  return results;
}

function getStageOptionsWithinLatest(options) {
  const latestChapter = Number(state.params.latestMainlineChapter || 0);
  if (!latestChapter) return options || [];
  return (options || []).filter((item) => {
    const chapter = chapterFromStageLabel(item.label);
    return chapter != null && chapter <= latestChapter;
  });
}

function computeOutpostLevel(normalStageId, hardStageId) {
  const normalOptions = state.nikkeData.normalProgressOptions || [];
  const hardOptions = state.nikkeData.hardProgressOptions || [];
  const normalStartId = Number(normalOptions[0]?.id || 0);
  const hardStartId = Number(hardOptions[0]?.id || 0);
  const normalValue = Number(normalStageId || 0);
  const hardValue = Number(hardStageId || 0);
  const normalContribution = Math.max(0, normalValue - normalStartId);
  const hardContribution = hardValue ? Math.max(0, hardValue - hardStartId + 1) : 0;
  const rawLevel = Math.floor((normalContribution + hardContribution) / 5) + 1;
  const maxLevel = Math.max(1, (state.nikkeData.outpostCoreDustMul || []).length - 1);
  return Math.min(rawLevel, maxLevel);
}

function syncDerivedProgressData() {
  const normalOptions = getStageOptionsWithinLatest(state.nikkeData.normalProgressOptions || []);
  const hardOptions = getStageOptionsWithinLatest(state.nikkeData.hardProgressOptions || []);
  if (!normalOptions.length) return;

  const maxChapter = Number(state.nikkeData.maxChapter || 0);
  if (!state.params.latestMainlineChapter && maxChapter) {
    state.params.latestMainlineChapter = String(maxChapter);
  }
  if (maxChapter && Number(state.params.latestMainlineChapter || 0) > maxChapter) {
    state.params.latestMainlineChapter = String(maxChapter);
  }

  if (state.params.currentHardStageId && !findStageLabelById(hardOptions, state.params.currentHardStageId)) {
    state.params.currentHardStageId = "";
  }

  if (!state.params.currentNormalStageId || !findStageLabelById(normalOptions, state.params.currentNormalStageId)) {
    state.params.currentNormalStageId = "";
    state.params.currentBaseLevel = "";
    state.params.startHourlyRate = "";
    state.params.currentMainlineChapter = "";
    return;
  }

  const currentChapter = chapterFromStageLabel(findStageLabelById(normalOptions, state.params.currentNormalStageId));
  if (currentChapter != null) state.params.currentMainlineChapter = currentChapter;

  const baseLevel = computeOutpostLevel(state.params.currentNormalStageId, state.params.currentHardStageId);
  state.params.currentBaseLevel = baseLevel;
  state.params.startHourlyRate = state.nikkeData.outpostCoreDustMul[baseLevel] || "";
}

async function loadNikkeData() {
  applyNikkeData(state.nikkeData, state.nikkeData.sourceLabel);

  try {
    const [chaptersResponse, outpostResponse] = await Promise.all([
      fetch(`${NIKKE_REMOTE_BASE}/chapters.json`),
      fetch(`${NIKKE_REMOTE_BASE}/outpost.json`),
    ]);
    if (!chaptersResponse.ok || !outpostResponse.ok) throw new Error("远程数据请求失败");
    const [chaptersPayload, outpostPayload] = await Promise.all([
      chaptersResponse.json(),
      outpostResponse.json(),
    ]);
    applyNikkeData(normalizeNikkeData(chaptersPayload, outpostPayload), "远程实时");
  } catch (error) {
    console.warn("NIKKE 数据动态加载失败，已回退到本地快照。", error);
  }
}

function normalizeFrequency(value) {
  const text = String(value ?? "").trim();
  const lowered = text.toLowerCase();
  if (text === "每日" || lowered === "daily") return "每日";
  if (text === "每周" || lowered === "weekly") return "每周";
  if (text === "每月" || lowered === "monthly") return "每月";
  if (text === "一次性" || lowered === "once" || lowered === "one-time") return "一次性";
  return text;
}

function dayToDate(day) {
  const base = parseDateInput(state.params.startDate) ?? new Date();
  base.setDate(base.getDate() + day);
  return base;
}

function dateToDay(dateText) {
  const start = parseDateInput(state.params.startDate);
  const target = parseDateInput(dateText);
  if (!start || !target) return null;
  return Math.floor((target.getTime() - start.getTime()) / 86400000);
}

function addMonthsClamped(date, months) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const targetMonth = month + months;
  const first = new Date(year, targetMonth, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(day, lastDay));
}

function isExtraTriggered(extra, day) {
  const frequency = normalizeFrequency(extra.frequency);
  const startDay = extra.startDate ? (dateToDay(extra.startDate) ?? extra.startDay) : extra.startDay;
  if (day < startDay) return false;
  if (frequency !== "一次性" && day > extra.endDay) return false;
  if (frequency === "每日") return true;
  if (frequency === "每周") return (day - startDay) % 7 === 0;
  if (frequency === "每月") {
    const current = dayToDate(day);
    const anchor = dayToDate(startDay);
    let cursor = new Date(anchor);
    while (cursor <= current) {
      if (
        cursor.getFullYear() === current.getFullYear() &&
        cursor.getMonth() === current.getMonth() &&
        cursor.getDate() === current.getDate()
      ) return true;
      const passedMonths = (cursor.getFullYear() - anchor.getFullYear()) * 12 + cursor.getMonth() - anchor.getMonth() + 1;
      cursor = addMonthsClamped(anchor, passedMonths);
    }
    return false;
  }
  if (frequency === "一次性") return day === startDay;
  return false;
}

function isActivityTriggered(activity, day) {
  const startDay = dateToDay(activity.startDate);
  if (startDay == null || day < startDay) return false;
  const durationDays = Math.max(1, Number(activity.durationDays || 1));
  const endDayExclusive = startDay + durationDays;
  if (day >= endDayExclusive) return false;
  if (activity.mode === ACTIVITY_MODES.DAILY) return true;
  if (activity.mode === ACTIVITY_MODES.WEEKLY) return (day - startDay) % 7 === 0;
  return day === startDay;
}

function buildPresetActivities() {
  const results = [];
  const totalDays = Math.max(0, Number(state.params.simulateDays || 0));
  const startDate = state.params.startDate;
  const largeStep = 42;
  const smallStep = 28;

  for (let day = 0; day <= totalDays; day += largeStep) {
    results.push({
      name: "21天大型活动",
      mode: ACTIVITY_MODES.ONCE,
      startDate: offsetDateString(startDate, day),
      durationDays: 21,
      boxes: 472,
      locked: false,
    });

  }

  for (let day = 0; day <= totalDays; day += smallStep) {
    results.push({
      name: "14天小活动",
      mode: ACTIVITY_MODES.ONCE,
      startDate: offsetDateString(startDate, day),
      durationDays: 14,
      boxes: 324,
      locked: false,
    });
  }

  return results;
}

function effectiveEvents() {
  return state.activityConfig.mode === ACTIVITY_EDITOR_MODES.PRESET ? buildPresetActivities() : state.events;
}

function getCoreDustCostForNextLevel(currentLevel) {
  const normalizedLevel = toFiniteNumber(currentLevel, 0);
  const nextLevel = normalizedLevel + 1;
  const breakpoint = CORE_DUST_BREAKPOINTS.find((item) => item.nextLevel === nextLevel);
  if (breakpoint) return breakpoint.cost;
  const range = CORE_DUST_RANGES.find((item) => nextLevel >= item.from && nextLevel <= item.to);
  return range ? range.cost : 0;
}

function milestoneCount(level) {
  const normalizedLevel = toFiniteNumber(level, 0);
  if (normalizedLevel < FIXED_FIRST_BIG_LEVEL) return 0;
  return Math.floor((normalizedLevel - FIXED_FIRST_BIG_LEVEL) / FIXED_BIG_INTERVAL) + 1;
}

function computeBaseHourlyRate(level, mainlineBonus) {
  return toFiniteNumber(state.params.startHourlyRate, 0) + mainlineBonus + milestoneCount(level) * state.params.bigRateBonus;
}

function normalizeLevelProgress(level, progress) {
  let currentLevel = toFiniteNumber(level, 0);
  let currentProgress = toFiniteNumber(progress, 0);
  while (true) {
    const cost = getCoreDustCostForNextLevel(currentLevel);
    if (cost === 0) {
      currentLevel += 1;
      continue;
    }
    if (currentProgress >= cost) {
      currentProgress -= cost;
      currentLevel += 1;
      continue;
    }
    break;
  }
  return { level: currentLevel, progress: currentProgress };
}

function dustNeededForTargetLevel(targetLevel, currentLevel, currentProgress) {
  if (targetLevel <= currentLevel) return 0;
  let tempLevel = currentLevel;
  let tempProgress = currentProgress;
  let needed = 0;
  while (tempLevel < targetLevel) {
    const cost = getCoreDustCostForNextLevel(tempLevel);
    if (cost === 0) {
      tempLevel += 1;
      tempProgress = 0;
      continue;
    }
    needed += Math.max(0, cost - tempProgress);
    tempLevel += 1;
    tempProgress = 0;
  }
  return needed;
}

function boxesNeededForTargetLevel(targetLevel, currentLevel, currentProgress, boxRate) {
  const neededDust = dustNeededForTargetLevel(targetLevel, currentLevel, currentProgress);
  if (neededDust <= 0 || boxRate <= 0) return 0;
  return Math.ceil(neededDust / boxRate);
}

function nextMilestoneLevel(level) {
  if (level < FIXED_FIRST_BIG_LEVEL) return FIXED_FIRST_BIG_LEVEL;
  return FIXED_FIRST_BIG_LEVEL + (Math.floor((level - FIXED_FIRST_BIG_LEVEL) / FIXED_BIG_INTERVAL) + 1) * FIXED_BIG_INTERVAL;
}

function pendingGateInfo(pendingUpdates) {
  const candidates = pendingUpdates
    .filter((update) => update.gateLevel != null)
    .sort((a, b) => Number(a.gateLevel) - Number(b.gateLevel));
  if (!candidates.length) return { gateLevel: null, totalRateBonus: 0 };
  const gateLevel = Number(candidates[0].gateLevel);
  return {
    gateLevel,
    totalRateBonus: pendingUpdates
      .filter((item) => item.gateLevel == null || Number(item.gateLevel) <= gateLevel)
      .reduce((sum, item) => sum + Number(item.rateBonus || 0), 0),
  };
}

function activateAvailableMainlines(pendingUpdates, level) {
  let gainedBonus = 0;
  const remaining = [];
  pendingUpdates.forEach((update) => {
    if (update.gateLevel == null || level >= Number(update.gateLevel)) {
      gainedBonus += Number(update.rateBonus || 0);
      return;
    }
    remaining.push(update);
  });
  return { gainedBonus, remaining };
}

function shouldOpenGateByValue(currentDay, currentHourlyRate, boxesNeeded, pendingInfo) {
  if (pendingInfo.gateLevel == null) return { shouldOpen: false, note: "当前没有有效门槛" };
  if (boxesNeeded <= 0) return { shouldOpen: true, note: "无需开箱即可达到门槛" };
  const remainingDays = Math.max(0, state.params.simulateDays - currentDay + 1);
  const gain = remainingDays * dailyHours() * Math.max(0, pendingInfo.totalRateBonus);
  const cost = boxesNeeded * Math.max(0, currentHourlyRate);
  return {
    shouldOpen: gain > cost,
    note: `gain=${gain.toFixed(0)}, cost=${cost.toFixed(0)}, boxes=${boxesNeeded.toFixed(0)}, bonus=${pendingInfo.totalRateBonus.toFixed(2)}, horizon=${remainingDays}d`,
  };
}

function openBoxes(progressDust, boxes, count, boxRate) {
  const actual = Math.min(Math.max(0, count), boxes);
  const gainedDust = actual * Math.max(0, boxRate);
  return { progressDust: progressDust + gainedDust, boxes: boxes - actual, gainedDust, actual };
}

function simulate(strategy) {
  const states = [];
  let level = state.params.startLevel;
  let progressDust = state.params.startProgress;
  let boxes = state.params.startBoxes;
  let mainlineBonus = 0;

  const mainlineByDay = new Map();
  state.mainlines.forEach((update) => {
    const day = dateToDay(update.date);
    if (day == null) return;
    if (!mainlineByDay.has(day)) mainlineByDay.set(day, []);
    mainlineByDay.get(day).push({ ...update, day });
  });

  const activeExtras = state.extras;
  let pendingMainlines = [];
  let releasedUpdatesCount = 0;

  ({ level, progress: progressDust } = normalizeLevelProgress(level, progressDust));

  for (let day = 0; day <= state.params.simulateDays; day += 1) {
    let strategyNote = "";
    let openedBoxesToday = 0;
    let dustFromBoxesToday = 0;

    const activityBoxes = effectiveEvents().reduce((sum, event) => {
      return sum + (isActivityTriggered(event, day) ? Number(event.boxes || 0) : 0);
    }, 0);
    boxes += activityBoxes;

    const releasedToday = mainlineByDay.get(day) || [];
    pendingMainlines = pendingMainlines.concat(releasedToday);
    releasedUpdatesCount += releasedToday.length;

    const preDayActivation = activateAvailableMainlines(pendingMainlines, level);
    if (preDayActivation.gainedBonus > 0) mainlineBonus += preDayActivation.gainedBonus;
    pendingMainlines = preDayActivation.remaining;

    let pendingInfo = pendingGateInfo(pendingMainlines);
    let activeGateLevel = pendingInfo.gateLevel;
    let hourlyRate = computeBaseHourlyRate(level, mainlineBonus);
    const currentBoxRate = hourlyRate;
    const isGateDay = (mainlineByDay.get(day) || []).some((update) => update.gateLevel != null);

    if (strategy.type === "OPEN_ALL_NOW" && day === 0 && boxes > 0) {
      const result = openBoxes(progressDust, boxes, boxes, currentBoxRate);
      progressDust = result.progressDust;
      boxes = result.boxes;
      openedBoxesToday += result.actual;
      dustFromBoxesToday += result.gainedDust;
      strategyNote = "首日全开";
    } else if (strategy.type === "CUSTOM_GATE" && strategy.targetDay === day && strategy.targetLevel) {
      const needBoxes = boxesNeededForTargetLevel(strategy.targetLevel, level, progressDust, currentBoxRate);
      if (needBoxes > 0 && needBoxes <= boxes) {
        const result = openBoxes(progressDust, boxes, needBoxes, currentBoxRate);
        progressDust = result.progressDust;
        boxes = result.boxes;
        openedBoxesToday += result.actual;
        dustFromBoxesToday += result.gainedDust;
        strategyNote = `精准补到 ${strategy.targetLevel}`;
      }
    } else if (strategy.type === "SMART_GATE" && isGateDay && activeGateLevel) {
      const needBoxes = boxesNeededForTargetLevel(activeGateLevel, level, progressDust, currentBoxRate);
      if (needBoxes > 0 && needBoxes <= boxes) {
        const result = openBoxes(progressDust, boxes, needBoxes, currentBoxRate);
        progressDust = result.progressDust;
        boxes = result.boxes;
        openedBoxesToday += result.actual;
        dustFromBoxesToday += result.gainedDust;
        strategyNote = `主线日补到门槛 ${activeGateLevel}`;
      }
    } else if (strategy.type === "SMART_VALUE_GATE" && isGateDay && activeGateLevel) {
      const needBoxes = boxesNeededForTargetLevel(activeGateLevel, level, progressDust, currentBoxRate);
      if (needBoxes > 0 && needBoxes <= boxes) {
        const judge = shouldOpenGateByValue(day, hourlyRate, needBoxes, pendingInfo);
        strategyNote = judge.note;
        if (judge.shouldOpen) {
          const result = openBoxes(progressDust, boxes, needBoxes, currentBoxRate);
          progressDust = result.progressDust;
          boxes = result.boxes;
          openedBoxesToday += result.actual;
          dustFromBoxesToday += result.gainedDust;
          strategyNote = `价值判断通过，补到门槛 ${activeGateLevel}; ${judge.note}`;
        }
      }
    } else if (strategy.type === "OPEN_EVERY_MILESTONE") {
      const milestoneLevel = nextMilestoneLevel(level);
      const needBoxes = boxesNeededForTargetLevel(milestoneLevel, level, progressDust, currentBoxRate);
      if (needBoxes > 0 && needBoxes <= boxes) {
        const result = openBoxes(progressDust, boxes, needBoxes, currentBoxRate);
        progressDust = result.progressDust;
        boxes = result.boxes;
        openedBoxesToday += result.actual;
        dustFromBoxesToday += result.gainedDust;
        strategyNote = `补到大档 ${milestoneLevel}`;
      }
    } else if (strategy.type === "NO_BOX" && day === state.params.simulateDays && boxes > 0) {
      const result = openBoxes(progressDust, boxes, boxes, currentBoxRate);
      progressDust = result.progressDust;
      boxes = result.boxes;
      openedBoxesToday += result.actual;
      dustFromBoxesToday += result.gainedDust;
      strategyNote = "最后一天全开";
    }

    ({ level, progress: progressDust } = normalizeLevelProgress(level, progressDust));
    const postBoxActivation = activateAvailableMainlines(pendingMainlines, level);
    if (postBoxActivation.gainedBonus > 0) {
      mainlineBonus += postBoxActivation.gainedBonus;
      strategyNote = `${strategyNote} | 解锁章节加成 +${postBoxActivation.gainedBonus.toFixed(2)}`.replace(/^ \| /, "").trim();
    }
    pendingMainlines = postBoxActivation.remaining;
    pendingInfo = pendingGateInfo(pendingMainlines);
    activeGateLevel = pendingInfo.gateLevel;

    hourlyRate = computeBaseHourlyRate(level, mainlineBonus);

    const dailyDust = hourlyRate * dailyHours();
    const extraDust = activeExtras.reduce((sum, extra) => sum + (isExtraTriggered(extra, day) ? Number(extra.amount || 0) : 0), 0);
    progressDust += dailyDust + extraDust;
    ({ level, progress: progressDust } = normalizeLevelProgress(level, progressDust));

    const nextCost = getCoreDustCostForNextLevel(level);
    states.push({
      day,
      level,
      progressDust,
      nextCost,
      displayLevel: nextCost > 0 ? level + progressDust / nextCost : level,
      hourlyRate,
      boxes,
      openedBoxesToday,
      dustFromBoxesToday,
      dailyDust,
      extraDust,
      activityBoxes,
      mainlineBonus,
      activeGateLevel,
      updatesSeen: releasedUpdatesCount,
      strategyNote,
    });
  }

  return states;
}

function buildSummaries() {
  return Object.entries(state.results)
    .map(([selectionKey, rows]) => {
      const strategy = state.strategies.find((item) => getStrategySelectionKey(item) === selectionKey);
      const last = rows[rows.length - 1];
      return {
        selectionKey,
        name: strategy?.name ?? selectionKey,
        strategyType: strategy?.type ?? "",
        finalDisplayLevel: last.displayLevel,
        finalBoxes: last.boxes,
        activeGateLevel: last.activeGateLevel,
        totalOpenedBoxes: rows.reduce((sum, row) => sum + row.openedBoxesToday, 0),
      };
    })
    .sort((a, b) => b.finalDisplayLevel - a.finalDisplayLevel);
}

function getCurrentDisplayLevel() {
  const normalized = normalizeLevelProgress(state.params.startLevel, state.params.startProgress);
  const nextCost = getCoreDustCostForNextLevel(normalized.level);
  return nextCost > 0 ? normalized.level + normalized.progress / nextCost : normalized.level;
}

function createToolbarButton(action) {
  const button = document.createElement("button");
  button.id = action.id;
  button.type = "button";
  button.className = action.className;
  button.textContent = action.label;
  return button;
}

function createStatusPill(item, className = "status-pill compact") {
  const pill = document.createElement("div");
  pill.className = className;
  pill.dataset.statusKey = item.key;

  const label = document.createElement("span");
  label.className = "status-label";
  label.textContent = item.label;
  pill.appendChild(label);

  const value = document.createElement("strong");
  value.textContent = item.value;
  pill.appendChild(value);

  return pill;
}

function renderToolbar() {
  if (!toolbarActionsHost) return;

  toolbarActionsHost.innerHTML = "";
  const layoutMode = getCurrentLayoutMode();
  const groups = buildToolbarActionGroups(TOOLBAR_ACTIONS, layoutMode);

  const primaryWrap = document.createElement("div");
  primaryWrap.className = "toolbar-primary-actions";
  groups.primary.forEach((action) => {
    primaryWrap.appendChild(createToolbarButton(action));
  });
  toolbarActionsHost.appendChild(primaryWrap);

  if (!groups.secondary.length) {
    return;
  }

  const secondaryMenu = document.createElement("details");
  secondaryMenu.className = "toolbar-secondary-menu";

  const summary = document.createElement("summary");
  summary.className = "toolbar-secondary-toggle";
  summary.textContent = "导出与更多";
  secondaryMenu.appendChild(summary);

  const secondaryActions = document.createElement("div");
  secondaryActions.className = "toolbar-secondary-actions";
  groups.secondary.forEach((action) => {
    secondaryActions.appendChild(createToolbarButton(action));
  });
  secondaryMenu.appendChild(secondaryActions);

  toolbarActionsHost.appendChild(secondaryMenu);
}

function renderCompactStatus() {
  if (!toolbarStatusHost) return;

  toolbarStatusHost.innerHTML = "";
  const layoutMode = getCurrentLayoutMode();

  if (layoutMode === "mobile") {
    const statusLine = document.createElement("div");
    statusLine.className = "toolbar-status-note";
    statusLine.textContent = toolbarStatusState.statusText;
    toolbarStatusHost.appendChild(statusLine);

    buildCompactStatusItems(toolbarStatusState).forEach((item) => {
      toolbarStatusHost.appendChild(createStatusPill(item));
    });
    return;
  }

  [
    { key: "status", label: "状态", value: toolbarStatusState.statusText },
    { key: "bestStrategy", label: "当前最佳策略", value: toolbarStatusState.bestStrategyText },
    { key: "currentLevel", label: "当前最高等级", value: toolbarStatusState.currentLevelText },
    { key: "finalLevel", label: "最终等级", value: toolbarStatusState.finalLevelText },
    { key: "strategyCount", label: "策略数", value: toolbarStatusState.strategyCountText },
  ].forEach((item) => {
    toolbarStatusHost.appendChild(createStatusPill(item));
  });
}

function renderStatusOverview(summary = null) {
  toolbarStatusState.bestStrategyText = summary?.name ?? "--";
  toolbarStatusState.currentLevelText = summary ? getCurrentDisplayLevel().toFixed(2) : "--";
  toolbarStatusState.finalLevelText = summary ? summary.finalDisplayLevel.toFixed(2) : "--";
  toolbarStatusState.strategyCountText = summary ? String(state.summaries.length) : "--";
  renderCompactStatus();
}

function refreshParamDerivedOutputs(host = document.getElementById("params-form")) {
  if (!host) return;
  const nextCost = state.params.startLevel === "" ? "" : String(getCoreDustCostForNextLevel(state.params.startLevel));
  const editableValues = {
    startDate: state.params.startDate ?? "",
    endDate: state.params.endDate ?? "",
    simulateDays: state.params.simulateDays ?? "",
    paidSweeps: state.params.paidSweeps ?? "",
    startLevel: state.params.startLevel ?? "",
    startBoxes: state.params.startBoxes ?? "",
  };
  const outputs = {
    currentBaseLevel: state.params.currentBaseLevel === "" ? "" : String(state.params.currentBaseLevel),
    startHourlyRate: state.params.startHourlyRate === "" ? "" : toFiniteNumber(state.params.startHourlyRate, 0).toFixed(2),
    currentMainlineChapter: state.params.currentMainlineChapter === "" ? "" : String(state.params.currentMainlineChapter),
    nikkeDataSource: `${state.nikkeData.sourceLabel} / Chapters ${state.nikkeData.chaptersVersion || "-"} / Outpost ${state.nikkeData.outpostVersion || "-"}`,
    dailyHours: dailyHours().toFixed(1),
    nextCost,
  };
  Object.entries(editableValues).forEach(([key, value]) => {
    const input = host.querySelector(`[data-param-input="${key}"]`);
    if (input && input !== document.activeElement) input.value = value;
  });
  Object.entries(outputs).forEach(([key, value]) => {
    const input = host.querySelector(`[data-param-output="${key}"]`);
    if (input) input.value = value;
  });
}

function renderParams() {
  const host = document.getElementById("params-form");
  host.innerHTML = "";
  const addGroupHeader = (title, desc = "") => {
    const wrap = document.createElement("div");
    wrap.className = "params-group-heading";
    wrap.innerHTML = desc
      ? `<div class="params-group-title">${title}</div><div class="params-group-desc">${desc}</div>`
      : `<div class="params-group-title">${title}</div>`;
    host.appendChild(wrap);
  };

  const addRowBreak = () => {
    const wrap = document.createElement("div");
    wrap.className = "params-row-break full-span";
    host.appendChild(wrap);
  };

  const addEditableInput = (label, key, kind, options = {}) => {
    const field = document.createElement("label");
    field.className = `field ${options.fullSpan ? "full-span" : ""} ${options.className || ""}`.trim();
    field.innerHTML = `<span>${label}</span>`;
    const input = document.createElement("input");
    input.type = kind === "date" ? "date" : "number";
    input.setAttribute("data-param-input", key);
    if (kind === "float") input.step = "0.5";
    if (kind === "int") input.step = "1";
    input.value = state.params[key] ?? "";
    input.addEventListener("input", (event) => {
      const raw = event.target.value;
      if (raw === "") state.params[key] = "";
      else state.params[key] = kind === "date" ? String(raw) : kind === "int" ? Math.trunc(Number(raw)) : Number(raw);
      if (key === "startDate" || key === "endDate" || key === "simulateDays") syncDateRange(key);
      persistParamsToStorage();
      refreshParamDerivedOutputs(host);
      if (key === "startDate" || key === "endDate" || key === "simulateDays") renderMainlineTimeline();
    });
    field.appendChild(input);
    host.appendChild(field);
  };

  const addStageInput = (label, key, options, allowEmpty = false, config = {}) => {
    const field = document.createElement("label");
    field.className = `field ${config.fullSpan ? "full-span" : ""} ${config.className || ""}`.trim();
    field.innerHTML = `<span>${label}</span>`;
    const select = document.createElement("select");
    if (allowEmpty) {
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "未选择";
      select.appendChild(empty);
    }
    options.forEach((option) => {
      const el = document.createElement("option");
      el.value = option.id;
      el.textContent = option.label;
      if (String(option.id) === String(state.params[key] || "")) el.selected = true;
      select.appendChild(el);
    });
    select.addEventListener("change", (event) => {
      state.params[key] = event.target.value;
      syncDerivedProgressData();
      persistParamsToStorage();
      if (key === "latestMainlineChapter") {
        renderParams();
      }
      refreshParamDerivedOutputs(host);
      renderMainlineTimeline();
    });
    field.appendChild(select);
    host.appendChild(field);
  };

  const addReadonlyInput = (label, outputKey, value, options = {}) => {
    const field = document.createElement("label");
    field.className = `field ${options.fullSpan ? "full-span" : ""} ${options.className || ""}`.trim();
    field.innerHTML = `<span>${label}</span>`;
    const input = document.createElement("input");
    input.disabled = true;
    input.value = value;
    input.setAttribute("data-param-output", outputKey);
    field.appendChild(input);
    host.appendChild(field);
  };

  addGroupHeader("当前情况", "先填写当前角色状态与主线推进进度。");

  addEditableInput("当前等级", "startLevel", "int");
  addEditableInput("拥有芯尘箱（小时）", "startBoxes", "float");
  addReadonlyInput("升级芯尘", "nextCost", state.params.startLevel === "" ? "" : String(getCoreDustCostForNextLevel(state.params.startLevel)));
  const latestMainlineOptions = getLatestMainlineChapterOptions();
  if (latestMainlineOptions.length) {
    addStageInput("当前最新主线", "latestMainlineChapter", latestMainlineOptions, false);
  }
  addRowBreak();

  if (state.nikkeData.normalProgressOptions.length) {
    addStageInput("当前普通主线进度", "currentNormalStageId", getStageOptionsWithinLatest(state.nikkeData.normalProgressOptions), true);
    addStageInput("当前困难主线进度", "currentHardStageId", getStageOptionsWithinLatest(state.nikkeData.hardProgressOptions), true);
    addReadonlyInput("当前基地等级", "currentBaseLevel", state.params.currentBaseLevel === "" ? "" : String(state.params.currentBaseLevel));
    addReadonlyInput("当前小时芯尘", "startHourlyRate", state.params.startHourlyRate === "" ? "" : toFiniteNumber(state.params.startHourlyRate, 0).toFixed(2));
  } else {
    addEditableInput("当前小时芯尘", "startHourlyRate", "float");
  }

  addGroupHeader("模拟设置", "这些设置决定模拟跨度与每日获取节奏。");
  addEditableInput("开始日期", "startDate", "date");
  addEditableInput("结束日期", "endDate", "date");
  addEditableInput("模拟天数", "simulateDays", "int");
  addRowBreak();
  addEditableInput("购买扫荡次数", "paidSweeps", "int");
  addReadonlyInput("自动计算的每日小时数", "dailyHours", dailyHours().toFixed(1));
}

function renderDustReference() {
  const rangeBody = document.getElementById("dust-range-body");
  rangeBody.innerHTML = "";
  CORE_DUST_RANGES.forEach((row) => {
    const label = row.to >= 9999 ? `${row.from}+` : `${row.from}-${row.to}`;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${label}</td><td>${row.cost}</td>`;
    rangeBody.appendChild(tr);
  });
}

function createField(label, value, onChange, options = {}) {
  const wrap = document.createElement("label");
  wrap.className = `field ${options.long ? "long" : ""} ${options.fullSpan ? "full-span" : ""} ${options.columnClass || ""}`.trim();
  wrap.innerHTML = `<span class="field-label ${options.hideLabel ? "is-hidden" : ""}">${label}</span>`;

  if (options.type === "checkbox") {
    const row = document.createElement("div");
    row.className = "toggle-wrap";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(value);
    const text = document.createElement("span");
    text.textContent = input.checked ? "已启用" : "未启用";
    input.addEventListener("change", (event) => {
      text.textContent = event.target.checked ? "已启用" : "未启用";
      onChange(event.target.checked);
    });
    row.appendChild(input);
    row.appendChild(text);
    wrap.appendChild(row);
    return wrap;
  }

  const input = options.type === "select" ? document.createElement("select") : document.createElement("input");
  input.className = `field-control ${options.columnClass || ""}`.trim();
  if (options.type === "select") {
    options.options.forEach((option) => {
      const el = document.createElement("option");
      el.value = option;
      el.textContent = option;
      if (String(option) === String(value ?? "")) el.selected = true;
      input.appendChild(el);
    });
  } else {
    input.type = options.type || "text";
    input.value = value ?? "";
    if (options.step) input.step = options.step;
  }

  input.addEventListener(options.type === "select" ? "change" : "input", (event) => {
    const raw = event.target.value;
    if (options.cast === "number") onChange(Number(raw || 0));
    else if (options.cast === "optionalInt") onChange(parseOptionalInt(raw));
    else onChange(raw);
  });
  wrap.appendChild(input);
  return wrap;
}

function createCompactField(value, onChange, options = {}) {
  const input = options.type === "select" ? document.createElement("select") : document.createElement("input");
  input.className = `timeline-inline-input ${options.compactClass || ""} ${options.columnClass || ""}`.trim();

  if (options.type === "select") {
    options.options.forEach((option) => {
      const el = document.createElement("option");
      el.value = option;
      el.textContent = option;
      if (String(option) === String(value ?? "")) el.selected = true;
      input.appendChild(el);
    });
  } else {
    input.type = options.type || "text";
    input.value = value ?? "";
    if (options.placeholder) input.placeholder = options.placeholder;
    if (options.step) input.step = options.step;
  }

  if (options.title) input.title = options.title;
  if (options.ariaLabel) input.setAttribute("aria-label", options.ariaLabel);

  input.addEventListener(options.type === "select" ? "change" : "input", (event) => {
    const raw = event.target.value;
    if (options.cast === "number") onChange(Number(raw || 0));
    else if (options.cast === "optionalInt") onChange(parseOptionalInt(raw));
    else onChange(raw);
  });

  return input;
}

function renderListHeader(host, className, labels, includeAction = true) {
  const header = document.createElement("div");
  header.className = `${className} list-header`;
  labels.forEach((label) => {
    const cell = document.createElement("div");
    const config = typeof label === "string" ? { label } : label;
    cell.className = `list-header-cell ${config.columnClass || ""}`.trim();
    cell.textContent = config.label;
    header.appendChild(cell);
  });
  if (includeAction) {
    const actionCell = document.createElement("div");
    actionCell.className = "list-header-cell list-header-cell-action";
    actionCell.textContent = "操作";
    header.appendChild(actionCell);
  }
  host.appendChild(header);
}

function renderGenericRows(listId, rows, schema, onDelete, options = {}) {
  const host = document.getElementById(listId);
  host.innerHTML = "";
  host.classList.remove("mobile-editor-list");
  if (options.showHeader !== false) {
    renderListHeader(host, `editor-grid ${options.gridClass || ""}`.trim(), schema.map((field) => ({ label: field.label, columnClass: field.columnClass })));
  }
  rows.forEach((row, index) => {
    const card = document.createElement("div");
    card.className = "editor-row";
    const grid = document.createElement("div");
    grid.className = `editor-grid ${options.gridClass || ""}`.trim();
    schema.forEach((field) => {
      grid.appendChild(createField(field.label, row[field.key], (value) => { row[field.key] = value; }, field));
    });
    if (!row.locked) {
      const del = document.createElement("button");
      del.className = "icon-btn";
      del.type = "button";
      del.textContent = "x";
      del.addEventListener("click", () => onDelete(index));
      grid.appendChild(del);
    }
    card.appendChild(grid);
    host.appendChild(card);
  });
}

function isMobileLayout() {
  return getCurrentLayoutMode() === "mobile";
}

function getCollectionCardSchema(kind) {
  if (kind === "events") return EVENT_EDITOR_SCHEMA;
  if (kind === "extras") return EXTRA_EDITOR_SCHEMA;
  if (kind === "strategies") return MOBILE_STRATEGY_EDITOR_SCHEMA;
  return [];
}

function createExtraRangeFields(row, onHeaderUpdate) {
  const wrap = document.createElement("div");
  wrap.className = "mobile-range-fields";

  wrap.appendChild(createField("开始日期", row.startDate, (value) => {
    row.startDate = value;
    onHeaderUpdate();
  }, {
    type: "date",
    columnClass: "col-date",
  }));

  wrap.appendChild(createField("开始天", row.startDay, (value) => {
    row.startDay = Number(value || 0);
    onHeaderUpdate();
  }, {
    type: "number",
    cast: "number",
    columnClass: "col-day",
  }));

  wrap.appendChild(createField("结束天", row.endDay, (value) => {
    row.endDay = Number(value || 0);
    onHeaderUpdate();
  }, {
    type: "number",
    cast: "number",
    columnClass: "col-day",
  }));

  return wrap;
}

function renderCollectionCards(listId, kind, rows, onDelete) {
  const host = document.getElementById(listId);
  const schema = getCollectionCardSchema(kind);
  host.innerHTML = "";
  host.classList.add("mobile-editor-list");

  rows.forEach((row, index) => {
    const card = document.createElement("div");
    card.className = `editor-row mobile-editor-card mobile-editor-card-${kind}`;

    const header = document.createElement("div");
    header.className = "mobile-editor-card-header";

    const titleGroup = document.createElement("div");
    titleGroup.className = "mobile-editor-card-copy";

    const title = document.createElement("div");
    title.className = "mobile-editor-card-title";
    titleGroup.appendChild(title);

    const metaRow = document.createElement("div");
    metaRow.className = "mobile-editor-card-meta";

    const subtitle = document.createElement("div");
    subtitle.className = "mobile-editor-card-subtitle";
    metaRow.appendChild(subtitle);

    const status = document.createElement(kind === "strategies" ? "button" : "div");
    status.className = "mobile-editor-card-status";
    if (kind === "strategies") status.type = "button";
    status.hidden = true;
    metaRow.appendChild(status);

    titleGroup.appendChild(metaRow);
    header.appendChild(titleGroup);

    if (!row.locked) {
      const del = document.createElement("button");
      del.className = "icon-btn";
      del.type = "button";
      del.textContent = "x";
      del.addEventListener("click", () => onDelete(index));
      header.appendChild(del);
    }

    card.appendChild(header);

    const body = document.createElement("div");
    body.className = "mobile-editor-card-fields";

    const syncHeader = () => {
      const headerContent = buildCollectionCardHeader(kind, row);
      title.textContent = headerContent.title || `${kind}-${index + 1}`;
      subtitle.textContent = headerContent.subtitle || "";
      subtitle.hidden = !headerContent.subtitle;
      status.textContent = headerContent.statusText || "";
      status.hidden = !headerContent.statusText;
      status.classList.toggle("is-actionable", kind === "strategies");
      if (kind === "strategies") {
        status.dataset.enabled = row.enabled ? "true" : "false";
        status.setAttribute("aria-pressed", row.enabled ? "true" : "false");
        status.title = row.enabled ? "点击停用策略" : "点击启用策略";
      } else {
        delete status.dataset.enabled;
        status.removeAttribute("aria-pressed");
        status.removeAttribute("title");
      }
    };

    syncHeader();

    if (kind === "strategies") {
      status.addEventListener("click", () => {
        row.enabled = !row.enabled;
        syncHeader();
      });
    }

    buildMobileCollectionCardFields(kind, row).forEach((descriptor) => {
      if (kind === "extras" && descriptor.key === "range") {
        body.appendChild(createExtraRangeFields(row, syncHeader));
        return;
      }

      const field = schema.find((item) => item.key === descriptor.key);
      if (!field) return;
      body.appendChild(createField(
        descriptor.label,
        row[field.key],
        (value) => {
          row[field.key] = value;
          syncHeader();
        },
        {
          ...field,
          hideLabel: false,
        },
      ));
    });

    card.appendChild(body);
    host.appendChild(card);
  });
}

function ensureMainlineEditorIndex() {
  if (!state.mainlines.length) {
    state.mainlineEditorIndex = -1;
    return;
  }
  if (!Number.isInteger(state.mainlineEditorIndex) || state.mainlineEditorIndex < 0 || state.mainlineEditorIndex >= state.mainlines.length) {
    state.mainlineEditorIndex = 0;
  }
}

function sortedMainlineEntries() {
  syncMainlineChaptersByDate();
  return state.mainlines
    .map((item, index) => {
      const parsedDate = parseDateInput(item.date);
      return {
        ...item,
        index,
      label: formatMainlineLabel(item.chapter ?? mainlineChapterForIndex(index)),
        timestamp: parsedDate ? parsedDate.getTime() : Date.now() + index * 86400000,
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

function renderMainlineEditor() {
  if (!mainlineEditorHost) return;
  mainlineEditorHost.innerHTML = "";
}

function closeMainlineModal() {
  state.mainlineModalOpen = false;
  mainlineModalRoot.classList.remove("is-open");
  mainlineModalRoot.innerHTML = "";
}

function setMainlinePopupPosition(x, y) {
  const viewportWidth = getCurrentViewportWidth();
  const viewportHeight = getCurrentViewportHeight();
  const dialogWidth = Math.max(Math.min(420, viewportWidth - 24), 0);
  const dialogHeight = currentLayoutMode === "mobile" ? Math.max(viewportHeight - 24, 0) : 320;

  state.mainlinePopupPosition = clampFloatingDialogPosition({
    anchorX: x,
    anchorY: y,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    viewportWidth,
    viewportHeight,
    dialogWidth,
    dialogHeight,
    inset: 12,
  });
}

function renderMainlineModal() {
  ensureMainlineEditorIndex();
  if (!state.mainlineModalOpen || state.mainlineEditorIndex < 0 || !state.mainlines.length) {
    closeMainlineModal();
    return;
  }

  const current = state.mainlines[state.mainlineEditorIndex];
  const { x, y } = state.mainlinePopupPosition;
  const currentLabel = formatMainlineLabel(current.chapter ?? mainlineChapterForIndex(state.mainlineEditorIndex));
  const isMobileMainlineModal = currentLayoutMode === "mobile";
  const dialogClassName = `mainline-modal-dialog${isMobileMainlineModal ? " is-mobile" : ""}`;
  const dialogPositionStyle = isMobileMainlineModal ? "" : ` style="left:${x}px;top:${y}px;"`;

  mainlineModalRoot.classList.add("is-open");
  mainlineModalRoot.innerHTML = `
    <div class="${dialogClassName}" role="dialog" aria-modal="false" aria-label="编辑主线节点"${dialogPositionStyle}>
      <div class="mainline-modal-head">
        <div>
          <div class="mainline-modal-title">编辑主线节点</div>
          <div class="mainline-modal-subtitle">${currentLabel}</div>
        </div>
        <button class="icon-btn mainline-modal-close" type="button" data-close="modal">x</button>
      </div>
      <div class="mainline-modal-grid">
        <div class="mainline-readonly-chip col-wide">${currentLabel}</div>
        <label class="field col-date">
          <span class="field-label">更新时间</span>
          <input id="mainline-modal-date" class="field-control" type="date" value="${current.date}">
        </label>
        <label class="field col-number col-inline-half">
          <span class="field-label">芯尘获取增加</span>
          <input id="mainline-modal-rate" class="field-control" type="number" step="0.1" value="${current.rateBonus}">
        </label>
        <label class="field col-number col-inline-half">
      </div>
      <div class="mainline-modal-actions">
        <button class="ghost-btn danger-btn" type="button" id="mainline-modal-delete">删除节点</button>
        <button class="primary-btn" type="button" id="mainline-modal-done">完成</button>
      </div>
    </div>
  `;

  const bindValue = (id, setter, options = {}) => {
    const el = document.getElementById(id);
    if (!el) return;
    const { eventName = "input", rerender = true, afterChange } = options;
    el.addEventListener(eventName, () => {
      setter(el.value);
      if (afterChange) afterChange(el.value);
      if (rerender) renderMainlineTimeline();
    });
  };

  bindValue("mainline-modal-date", (value) => {
    current.date = value || current.date;
  }, { eventName: "change", rerender: true });
  bindValue("mainline-modal-rate", (value) => {
    current.rateBonus = Number(value || 0);
  }, { eventName: "change", rerender: true });
  mainlineModalRoot.querySelectorAll('[data-close="modal"]').forEach((node) => {
    node.addEventListener("click", closeMainlineModal);
  });
  document.getElementById("mainline-modal-done")?.addEventListener("click", () => {
    renderMainlineTimeline();
    closeMainlineModal();
  });
  document.getElementById("mainline-modal-delete")?.addEventListener("click", () => {
    state.mainlines.splice(state.mainlineEditorIndex, 1);
    if (state.mainlineEditorIndex >= state.mainlines.length) state.mainlineEditorIndex = state.mainlines.length - 1;
    renderMainlineTimeline();
    closeMainlineModal();
  });
}

function renderMainlineTimeline() {
  ensureMainlineEditorIndex();
  const entries = sortedMainlineEntries();
  const timelinePresentation = getMainlineTimelinePresentation(currentLayoutMode);

  if (!entries.length) {
    mainlineTimelineChart.setOption({
      title: {
        text: "暂无主线节点",
        subtext: "双击时间轴空白处新增主线节点",
        left: "center",
        top: "middle",
        textStyle: { fontSize: 18, fontWeight: 600, color: "#6b778c" },
        subtextStyle: { fontSize: 13, color: "#7a879b", padding: [10, 0, 0, 0] },
      },
      xAxis: { show: false },
      yAxis: { show: false },
      series: [],
      graphic: [],
    }, true);
    renderMainlineEditor();
    renderMainlineModal();
    return;
  }

  const firstTs = entries[0].timestamp;
  const lastTs = entries[entries.length - 1].timestamp;
  const padding = Math.max(86400000 * 10, Math.floor((lastTs - firstTs || 86400000) * 0.08));

  const lineData = entries.map((item) => [item.timestamp, 0]);
  const scatterData = buildMainlineScatterData(entries, state.mainlineEditorIndex, currentLayoutMode);

  mainlineTimelineChart.setOption({
    animation: true,
    title: {
      text: `主线更新时间线（起始日 ${state.params.startDate}）`,
      subtext: "双击空白处新增节点，单击节点编辑，拖动节点修改日期",
      left: "center",
      top: timelinePresentation.titleTop,
      textStyle: { fontSize: timelinePresentation.titleFontSize, fontWeight: 700, color: "#1f2937" },
      subtextStyle: { fontSize: timelinePresentation.subtextFontSize, color: "#7a879b", padding: [8, 0, 0, 0] },
    },
    grid: timelinePresentation.grid,
    tooltip: {
      trigger: "item",
      formatter: (params) => {
        const item = entries.find((entry) => entry.index === params.data.originalIndex);
        if (!item) return "";
        return `${item.label}<br>${item.date}<br>芯尘获取增加：${item.rateBonus}`;
      },
    },
    xAxis: {
      type: "time",
      min: firstTs - padding,
      max: lastTs + padding,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      min: -1,
      max: 1,
      show: false,
    },
    series: [
      {
        type: "line",
        data: lineData,
        smooth: false,
        symbol: "none",
        lineStyle: { color: "#2F6FED", width: 3 },
        z: 1,
      },
      {
        type: "scatter",
        data: scatterData,
        labelLayout: timelinePresentation.hideOverlap ? { hideOverlap: true } : {},
        z: 2,
      },
    ],
  }, true);

  const nodeGraphics = entries.map((item) => {
    const pixel = mainlineTimelineChart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [item.timestamp, 0]);
    return {
      id: `mainline-node-${item.index}`,
      type: "circle",
      position: pixel,
      shape: { r: item.index === state.mainlineEditorIndex ? 10 : 8 },
      draggable: true,
      cursor: "move",
      z: 100,
      style: {
        fill: item.index === state.mainlineEditorIndex ? "#D35D3D" : "#2F6FED",
        stroke: "#ffffff",
        lineWidth: 2,
        shadowBlur: 10,
        shadowColor: "rgba(47,111,237,0.18)",
      },
      onclick: () => {
        state.mainlineEditorIndex = item.index;
        const rect = mainlineTimelineChart.getDom().getBoundingClientRect();
        setMainlinePopupPosition(window.scrollX + rect.left + pixel[0] + 14, window.scrollY + rect.top + pixel[1] - 24);
        state.mainlineModalOpen = true;
        renderMainlineTimeline();
      },
      ondrag: function () {
        const next = mainlineTimelineChart.convertFromPixel({ xAxisIndex: 0, yAxisIndex: 0 }, this.position);
        if (!Array.isArray(next) || !next[0]) return;
        state.mainlines[item.index].date = formatDateInput(new Date(next[0]));
        state.mainlineEditorIndex = item.index;
        renderMainlineEditor();
        if (state.mainlineModalOpen) renderMainlineModal();
      },
      ondragend: () => {
        renderMainlineTimeline();
      },
    };
  });

  mainlineTimelineChart.setOption({ graphic: nodeGraphics });
  const chartDom = mainlineTimelineChart.getDom();
  if (chartDom._mainlineDblClickHandler) {
    chartDom.removeEventListener("dblclick", chartDom._mainlineDblClickHandler);
  }
  chartDom._mainlineDblClickHandler = (event) => {
    const rect = chartDom.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const clickedNode = entries.some((item) => {
      const [px, py] = mainlineTimelineChart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [item.timestamp, 0]);
      return Math.hypot(px - offsetX, py - offsetY) <= 18;
    });
    if (clickedNode) return;
    const next = mainlineTimelineChart.convertFromPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [offsetX, offsetY]);
    if (!Array.isArray(next) || !next[0]) return;
    state.mainlines.push({
      date: formatDateInput(new Date(next[0])),
      rateBonus: 2.5,
      gateLevel: null,
    });
    state.mainlineEditorIndex = state.mainlines.length - 1;
    setMainlinePopupPosition(window.scrollX + rect.left + offsetX + 14, window.scrollY + rect.top + offsetY - 24);
    state.mainlineModalOpen = true;
    renderMainlineTimeline();
  };
  chartDom.addEventListener("dblclick", chartDom._mainlineDblClickHandler);

  renderMainlineEditor();
  renderMainlineModal();
}

function renderTimelineRows(listId, rows, rowType, onDelete) {
  const host = document.getElementById(listId);
  host.innerHTML = "";
  renderListHeader(host, "timeline-grid", rowType === "mainline" ? ["更新时间", "芯尘获取增加"] : ["开始日期", "持续天数", "获得箱子"]);
  rows.forEach((row, index) => {
    const card = document.createElement("div");
    card.className = `timeline-card ${rowType}`;

    const compactGrid = document.createElement("div");
    compactGrid.className = "timeline-grid";
    if (rowType === "mainline") {
      compactGrid.appendChild(createCompactField(row.date, (value) => { row.date = value; }, { type: "date", ariaLabel: "主线更新时间", title: "主线更新时间", compactClass: "is-date", columnClass: "col-date" }));
      compactGrid.appendChild(createCompactField(row.rateBonus, (value) => { row.rateBonus = value; }, { type: "number", cast: "number", step: "0.1", placeholder: "增加", ariaLabel: "芯尘获取增加", title: "芯尘获取增加", compactClass: "is-short", columnClass: "col-number" }));
    } else {
      compactGrid.appendChild(createCompactField(row.startDate, (value) => { row.startDate = value; }, { type: "date", ariaLabel: "活动开始日期", title: "活动开始日期", compactClass: "is-date", columnClass: "col-date" }));
      compactGrid.appendChild(createCompactField(row.durationDays, (value) => { row.durationDays = value; }, { type: "number", cast: "number", step: "1", placeholder: "天数", ariaLabel: "活动持续天数", title: "活动持续天数", compactClass: "is-short", columnClass: "col-number" }));
      compactGrid.appendChild(createCompactField(row.boxes, (value) => { row.boxes = value; }, { type: "number", cast: "number", step: "1", placeholder: "箱子", ariaLabel: "活动获得箱子数", title: "活动获得箱子数", compactClass: "is-short", columnClass: "col-number" }));
    }
    card.appendChild(compactGrid);

    if (!row.locked) {
      const compactDel = document.createElement("button");
      compactDel.className = "icon-btn";
      compactDel.type = "button";
      compactDel.textContent = "x";
      compactDel.addEventListener("click", () => onDelete(index));
      card.appendChild(compactDel);
    }

    host.appendChild(card);
  });
}

function renderEventsEditor() {
  const host = document.getElementById("events-list");
  const toolbar = document.querySelector("#section-events .section-toolbar");
  if (!host || !toolbar) return;

  toolbar.innerHTML = "";
  host.innerHTML = "";

  const controls = document.createElement("div");
  controls.className = "events-mode-bar";

  const modeField = createField("活动模式", state.activityConfig.mode, (value) => {
    state.activityConfig.mode = value;
    renderEventsEditor();
  }, {
    type: "select",
    options: [ACTIVITY_EDITOR_MODES.CUSTOM, ACTIVITY_EDITOR_MODES.PRESET],
    columnClass: "col-frequency",
  });
  controls.appendChild(modeField);

  if (state.activityConfig.mode === ACTIVITY_EDITOR_MODES.PRESET) {
    const note = document.createElement("div");
    note.className = "events-preset-note";
    note.textContent = "预设节奏：每 42 天约 1 个 21 天大型活动（约获得 472 小时芯尘箱），每 28 天约 1 个 14 天小活动（约获得 324 小时芯尘箱）；折算为每 42 天约 1 个大型活动 + 1.5 个小活动。";
    host.appendChild(controls);
    host.appendChild(note);
    return;
  }

  const addSmallBtn = document.createElement("button");
  addSmallBtn.type = "button";
  addSmallBtn.className = "small-btn";
  addSmallBtn.textContent = "新增14天小活动";
  addSmallBtn.addEventListener("click", () => {
    state.events.push({ name: "14天小活动", startDate: state.params.startDate, durationDays: 14, boxes: 324, locked: false });
    renderEventsEditor();
  });
  controls.appendChild(addSmallBtn);

  const addLargeBtn = document.createElement("button");
  addLargeBtn.type = "button";
  addLargeBtn.className = "small-btn";
  addLargeBtn.textContent = "新增21天大型活动";
  addLargeBtn.addEventListener("click", () => {
    state.events.push({ name: "21天大型活动", startDate: state.params.startDate, durationDays: 21, boxes: 472, locked: false });
    renderEventsEditor();
  });
  controls.appendChild(addLargeBtn);
  host.appendChild(controls);

  const list = document.createElement("div");
  list.id = "events-custom-list";
  list.className = "editor-list";
  host.appendChild(list);

  if (isMobileLayout()) {
    renderCollectionCards("events-custom-list", "events", state.events, (index) => {
      state.events.splice(index, 1);
      renderEventsEditor();
    });
    return;
  }

  renderGenericRows("events-custom-list", state.events, EVENT_EDITOR_SCHEMA, (index) => {
    state.events.splice(index, 1);
    renderEventsEditor();
  }, { showHeader: false, gridClass: "events-grid" });
}

function renderEditors() {
  renderMainlineTimeline();
  renderEventsEditor();

  if (isMobileLayout()) {
    renderCollectionCards("extras-list", "extras", state.extras, (index) => {
      state.extras.splice(index, 1);
      renderEditors();
    });

    renderCollectionCards("strategies-list", "strategies", state.strategies, (index) => {
      state.strategies.splice(index, 1);
      renderEditors();
    });
    return;
  }

  renderGenericRows("extras-list", state.extras, EXTRA_EDITOR_SCHEMA, (index) => {
    state.extras.splice(index, 1);
    renderEditors();
  }, { showHeader: false, gridClass: "extras-grid" });

  renderGenericRows("strategies-list", state.strategies, DESKTOP_STRATEGY_EDITOR_SCHEMA, (index) => {
    state.strategies.splice(index, 1);
    renderEditors();
  }, { gridClass: "strategies-grid" });
}

function renderMetrics() {
  const host = document.getElementById("metrics-grid");
  host.innerHTML = "";
  host.hidden = true;
}

function fillSelect(select, options, value, allowEmpty = false) {
  if (!select) return;
  select.innerHTML = "";
  if (allowEmpty) {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "请选择";
    select.appendChild(empty);
  }
  options.forEach((option) => {
    const el = document.createElement("option");
    const normalizedOption = typeof option === "string"
      ? { value: option, label: option }
      : option;
    el.value = normalizedOption.value;
    el.textContent = normalizedOption.label;
    if (normalizedOption.value === value) el.selected = true;
    select.appendChild(el);
  });
  if (!options.some((option) => (typeof option === "string" ? option : option.value) === value) && allowEmpty) {
    select.value = "";
  }
}

function activeStrategyOptions() {
  return state.summaries.map((item) => ({
    value: item.selectionKey,
    label: item.name,
  }));
}

function appendTextCells(tr, values) {
  values.forEach((value) => {
    const td = document.createElement("td");
    td.textContent = value;
    tr.appendChild(td);
  });
}

function renderCharts() {
  if (!state.summaries.length) {
    lineChart.setOption({ title: { text: "运行模拟后显示策略曲线", left: "center", top: "middle" }, series: [] }, true);
    barChart.setOption({ title: { text: "暂无可显示的策略", left: "center", top: "middle" }, series: [] }, true);
    return;
  }

  const lineSeries = state.summaries.map((summary, index) => {
    const rows = state.results[summary.selectionKey] || [];
    return {
      name: summary.name,
      type: "line",
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2.5, color: CHART_COLORS[index % CHART_COLORS.length] },
      itemStyle: { color: CHART_COLORS[index % CHART_COLORS.length] },
      data: rows.map((row) => [formatDateInput(dayToDate(row.day)), Number(row.displayLevel.toFixed(4))]),
    };
  });

  lineChart.setOption({
    animation: true,
    grid: { left: 56, right: 24, top: 56, bottom: 60 },
    legend: { top: 10 },
    toolbox: {
      right: 10,
      feature: { saveAsImage: { title: "导出 PNG" }, dataZoom: {}, restore: {} },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
      backgroundColor: "rgba(17,24,39,0.92)",
      borderWidth: 0,
      textStyle: { color: "#ffffff" },
    },
    xAxis: { type: "time", name: "日期", nameLocation: "middle", nameGap: 30 },
    yAxis: { type: "value", name: "等级" },
    series: lineSeries,
  }, true);

  barChart.setOption({
    grid: { left: 56, right: 24, top: 26, bottom: 70 },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: { type: "category", data: state.summaries.map((row) => row.name), axisLabel: { rotate: 16 } },
    yAxis: { type: "value", name: "最终等级" },
    series: [{
      type: "bar",
      data: state.summaries.map((row, index) => ({
        value: Number(row.finalDisplayLevel.toFixed(4)),
        itemStyle: { color: CHART_COLORS[index % CHART_COLORS.length] },
      })),
    }],
  }, true);
}

function createMobileCardField(label, value, strong = false) {
  const item = document.createElement("div");
  item.className = "mobile-data-card-field";

  const labelEl = document.createElement("span");
  labelEl.className = "mobile-data-card-label";
  labelEl.textContent = label;

  const valueEl = document.createElement("strong");
  valueEl.className = strong ? "mobile-data-card-value is-strong" : "mobile-data-card-value";
  valueEl.textContent = value;

  item.append(labelEl, valueEl);
  return item;
}

function renderSummaryCards(rows) {
  summaryMobileCardsHost.innerHTML = "";

  rows.forEach((row) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `mobile-data-card summary-mobile-card ${row.isActive ? "is-active" : ""}`.trim();
    card.addEventListener("click", () => {
      state.detailStrategy = row.selectionKey || state.detailStrategy;
      fillSelect(detailStrategySelect, activeStrategyOptions(), state.detailStrategy, true);
      renderSummaryTable();
      renderDetailTable();
    });

    const header = document.createElement("div");
    header.className = "mobile-data-card-header";
    header.append(
      createMobileCardField("策略", row.name, true),
      createMobileCardField("类型", row.strategyType),
    );

    const grid = document.createElement("div");
    grid.className = "mobile-data-card-grid";
    grid.append(
      createMobileCardField("最终等级", row.finalLevelText, true),
      createMobileCardField("剩余箱子", row.finalBoxesText),
      createMobileCardField("累计开箱", row.totalOpenedText),
    );

    card.append(header, grid);
    summaryMobileCardsHost.appendChild(card);
  });
}

function renderDetailCards(rows) {
  detailMobileCardsHost.innerHTML = "";

  rows.forEach((row) => {
    const card = document.createElement("article");
    card.className = "mobile-data-card detail-mobile-card";

    const header = document.createElement("div");
    header.className = "mobile-data-card-header";
    header.append(
      createMobileCardField("天数", row.dayText || "--", true),
      createMobileCardField("等级", row.levelText || "--", true),
    );

    const grid = document.createElement("div");
    grid.className = "mobile-data-card-grid";
    grid.append(
      createMobileCardField("级内进度", row.progressText),
      createMobileCardField("箱子", row.boxesText),
      createMobileCardField("当日开箱", row.openedText),
      createMobileCardField("日常芯尘", row.dailyDustText),
      createMobileCardField("额外芯尘", row.extraDustText),
      createMobileCardField("说明", row.noteText || "--"),
    );

    card.append(header, grid);
    detailMobileCardsHost.appendChild(card);
  });
}

function renderSummaryTable() {
  if (!summaryBody || !summaryTableWrap || !summaryMobileCardsHost) return;
  const renderMode = getSummaryRenderMode(currentLayoutMode);
  summaryBody.innerHTML = "";

  if (renderMode === "cards") {
    summaryTableWrap.hidden = true;
    summaryMobileCardsHost.hidden = false;
    renderSummaryCards(buildMobileSummaryCards(state.summaries, state.detailStrategy));
    return;
  }

  summaryTableWrap.hidden = false;
  summaryMobileCardsHost.hidden = true;
  state.summaries.forEach((row) => {
    const tr = document.createElement("tr");
    tr.className = `summary-clickable ${row.selectionKey === state.detailStrategy ? "active" : ""}`;
    appendTextCells(tr, buildSummaryTableCells(row));
    tr.addEventListener("click", () => {
      state.detailStrategy = row.selectionKey;
      fillSelect(detailStrategySelect, activeStrategyOptions(), state.detailStrategy, true);
      renderSummaryTable();
      renderDetailTable();
    });
    summaryBody.appendChild(tr);
  });
}

function renderDetailTable() {
  if (!detailBody || !detailViewToggle || !detailWrap || !detailMobileShell || !detailMobileCardsHost) return;
  const rows = state.results[state.detailStrategy] || [];
  const renderMode = getDetailViewRenderMode(currentLayoutMode, state.mobileDetailView);

  detailBody.innerHTML = "";
  detailViewToggle.textContent = getDetailViewToggleLabel(state.mobileDetailView);

  if (currentLayoutMode === "mobile") {
    detailMobileShell.hidden = false;
    detailViewToggle.hidden = false;
  } else {
    detailMobileShell.hidden = true;
    detailViewToggle.hidden = true;
  }

  if (renderMode === "cards") {
    detailWrap.hidden = true;
    renderDetailCards(buildMobileDetailCards(rows));
    return;
  }

  detailWrap.hidden = false;
  detailMobileCardsHost.innerHTML = "";
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    appendTextCells(tr, buildDetailTableCells(row));
    detailBody.appendChild(tr);
  });
}

function getMissingSimulationMessage() {
  if (state.params.startLevel === "") return "请先填写当前等级";
  if (state.params.startBoxes === "") return "请先填写拥有芯尘箱";
  if (state.nikkeData.normalProgressOptions.length && !state.params.currentNormalStageId) return "请先选择当前普通主线进度";
  return "";
}

function runSimulation() {
  try {
    const missingMessage = getMissingSimulationMessage();
    if (missingMessage) {
      state.results = {};
      state.summaries = [];
      fillSelect(detailStrategySelect, [], "", true);
      renderMetrics();
      renderCharts();
      renderSummaryTable();
      renderDetailTable();
      toolbarStatusState.statusText = missingMessage;
      renderStatusOverview();
      return;
    }

    state.strategies = ensureStrategyIds(state.strategies);
    const enabledStrategies = state.strategies.filter((strategy) => strategy.enabled);
    if (!enabledStrategies.length) {
      state.results = {};
      state.summaries = [];
      toolbarStatusState.statusText = "至少启用一个策略";
      renderStatusOverview();
      return;
    }
    state.results = {};
    enabledStrategies.forEach((strategy) => {
      state.results[getStrategySelectionKey(strategy)] = simulate(strategy);
    });
    state.summaries = buildSummaries();
    if (!state.detailStrategy || !state.summaries.some((item) => item.selectionKey === state.detailStrategy)) {
      state.detailStrategy = state.summaries[0]?.selectionKey || "";
    }
    fillSelect(detailStrategySelect, activeStrategyOptions(), state.detailStrategy, true);
    renderMetrics();
    renderCharts();
    renderSummaryTable();
    renderDetailTable();
    const best = state.summaries[0];
    toolbarStatusState.statusText = "计算完成";
    renderStatusOverview(best);
  } catch (error) {
    state.results = {};
    state.summaries = [];
    console.error(error);
    toolbarStatusState.statusText = `计算失败：${error.message}`;
    renderStatusOverview();
  }
}

function exportCurrentCSV() {
  const rows = state.results[state.detailStrategy];
  if (!rows || !rows.length) {
    toolbarStatusState.statusText = "请先计算并选择一个明细策略";
    renderCompactStatus();
    return;
  }
  const data = [
    ["day", "level", "progress_dust", "next_level_cost", "display_level", "hourly_rate", "boxes", "opened_boxes_today", "daily_dust", "extra_dust", "activity_boxes", "mainline_bonus", "active_gate_level", "updates_seen", "strategy_note"],
    ...rows.map((row) => [
      row.day,
      row.level,
      row.progressDust.toFixed(2),
      row.nextCost,
      row.displayLevel.toFixed(4),
      row.hourlyRate.toFixed(2),
      row.boxes.toFixed(0),
      row.openedBoxesToday.toFixed(0),
      row.dailyDust.toFixed(2),
      row.extraDust.toFixed(2),
      row.activityBoxes.toFixed(2),
      row.mainlineBonus.toFixed(2),
      row.activeGateLevel ?? "",
      row.updatesSeen,
      row.strategyNote ?? "",
    ]),
  ];
  const csv = data.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const selectedSummary = state.summaries.find((item) => item.selectionKey === state.detailStrategy);
  link.href = url;
  link.download = `${selectedSummary?.name || state.detailStrategy}_daily_detail.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportChartPNG() {
  const url = lineChart.getDataURL({ pixelRatio: 2, backgroundColor: "#ffffff" });
  const link = document.createElement("a");
  link.href = url;
  link.download = "nikke_strategy_chart.png";
  link.click();
}

function syncCollapsibleSectionState(section, isOpen) {
  section.classList.toggle("is-open", isOpen);
  const icon = section.querySelector(".collapse-icon");
  if (icon) {
    icon.textContent = isOpen ? "−" : "+";
  }
}

function getSectionOpenOverrides(sectionId) {
  if (!sectionOpenOverrides[sectionId]) {
    sectionOpenOverrides[sectionId] = {};
  }

  return sectionOpenOverrides[sectionId];
}

function syncCollapsibleSectionForLayout(section, layoutMode) {
  const overrides = getSectionOpenOverrides(section.id);
  const isOpen = getResponsiveSectionOpenState(
    section.id,
    layoutMode,
    overrides,
    getInitialSectionOpenState(section.id, "desktop", section.classList.contains("is-open")),
  );
  syncCollapsibleSectionState(section, isOpen);
}

function bindCollapsible() {
  document.querySelectorAll(".collapsible").forEach((section) => {
    syncCollapsibleSectionForLayout(section, currentLayoutMode);

    const toggle = section.querySelector(".collapse-toggle");
    toggle.addEventListener("click", () => {
      const nextOpen = !section.classList.contains("is-open");
      getSectionOpenOverrides(section.id)[currentLayoutMode] = nextOpen;
      syncCollapsibleSectionState(section, nextOpen);
      if (section.id === "section-mainlines") setTimeout(() => mainlineTimelineChart.resize(), 0);
      updateActiveNav();
    });
  });
}

function ensureEventToolbarButtons() {
  const host = document.querySelector("#section-events .section-toolbar");
  if (!host) return;
  host.innerHTML = `
    <button data-add="event-small" class="small-btn" type="button">新增14天小活动</button>
    <button data-add="event-large" class="small-btn" type="button">新增21天大型活动</button>
  `;
}

function syncInlineSectionActions() {
  ["section-mainlines", "section-events", "section-extras"].forEach((id) => {
    const section = document.getElementById(id);
    if (section) section.classList.add("has-inline-toolbar");
  });

  const mainlineAdd = document.querySelector('[data-add="mainlines"]');
  if (mainlineAdd) mainlineAdd.textContent = "新增";

  const extrasAdd = document.querySelector('[data-add="extras"]');
  if (extrasAdd) extrasAdd.textContent = "新增";
}

function buildPageNav() {
  pageNavList.innerHTML = "";
  document.querySelectorAll("[data-nav-label]").forEach((section) => {
    const id = section.id;
    const label = section.dataset.navLabel;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "page-nav-link";
    button.dataset.target = id;
    button.textContent = label;
    button.addEventListener("click", () => {
      const top = section.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top, behavior: "smooth" });
    });
    pageNavList.appendChild(button);
  });
}

function updateActiveNav() {
  const sections = [...document.querySelectorAll("[data-nav-label]")];
  if (!sections.length) return;
  const pivot = window.scrollY + 180;
  let activeId = sections[0].id;
  sections.forEach((section) => {
    if (section.offsetTop <= pivot) activeId = section.id;
  });
  document.querySelectorAll(".page-nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.target === activeId);
  });
}

function bindEvents() {
  ensureEventToolbarButtons();
  const mainlineAdd = document.querySelector('[data-add="mainlines"]');
  if (mainlineAdd) mainlineAdd.closest(".section-toolbar")?.remove();
  toolbarActionsHost?.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button?.id) return;
    if (button.id === "run-btn") runSimulation();
    if (button.id === "export-csv-btn") exportCurrentCSV();
    if (button.id === "export-png-btn") exportChartPNG();
  });

  document.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.add;
      if (type === "event-small") state.events.push({ name: "14天小活动", mode: ACTIVITY_MODES.ONCE, startDate: state.params.startDate, durationDays: 14, boxes: 324, locked: false });
      if (type === "event-large") state.events.push({ name: "21天大型活动", mode: ACTIVITY_MODES.ONCE, startDate: state.params.startDate, durationDays: 21, boxes: 472, locked: false });
      if (type === "extras") state.extras.push({ name: "新来源", startDate: state.params.startDate, startDay: 0, endDay: state.params.simulateDays, frequency: "每日", amount: 0, enabled: true, note: "" });
      if (type === "strategies") {
        state.strategies = ensureStrategyIds([
          ...state.strategies,
          { name: "新策略", type: "BASELINE", targetDay: null, targetLevel: null, enabled: true, note: "" },
        ]);
      }
      renderEditors();
    });
  });

  detailStrategySelect?.addEventListener("change", (event) => {
    state.detailStrategy = event.target.value;
    renderSummaryTable();
    renderDetailTable();
  });

  detailViewToggle?.addEventListener("click", () => {
    if (currentLayoutMode !== "mobile") return;
    state.mobileDetailView = state.mobileDetailView === "table" ? "cards" : "table";
    renderDetailTable();
  });

  window.addEventListener("resize", () => {
    mainlineTimelineChart.resize();
    lineChart.resize();
    barChart.resize();
    const nextLayoutMode = getCurrentLayoutMode();
    applyLayoutDensity(nextLayoutMode);
    if (hasLayoutModeChanged(currentLayoutMode, getCurrentViewportWidth())) {
      currentLayoutMode = nextLayoutMode;
      document.querySelectorAll(".collapsible").forEach((section) => {
        syncCollapsibleSectionForLayout(section, currentLayoutMode);
      });
      renderToolbar();
      renderCompactStatus();
      renderEditors();
      renderSummaryTable();
      renderDetailTable();
    } else if (state.mainlineModalOpen) {
      renderMainlineModal();
    }
    updateActiveNav();
  });
  window.addEventListener("scroll", updateActiveNav, { passive: true });
  document.addEventListener("mousedown", (event) => {
    if (!state.mainlineModalOpen) return;
    const dialog = mainlineModalRoot.querySelector(".mainline-modal-dialog");
    if (!dialog) return;
    if (!dialog.contains(event.target)) closeMainlineModal();
  });
}

async function initializeApp() {
  loadParamsFromStorage();
  applyLayoutDensity(currentLayoutMode);
  buildPageNav();
  renderToolbar();
  renderCompactStatus();
  bindCollapsible();
  bindEvents();
  await loadNikkeData();
  renderParams();
  renderDustReference();
  renderEditors();
  runSimulation();
  updateActiveNav();
}

initializeApp();
