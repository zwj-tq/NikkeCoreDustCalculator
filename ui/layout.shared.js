const MOBILE_BREAKPOINT = 720;
(() => {
const TABLET_BREAKPOINT = 1079;

function getEffectiveViewportWidth({
  visualViewportWidth = null,
  clientWidth = null,
  innerWidth = null,
} = {}) {
  const candidates = [visualViewportWidth, clientWidth, innerWidth]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  return candidates[0] ?? 0;
}

function getLayoutMode(width) {
  if (width <= MOBILE_BREAKPOINT) {
    return "mobile";
  }

  if (width <= TABLET_BREAKPOINT) {
    return "tablet";
  }

  return "desktop";
}

function getLayoutDensityTokens(layoutMode, viewportWidth = 0) {
  const desktopTokens = {
    pageShellWidth: "min(1200px, calc(100vw - 32px))",
    pageShellPaddingTop: "24px",
    heroTitleSize: "clamp(30px, 4vw, 44px)",
    sourceBadgeFontSize: "14px",
    sourceBadgePadding: "9px 14px",
    stickyToolbarPadding: "14px",
    stickyToolbarGap: "12px",
    toolbarButtonMinHeight: "46px",
    toolbarButtonFontSize: "15px",
    toolbarStatusNoteSize: "13px",
    sectionPadding: "22px",
    sectionTitleSize: "22px",
    collapseIconSize: "42px",
    fieldLabelSize: "11px",
    fieldControlFontSize: "15px",
    fieldControlPadding: "12px 14px",
    fieldControlMinHeight: "46px",
    mobileCardPadding: "16px",
    mobileCardLabelSize: "12px",
    mobileCardValueSize: "15px",
    mobileCardStrongSize: "16px",
    mobileCardGridColumns: "repeat(2, minmax(0, 1fr))",
  };

  if (layoutMode === "mobile") {
    const mobileWidth = Number.isFinite(viewportWidth) && viewportWidth > 0
      ? `${Math.max(viewportWidth - 16, 0)}px`
      : "calc(100vw - 16px)";

    return {
      ...desktopTokens,
      pageShellWidth: mobileWidth,
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
    };
  }

  if (layoutMode === "tablet") {
    return {
      ...desktopTokens,
      heroTitleSize: "clamp(32px, 5.2vw, 42px)",
      stickyToolbarPadding: "15px",
      sectionPadding: "22px 20px",
      fieldControlFontSize: "15px",
    };
  }

  return desktopTokens;
}

function hasLayoutModeChanged(currentMode, width) {
  return currentMode !== getLayoutMode(width);
}

function getStrategySelectionKey(row) {
  return row.id ?? row.name;
}

function ensureStrategyIds(strategies) {
  const usedIds = new Set(
    strategies
      .map((strategy) => strategy?.id)
      .filter((id) => typeof id === "string" && id.length > 0),
  );

  let nextId = 1;

  return strategies.map((strategy) => {
    if (typeof strategy?.id === "string" && strategy.id.length > 0) {
      return strategy;
    }

    let generatedId = `strategy-${nextId}`;
    while (usedIds.has(generatedId)) {
      nextId += 1;
      generatedId = `strategy-${nextId}`;
    }
    usedIds.add(generatedId);
    nextId += 1;

    return {
      ...strategy,
      id: generatedId,
    };
  });
}

function getDayText(day) {
  return day == null ? "" : `第 ${day} 天`;
}

function buildExtraRangeText(row) {
  const parts = [];
  if (row.startDate) {
    parts.push(String(row.startDate));
  }

  const hasStartDay = row.startDay != null && row.startDay !== "";
  const hasEndDay = row.endDay != null && row.endDay !== "";
  if (hasStartDay || hasEndDay) {
    const startDayText = hasStartDay ? row.startDay : "?";
    const endDayText = hasEndDay ? row.endDay : "?";
    parts.push(`第 ${startDayText}-${endDayText} 天`);
  }

  return parts.join(" · ");
}

function buildMobileSummaryCards(rows, activeKey) {
  return rows.map((row) => ({
    selectionKey: getStrategySelectionKey(row),
    name: row.name,
    strategyType: row.strategyType,
    finalLevelText: Number(row.finalDisplayLevel || 0).toFixed(2),
    finalBoxesText: Number(row.finalBoxes || 0).toFixed(0),
    totalOpenedText: Number(row.totalOpenedBoxes || 0).toFixed(0),
    isActive: getStrategySelectionKey(row) === activeKey,
  }));
}

function buildMobileDetailCards(rows) {
  return rows.map((row) => ({
    dayText: getDayText(row.day),
    levelText: String(row.level ?? ""),
    progressText: Number(row.progressDust || 0).toFixed(0),
    boxesText: Number(row.boxes || 0).toFixed(0),
    openedText: Number(row.openedBoxesToday || 0).toFixed(0),
    dailyDustText: Number(row.dailyDust || 0).toFixed(0),
    extraBoxesText: Number(row.extraBoxes || 0).toFixed(0),
    extraDustText: Number(row.extraDust || 0).toFixed(0),
    noteText: row.strategyNote || "",
  }));
}

function getSummaryRenderMode(layoutMode) {
  return layoutMode === "mobile" ? "cards" : "table";
}

function getDetailViewRenderMode(layoutMode, mobileDetailView = "cards") {
  if (layoutMode !== "mobile") {
    return "table";
  }

  return mobileDetailView === "table" ? "table" : "cards";
}

function getDetailViewToggleLabel(mobileDetailView = "cards") {
  return mobileDetailView === "table" ? "查看卡片明细" : "查看完整表格";
}

function getInitialSectionOpenState(sectionId, layoutMode, defaultOpen = true) {
  if (sectionId === "section-detail" && layoutMode === "mobile") {
    return false;
  }

  return defaultOpen;
}

function getResponsiveSectionOpenState(
  sectionId,
  layoutMode,
  layoutOverrides = {},
  defaultOpen = true,
) {
  if (Object.hasOwn(layoutOverrides, layoutMode)) {
    return layoutOverrides[layoutMode];
  }

  return getInitialSectionOpenState(sectionId, layoutMode, defaultOpen);
}

function hasCompactValue(value) {
  if (value == null) {
    return false;
  }

  const text = String(value).trim();
  return text !== "" && text !== "--";
}

function buildCompactStatusItems(snapshot) {
  return [
    {
      key: "bestStrategy",
      label: "最佳策略",
      value: snapshot?.bestStrategyText,
    },
    {
      key: "finalLevel",
      label: "最终等级",
      value: snapshot?.finalLevelText,
    },
    {
      key: "strategyCount",
      label: "策略数",
      value: snapshot?.strategyCountText,
    },
    {
      key: "currentLevel",
      label: "当前等级",
      value: snapshot?.currentLevelText,
    },
  ]
    .filter((item) => hasCompactValue(item.value))
    .map((item) => ({
      ...item,
      value: String(item.value),
    }))
    .slice(0, 3);
}

function buildToolbarActionGroups(actions, layoutMode = "desktop") {
  if (layoutMode !== "mobile") {
    return {
      primary: [...actions],
      secondary: [],
    };
  }

  return actions.reduce((groups, action) => {
    if (action.priority === "primary") {
      groups.primary.push(action);
      return groups;
    }

    groups.secondary.push(action);
    return groups;
  }, {
    primary: [],
    secondary: [],
  });
}

function buildSummaryTableCells(row) {
  return [
    String(row.name ?? ""),
    String(row.strategyType ?? ""),
    Number(row.finalDisplayLevel || 0).toFixed(2),
    Number(row.finalBoxes || 0).toFixed(0),
    Number(row.totalOpenedBoxes || 0).toFixed(0),
  ];
}

function buildDetailTableCells(row) {
  return [
    String(row.day ?? ""),
    String(row.level ?? ""),
    Number(row.progressDust || 0).toFixed(0),
    String(row.nextCost ?? ""),
    Number(row.hourlyRate || 0).toFixed(2),
    Number(row.boxes || 0).toFixed(0),
    Number(row.openedBoxesToday || 0).toFixed(0),
    Number(row.dailyDust || 0).toFixed(0),
    Number(row.extraBoxes || 0).toFixed(0),
    Number(row.extraDust || 0).toFixed(0),
    String(row.strategyNote || ""),
  ];
}

function buildCollectionCardFields(kind, row) {
  if (kind === "strategies") {
    return [
      { key: "name", label: "名称", value: row.name ?? "" },
      { key: "type", label: "类型", value: row.type ?? "" },
      { key: "targetDay", label: "目标天", value: row.targetDay ?? "" },
      { key: "targetLevel", label: "目标级", value: row.targetLevel ?? "" },
      { key: "note", label: "备注", value: row.note ?? "" },
      { key: "enabled", label: "启用", value: Boolean(row.enabled) },
    ];
  }

  if (kind === "events") {
    return [
      { key: "name", label: "名称", value: row.name ?? "" },
      { key: "startDate", label: "开始日期", value: row.startDate ?? "" },
      { key: "durationDays", label: "持续天数", value: row.durationDays ?? "" },
      { key: "boxes", label: "获得箱子", value: row.boxes ?? "" },
    ];
  }

  if (kind === "extras") {
    return [
      { key: "name", label: "名称", value: row.name ?? "" },
      { key: "frequency", label: "类型", value: row.frequency ?? "" },
      { key: "resourceType", label: "资源", value: row.resourceType ?? "芯尘箱" },
      { key: "amount", label: "数量", value: row.amount ?? "" },
      { key: "range", label: "起始范围", value: buildExtraRangeText(row) },
      { key: "note", label: "备注", value: row.note ?? "" },
    ];
  }

  return [];
}

function buildMobileCollectionCardFields(kind, row) {
  const fields = buildCollectionCardFields(kind, row);

  if (kind === "strategies") {
    return fields.filter((field) => field.key !== "enabled");
  }

  return fields;
}

function buildCollectionCardHeader(kind, row) {
  if (kind === "strategies") {
    return {
      title: row.name ?? "",
      subtitle: row.type ?? "",
      statusText: row.enabled ? "已启用" : "未启用",
    };
  }

  if (kind === "extras") {
    const subtitleParts = [row.frequency ?? "", row.resourceType ?? "芯尘箱"].filter(Boolean);
    return {
      title: row.name ?? "",
      subtitle: subtitleParts.join(" · "),
      statusText: "",
    };
  }

  if (kind === "events") {
    return {
      title: row.name ?? "",
      subtitle: row.durationDays == null || row.durationDays === ""
        ? ""
        : `持续 ${row.durationDays} 天`,
      statusText: "",
    };
  }

  return {
    title: row?.name ?? "",
    subtitle: "",
    statusText: "",
  };
}

function getMainlineTimelinePresentation(layoutMode = "desktop") {
  if (layoutMode === "mobile") {
    return {
      titleTop: 6,
      titleFontSize: 16,
      subtextFontSize: 11,
      grid: { left: 18, right: 18, top: 52, bottom: 28 },
      labelDistance: 12,
      labelFontSize: 10,
      labelLineHeight: 15,
      shortenDate: true,
      hideOverlap: true,
    };
  }

  return {
    titleTop: 8,
    titleFontSize: 18,
    subtextFontSize: 12,
    grid: { left: 24, right: 24, top: 56, bottom: 36 },
    labelDistance: 18,
    labelFontSize: 12,
    labelLineHeight: 18,
    shortenDate: false,
    hideOverlap: false,
  };
}

function formatMainlineTimelineDate(dateText, shortenDate) {
  const text = String(dateText ?? "");

  if (!shortenDate || text.length < 10) {
    return text;
  }

  return text.slice(5);
}

function buildMainlineScatterData(entries, activeIndex, layoutMode = "desktop") {
  const presentation = getMainlineTimelinePresentation(layoutMode);

  return entries.map((item, visibleIndex) => {
    const isActive = item.index === activeIndex;
    const isEdge = visibleIndex === 0 || visibleIndex === entries.length - 1;
    const shouldShowLabel = layoutMode !== "mobile"
      || entries.length <= 4
      || isActive
      || isEdge
      || visibleIndex % 2 === 0;

    return {
      value: [item.timestamp, 0],
      originalIndex: item.index,
      symbolSize: 0,
      itemStyle: {
        color: "rgba(0,0,0,0)",
      },
      label: {
        show: shouldShowLabel,
        position: "top",
        distance: presentation.labelDistance,
        formatter: shouldShowLabel
          ? `${item.label}\n${formatMainlineTimelineDate(item.date, presentation.shortenDate)}`
          : "",
        color: "#1f2937",
        fontSize: presentation.labelFontSize,
        lineHeight: presentation.labelLineHeight,
        align: "center",
        fontWeight: isActive ? 700 : 500,
      },
    };
  });
}

function clampFloatingDialogPosition({
  anchorX = 0,
  anchorY = 0,
  scrollX = 0,
  scrollY = 0,
  viewportWidth = 0,
  viewportHeight = 0,
  dialogWidth = 0,
  dialogHeight = 0,
  inset = 12,
} = {}) {
  const minX = scrollX + inset;
  const minY = scrollY + inset;
  const maxX = Math.max(minX, scrollX + viewportWidth - dialogWidth - inset);
  const maxY = Math.max(minY, scrollY + viewportHeight - dialogHeight - inset);

  return {
    x: Math.min(Math.max(minX, anchorX), maxX),
    y: Math.min(Math.max(minY, anchorY), maxY),
  };
}

const NikkeLayout = {
  MOBILE_BREAKPOINT,
  TABLET_BREAKPOINT,
  getEffectiveViewportWidth,
  getLayoutMode,
  getLayoutDensityTokens,
  hasLayoutModeChanged,
  getStrategySelectionKey,
  ensureStrategyIds,
  buildMobileSummaryCards,
  buildMobileDetailCards,
  getSummaryRenderMode,
  getDetailViewRenderMode,
  getDetailViewToggleLabel,
  getInitialSectionOpenState,
  getResponsiveSectionOpenState,
  buildCompactStatusItems,
  buildToolbarActionGroups,
  buildSummaryTableCells,
  buildDetailTableCells,
  buildCollectionCardFields,
  buildMobileCollectionCardFields,
  buildCollectionCardHeader,
  getMainlineTimelinePresentation,
  buildMainlineScatterData,
  clampFloatingDialogPosition
};

globalThis.NikkeLayout = NikkeLayout;
})();

