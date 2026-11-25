/**
 * @file src/engine/charts/echartsOptionBuilder.ts
 * @description Pembangun opsi Apache ECharts lengkap (Fintech SaaS Default, Komponen Card/KPI/Pills/Footnote, & Perbaikan Semua 22 Tipe Seri)
 */
import { ChartConfig, ChartDataKind, ChartFontStyle, EChartsSeriesType } from './chartTypes.ts';
import { DATA_KIND_BY_TYPE } from './chartCatalog.ts';

function isPlainObject(v: any): v is Record<string, any> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = out[key];
    if (isPlainObject(sv) && isPlainObject(tv)) {
      out[key] = deepMerge(tv, sv);
    } else {
      out[key] = sv;
    }
  }
  return out;
}

const FONT_FALLBACK = "'Geovanta Sans', 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function toEChartsTextStyle(f: ChartFontStyle) {
  const fam = f.family && f.family !== 'Geovanta Sans' ? `'${f.family}', ${FONT_FALLBACK}` : FONT_FALLBACK;
  return {
    fontFamily: fam,
    fontSize: Number(f.size) || 12,
    fontWeight: f.weight || 'normal',
    fontStyle: f.style || 'normal',
    color: f.color || '#64748b',
  };
}

function makeColorEntry(hex: string, useGradient: boolean, dir: 'vertical' | 'horizontal' | 'diagonal') {
  if (!useGradient) return hex;
  const x2 = dir === 'horizontal' ? 1 : dir === 'diagonal' ? 1 : 0;
  const y2 = dir === 'vertical' ? 1 : dir === 'diagonal' ? 1 : 0;
  return {
    type: 'linear',
    x: 0,
    y: 0,
    x2,
    y2,
    colorStops: [
      { offset: 0, color: hex },
      { offset: 1, color: hex + '88' },
    ],
  };
}

function buildLegendPosition(legend: ChartConfig['legend']) {
  const pos: Record<string, any> = {};
  if (legend.position === 'top') {
    pos.top = 18;
    pos.right = 20;
  } else if (legend.position === 'bottom') {
    pos.bottom = 14;
    pos.left = 'center';
  } else if (legend.position === 'left') {
    pos.left = 16;
    pos.top = 'middle';
  } else {
    pos.right = 16;
    pos.top = 'middle';
  }
  return pos;
}

function buildGraphicComponents(config: ChartConfig): any[] {
  const graphics: any[] = [];
  const w = Math.max(120, Number(config.width) || 600);
  const h = Math.max(100, Number(config.height) || 420);
  const rawFam = config.typography?.global?.family || 'Geovanta Sans';
  const fontFam = rawFam !== 'Geovanta Sans' ? `'${rawFam}', ${FONT_FALLBACK}` : FONT_FALLBACK;

  // 1. Rounded Card Frame
  if (config.card && config.card.show) {
    const bw = Math.max(0, Number(config.card.borderWidth) || 0);
    const inset = bw / 2;
    graphics.push({
      type: 'rect',
      z: -10,
      silent: true,
      left: inset,
      top: inset,
      shape: {
        width: Math.max(10, w - bw),
        height: Math.max(10, h - bw),
        r: Math.max(0, Number(config.card.borderRadius) || 0),
      },
      style: {
        fill: config.card.backgroundColor || '#ffffff',
        stroke: bw > 0 ? (config.card.borderColor || '#eef2f6') : 'none',
        lineWidth: bw,
      },
    });
  }

  // 2. KPI Hero Value + Delta Badge + Caption
  if (config.kpi && config.kpi.show) {
    const kpiTop = config.title.show ? (config.title.subtext ? 62 : 46) : 22;
    const valStr = String(config.kpi.value || '$23.700');
    graphics.push({
      type: 'text',
      z: 10,
      silent: true,
      left: 22,
      top: kpiTop,
      style: {
        text: valStr,
        font: `700 28px ${fontFam}`,
        fill: '#0F172A',
      },
    });

    if (config.kpi.delta) {
      const deltaStr = String(config.kpi.delta);
      const badgeLeft = 22 + Math.max(4, valStr.length) * 16 + 10;
      const tone = config.kpi.deltaTone || 'positive';
      const bgFill = tone === 'positive' ? '#dcfce7' : tone === 'negative' ? '#fee2e2' : '#f1f5f9';
      const txtFill = tone === 'positive' ? '#15803d' : tone === 'negative' ? '#b91c1c' : '#475569';
      const pillW = Math.max(64, Math.round(deltaStr.length * 6.8 + 22));
      graphics.push({
        type: 'group',
        z: 10,
        silent: true,
        left: Math.min(w - pillW - 22, badgeLeft),
        top: kpiTop + 3,
        children: [
          {
            type: 'rect',
            x: 0,
            y: 0,
            shape: { width: pillW, height: 24, r: 12 },
            style: { fill: bgFill },
          },
          {
            type: 'text',
            x: pillW / 2,
            y: 12,
            style: {
              text: deltaStr,
              font: `600 11px ${fontFam}`,
              fill: txtFill,
              textAlign: 'center',
              textVerticalAlign: 'middle',
            },
          },
        ],
      });
    }

    if (config.kpi.caption) {
      graphics.push({
        type: 'text',
        z: 10,
        silent: true,
        left: 22,
        top: kpiTop + 36,
        style: {
          text: config.kpi.caption,
          font: `400 12px ${fontFam}`,
          fill: '#94A3B8',
        },
      });
    }
  }

  // 3. Period Pills (e.g. Monthly | Yearly) at top-right
  if (config.periodPills && config.periodPills.show && Array.isArray(config.periodPills.items) && config.periodPills.items.length) {
    const items = config.periodPills.items;
    const activeIdx = Math.max(0, Math.min(items.length - 1, Number(config.periodPills.activeIndex) || 0));
    const accent = (config.colors && config.colors[1]) || (config.colors && config.colors[0]) || '#6C5CE7';
    let curX = 0;
    const children: any[] = [];
    items.forEach((lbl, idx) => {
      const pw = Math.max(52, String(lbl).length * 7 + 20);
      const isAct = idx === activeIdx;
      children.push({
        type: 'rect',
        x: curX,
        y: 0,
        shape: { width: pw, height: 24, r: 12 },
        style: {
          fill: isAct ? accent : '#ffffff',
          stroke: isAct ? accent : '#e2e8f0',
          lineWidth: 1,
        },
      });
      children.push({
        type: 'text',
        x: curX + pw / 2,
        y: 12,
        style: {
          text: lbl,
          font: `500 11px ${fontFam}`,
          fill: isAct ? '#ffffff' : '#64748b',
          textAlign: 'center',
          textVerticalAlign: 'middle',
        },
      });
      curX += pw + 6;
    });
    graphics.push({
      type: 'group',
      z: 10,
      silent: true,
      right: 22,
      top: 18,
      children,
    });
  }

  // 4. Footnote
  if (config.footnote && config.footnote.show && config.footnote.text) {
    const pos: Record<string, any> = { bottom: 8 };
    if (config.footnote.align === 'center') pos.left = 'center';
    else if (config.footnote.align === 'right') pos.right = 22;
    else pos.left = 22;
    graphics.push({
      type: 'text',
      z: 10,
      silent: true,
      ...pos,
      style: {
        text: config.footnote.text,
        font: `400 10px ${fontFam}`,
        fill: '#94a3b8',
      },
    });
  }

  return graphics;
}

function buildCartesianAxes(config: ChartConfig) {
  const { xAxis, yAxis, typography, seriesStyle, data } = config;
  const horizontal = !!seriesStyle.horizontal && config.chartType === 'bar';
  const categories =
    config.chartType === 'boxplot'
      ? data.boxplotCategories
      : config.chartType === 'candlestick'
        ? data.candlestickCategories
        : config.chartType === 'heatmap'
          ? data.heatmapX
          : config.chartType === 'custom'
            ? data.customCategories
            : data.categories;

  const isScatterOrLines = config.chartType === 'scatter' || config.chartType === 'effectScatter';

  const makeAxis = (ax: ChartConfig['xAxis'], isCat: boolean, catData?: string[]) => {
    const prefix = ax.valuePrefix || '';
    const suffix = ax.valueSuffix || '';
    const out: Record<string, any> = {
      show: ax.show,
      type: isCat ? 'category' : 'value',
      name: ax.name || undefined,
      nameTextStyle: toEChartsTextStyle(typography.axisName),
      inverse: ax.inverse,
      axisLine: { show: ax.axisLine, lineStyle: { color: '#cbd5e1' } },
      axisTick: { show: ax.axisTick, lineStyle: { color: '#cbd5e1' } },
      axisLabel: {
        ...toEChartsTextStyle(typography.axisLabel),
        rotate: Number(ax.labelRotate) || 0,
        formatter: !isCat && (prefix || suffix) ? `${prefix}{value}${suffix}` : undefined,
      },
      splitLine: {
        show: ax.splitLine,
        lineStyle: { type: ax.splitLineType || 'dashed', color: ax.splitLineColor || '#f1f5f9' },
      },
      splitArea: { show: ax.splitArea },
    };
    if (isCat) {
      out.data = catData || [];
    } else {
      const minN = ax.min !== '' && Number.isFinite(Number(ax.min)) ? Number(ax.min) : undefined;
      const maxN = ax.max !== '' && Number.isFinite(Number(ax.max)) ? Number(ax.max) : undefined;
      if (minN !== undefined) out.min = minN;
      if (maxN !== undefined) out.max = maxN;
    }
    return out;
  };

  if (config.chartType === 'heatmap') {
    return {
      xAxis: makeAxis(xAxis, true, data.heatmapX),
      yAxis: makeAxis(yAxis, true, data.heatmapY),
    };
  }
  if (isScatterOrLines) {
    return {
      xAxis: makeAxis(xAxis, false),
      yAxis: makeAxis(yAxis, false),
    };
  }
  if (horizontal || config.chartType === 'custom') {
    return {
      xAxis: makeAxis(xAxis, false),
      yAxis: makeAxis(yAxis, true, categories),
    };
  }
  return {
    xAxis: makeAxis(xAxis, true, categories),
    yAxis: makeAxis(yAxis, false),
  };
}

function buildMarkAnnotations(config: ChartConfig) {
  const { annotations } = config;
  const markPointData: any[] = [];
  if (annotations.markPointMax) markPointData.push({ type: 'max', name: 'Max' });
  if (annotations.markPointMin) markPointData.push({ type: 'min', name: 'Min' });

  const markLineData: any[] = [];
  const lineCol = annotations.markLineColor || '#6C5CE7';
  if (annotations.markLineAvg) {
    markLineData.push({
      type: 'average',
      name: annotations.markLineAvgLabel || 'avg',
      label: { formatter: `{b}: {c}`, color: lineCol, fontSize: 10 },
      lineStyle: { type: 'dashed', color: lineCol, width: 1.5 },
    });
  }
  const targetNum = annotations.markLineTarget !== '' ? Number(annotations.markLineTarget) : NaN;
  if (Number.isFinite(targetNum)) {
    markLineData.push({
      yAxis: targetNum,
      name: annotations.markLineTargetLabel || 'Target',
      label: { formatter: `{b}: {c}`, color: lineCol, fontSize: 10 },
      lineStyle: { type: 'dashed', color: lineCol, width: 1.5 },
    });
  }

  let markArea: any = undefined;
  const areaFrom = annotations.markAreaFrom !== '' ? Number(annotations.markAreaFrom) : NaN;
  const areaTo = annotations.markAreaTo !== '' ? Number(annotations.markAreaTo) : NaN;
  if (Number.isFinite(areaFrom) && Number.isFinite(areaTo)) {
    markArea = {
      itemStyle: { color: 'rgba(108, 92, 231, 0.08)' },
      data: [[{ yAxis: areaFrom }, { yAxis: areaTo }]],
    };
  }

  return {
    markPoint: markPointData.length ? { data: markPointData } : undefined,
    markLine: markLineData.length ? { symbol: ['none', 'none'], data: markLineData } : undefined,
    markArea,
  };
}

export function buildEChartsOption(config: ChartConfig): Record<string, any> {
  const {
    chartType,
    colors,
    useGradient,
    gradientDirection,
    typography,
    title,
    legend,
    grid,
    seriesStyle,
    dataLabel,
    visualMap,
    data,
  } = config;

  const paletteColors = (colors && colors.length ? colors : ['#6C5CE7', '#C8C2FA', '#1E1E24']).map(c =>
    makeColorEntry(c, useGradient, gradientDirection)
  );

  const labelOpt: Record<string, any> = {
    show: !!dataLabel.show,
    position: dataLabel.position || 'top',
    distance: Number(dataLabel.distance) || 6,
    rotate: Number(dataLabel.rotate) || 0,
    formatter: dataLabel.formatter ? dataLabel.formatter : undefined,
    ...toEChartsTextStyle(typography.dataLabel),
  };

  const kpiExtraTop = config.kpi && config.kpi.show ? (config.kpi.caption ? 70 : 50) : 0;
  const footnoteExtraBottom = config.footnote && config.footnote.show ? 18 : 0;

  const option: Record<string, any> = {
    animation: false,
    backgroundColor: config.transparentBg ? 'transparent' : (config.backgroundColor || '#ffffff'),
    color: paletteColors,
    textStyle: toEChartsTextStyle(typography.global),
    graphic: buildGraphicComponents(config),
    title: {
      show: title.show,
      text: title.text,
      subtext: title.subtext,
      left: title.left === 'left' ? 18 : title.left === 'right' ? 'right' : 'center',
      top: title.top ?? 20,
      itemGap: title.itemGap,
      textStyle: toEChartsTextStyle(typography.title),
      subtextStyle: toEChartsTextStyle(typography.subtitle),
    },
    legend: {
      show: legend.show && !['gauge', 'treemap', 'sunburst', 'tree', 'sankey', 'map', 'heatmap'].includes(chartType),
      orient: legend.orient,
      icon: legend.icon || 'circle',
      itemWidth: legend.itemWidth || 8,
      itemHeight: legend.itemHeight || 8,
      itemGap: legend.itemGap || 16,
      backgroundColor: 'transparent',
      borderWidth: 0,
      textStyle: toEChartsTextStyle(typography.legend),
      ...buildLegendPosition(legend),
    },
  };

  const { markPoint, markLine, markArea } = buildMarkAnnotations(config);

  const usesCartesian =
    ['line', 'scatter', 'effectScatter', 'boxplot', 'candlestick', 'heatmap', 'pictorialBar', 'custom'].includes(chartType) ||
    (chartType === 'bar' && !seriesStyle.polar);

  if (usesCartesian) {
    option.grid = {
      top: (Number(grid.top) || 72) + kpiExtraTop,
      right: Number(grid.right) || 28,
      bottom: (Number(grid.bottom) || 56) + footnoteExtraBottom,
      left: Number(grid.left) || 52,
      containLabel: grid.containLabel,
      show: grid.showBorder,
      borderColor: grid.borderColor,
    };
    const axes = buildCartesianAxes(config);
    option.xAxis = axes.xAxis;
    option.yAxis = axes.yAxis;
  }

  if (visualMap.show) {
    option.visualMap = {
      show: true,
      min: Number(visualMap.min) || 0,
      max: Number(visualMap.max) || 100,
      orient: visualMap.orient || 'horizontal',
      left: 'center',
      bottom: 14 + footnoteExtraBottom,
      calculable: false,
      inRange: {
        color: visualMap.colors && visualMap.colors.length >= 2 ? visualMap.colors : ['#ede9fe', '#a78bfa', '#6C5CE7'],
      },
      textStyle: toEChartsTextStyle(typography.axisLabel),
    };
  }

  switch (chartType) {
    case 'line': {
      option.series = (data.series || []).map((s, idx) => {
        const baseHex = (colors && colors[idx % colors.length]) || '#10B981';
        const op = seriesStyle.areaOpacity ?? 0.22;
        const areaGrad = seriesStyle.areaFill
          ? {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: baseHex + Math.round(Math.min(1, op) * 255).toString(16).padStart(2, '0') },
                  { offset: 1, color: baseHex + '05' },
                ],
              },
            }
          : undefined;
        return {
          name: s.name,
          type: 'line',
          animation: false,
          data: s.data,
          smooth: seriesStyle.smooth,
          step: seriesStyle.step || false,
          stack: seriesStyle.stack ? 'total' : undefined,
          showSymbol: seriesStyle.showSymbol,
          symbol: seriesStyle.symbol || 'circle',
          symbolSize: seriesStyle.symbolSize || 6,
          lineStyle: {
            width: seriesStyle.lineWidth || 2.5,
            type: seriesStyle.lineType || 'solid',
          },
          areaStyle: areaGrad,
          itemStyle: { opacity: seriesStyle.opacity ?? 1 },
          label: labelOpt,
          markPoint,
          markLine,
          markArea,
        };
      });
      break;
    }

    case 'bar': {
      const rVal = seriesStyle.barBorderRadius ?? 99;
      if (seriesStyle.polar) {
        option.polar = { center: ['50%', '54%'], radius: ['18%', '68%'] };
        option.angleAxis = { startAngle: 90, axisLabel: toEChartsTextStyle(typography.axisLabel) };
        option.radiusAxis = { type: 'category', data: data.categories || [], axisLabel: toEChartsTextStyle(typography.axisLabel) };
        option.series = (data.series || []).map(s => ({
          name: s.name,
          type: 'bar',
          animation: false,
          coordinateSystem: 'polar',
          data: s.data,
          stack: seriesStyle.stack ? 'total' : undefined,
          itemStyle: { borderRadius: rVal, opacity: seriesStyle.opacity ?? 1 },
          label: labelOpt,
        }));
      } else {
        const radiusArr = rVal >= 20
          ? [rVal, rVal, rVal, rVal]
          : seriesStyle.horizontal
            ? [0, rVal, rVal, 0]
            : [rVal, rVal, 0, 0];
        option.series = (data.series || []).map(s => ({
          name: s.name,
          type: 'bar',
          animation: false,
          data: s.data,
          stack: seriesStyle.stack ? 'total' : undefined,
          barWidth: seriesStyle.barWidth > 0 ? seriesStyle.barWidth : 12,
          barGap: '30%',
          showBackground: seriesStyle.showBarBackground,
          backgroundStyle: seriesStyle.showBarBackground
            ? { color: '#f1f5f9', borderRadius: radiusArr }
            : undefined,
          itemStyle: {
            borderRadius: radiusArr,
            opacity: seriesStyle.opacity ?? 1,
          },
          label: labelOpt,
          markPoint,
          markLine,
          markArea,
        }));
      }
      break;
    }

    case 'pictorialBar': {
      option.series = (data.series || []).slice(0, 2).map(s => ({
        name: s.name,
        type: 'pictorialBar',
        animation: false,
        symbol: seriesStyle.pictorialSymbol || 'roundRect',
        symbolRepeat: seriesStyle.pictorialRepeat,
        symbolSize: ['60%', 9],
        symbolMargin: 3,
        data: s.data,
        itemStyle: { opacity: seriesStyle.opacity ?? 1 },
        label: labelOpt,
      }));
      break;
    }

    case 'pie': {
      const inner = Math.max(0, Math.min(90, seriesStyle.pieInnerRadius || 0));
      const outer = Math.max(inner + 5, Math.min(95, seriesStyle.pieOuterRadius || 72));
      const isRose = !!seriesStyle.pieRoseType;
      const pieLabel: Record<string, any> = {
        ...labelOpt,
        show: dataLabel.show !== false ? true : false,
        position: dataLabel.position === 'inside' ? 'inside' : 'outside',
        formatter: dataLabel.formatter || (dataLabel.pillBadge ? '{d}%' : '{b}: {d}%'),
      };
      if (dataLabel.pillBadge) {
        pieLabel.backgroundColor = '#ffffff';
        pieLabel.borderColor = '#e2e8f0';
        pieLabel.borderWidth = 1;
        pieLabel.borderRadius = 10;
        pieLabel.padding = [5, 10];
        pieLabel.fontWeight = '600';
        pieLabel.color = '#1e293b';
      }
      const pieSeries: Record<string, any> = {
        name: title.text || 'Pie',
        type: 'pie',
        animation: false,
        radius: [`${inner}%`, `${outer}%`],
        center: ['50%', '52%'],
        startAngle: seriesStyle.pieStartAngle ?? 90,
        roseType: seriesStyle.pieRoseType || false,
        padAngle: isRose ? 0 : (seriesStyle.piePadAngle || 0),
        itemStyle: {
          borderRadius: seriesStyle.pieCornerRadius || 0,
          opacity: seriesStyle.opacity ?? 1,
        },
        label: pieLabel,
        labelLine: {
          show: !dataLabel.pillBadge,
          length: 10,
          length2: 10,
        },
        data: data.items || [],
      };
      if (seriesStyle.pieHalf) {
        pieSeries.endAngle = (seriesStyle.pieStartAngle ?? 90) - 180;
      }
      option.series = [pieSeries];
      break;
    }

    case 'scatter':
    case 'effectScatter': {
      option.series = (data.scatterSeries || []).map(s => ({
        name: s.name,
        type: chartType,
        animation: false,
        symbol: seriesStyle.symbol || 'circle',
        symbolSize: (val: number[]) => {
          if (Array.isArray(val) && val.length >= 3 && Number.isFinite(val[2])) {
            return Math.max(6, Math.min(44, val[2]));
          }
          return seriesStyle.symbolSize || 12;
        },
        rippleEffect: chartType === 'effectScatter' ? { brushType: 'stroke', number: 1, scale: 1.8 } : undefined,
        data: s.points || [],
        itemStyle: { opacity: seriesStyle.opacity ?? 0.88 },
        label: labelOpt,
      }));
      break;
    }

    case 'radar': {
      option.radar = {
        shape: seriesStyle.radarShape || 'polygon',
        splitNumber: seriesStyle.radarSplitNumber || 4,
        center: ['50%', '52%'],
        radius: '58%',
        indicator: data.radarIndicators || [],
        axisName: toEChartsTextStyle(typography.axisName),
      };
      option.series = [
        {
          type: 'radar',
          animation: false,
          data: (data.radarSeries || []).map(s => ({
            name: s.name,
            value: s.value,
            areaStyle: { opacity: seriesStyle.radarAreaOpacity ?? 0.24 },
            lineStyle: { width: seriesStyle.lineWidth || 2 },
            symbolSize: seriesStyle.symbolSize || 6,
          })),
          label: labelOpt,
        },
      ];
      break;
    }

    case 'tree': {
      const isRadial = seriesStyle.treeOrient === 'radial';
      const treeSeries: Record<string, any> = {
        type: 'tree',
        animation: false,
        data: [data.hierarchyRoot || { name: 'Root', children: [] }],
        layout: isRadial ? 'radial' : 'orthogonal',
        top: '18%',
        left: isRadial ? '16%' : '16%',
        bottom: '14%',
        right: isRadial ? '16%' : '22%',
        symbolSize: seriesStyle.symbolSize || 10,
        label: {
          ...toEChartsTextStyle(typography.dataLabel),
          position: isRadial ? 'top' : 'left',
          verticalAlign: 'middle',
          align: isRadial ? 'center' : 'right',
        },
        leaves: {
          label: {
            ...toEChartsTextStyle(typography.dataLabel),
            position: isRadial ? 'top' : 'right',
            verticalAlign: 'middle',
            align: isRadial ? 'center' : 'left',
          },
        },
        expandAndCollapse: false,
      };
      if (!isRadial) {
        treeSeries.orient = seriesStyle.treeOrient || 'LR';
      }
      option.series = [treeSeries];
      break;
    }

    case 'treemap': {
      option.series = [
        {
          type: 'treemap',
          animation: false,
          top: 60 + kpiExtraTop,
          bottom: 20 + footnoteExtraBottom,
          left: 20,
          right: 20,
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          label: {
            show: true,
            ...toEChartsTextStyle(typography.dataLabel),
            color: '#ffffff',
          },
          itemStyle: {
            borderColor: '#ffffff',
            borderWidth: 2,
            borderRadius: 6,
            gapWidth: 3,
            opacity: seriesStyle.opacity ?? 1,
          },
          data: (data.hierarchyRoot && data.hierarchyRoot.children) || [],
        },
      ];
      break;
    }

    case 'sunburst': {
      option.series = [
        {
          type: 'sunburst',
          animation: false,
          radius: ['16%', '78%'],
          center: ['50%', '54%'],
          label: {
            ...toEChartsTextStyle(typography.dataLabel),
            rotate: 'radial',
          },
          itemStyle: {
            borderRadius: 6,
            borderWidth: 2,
            borderColor: '#ffffff',
          },
          data: (data.hierarchyRoot && data.hierarchyRoot.children) || [],
        },
      ];
      break;
    }

    case 'boxplot': {
      option.series = [
        {
          name: 'Boxplot',
          type: 'boxplot',
          animation: false,
          data: data.boxplotData || [],
          itemStyle: {
            borderWidth: 2,
            opacity: seriesStyle.opacity ?? 1,
          },
          label: labelOpt,
        },
      ];
      break;
    }

    case 'candlestick': {
      option.series = [
        {
          name: 'OHLC',
          type: 'candlestick',
          animation: false,
          data: data.candlestickData || [],
          itemStyle: {
            color: '#10B981',
            color0: '#EF4444',
            borderColor: '#10B981',
            borderColor0: '#EF4444',
          },
        },
      ];
      break;
    }

    case 'heatmap': {
      option.series = [
        {
          name: 'Heatmap',
          type: 'heatmap',
          animation: false,
          data: data.heatmapData || [],
          label: {
            show: true,
            ...toEChartsTextStyle(typography.dataLabel),
          },
          itemStyle: {
            borderColor: '#ffffff',
            borderWidth: 3,
            borderRadius: 6,
          },
        },
      ];
      break;
    }

    case 'map': {
      option.series = [
        {
          name: title.text || 'Map',
          type: 'map',
          animation: false,
          map: seriesStyle.mapName || 'indonesia',
          roam: false,
          layoutCenter: ['50%', '54%'],
          layoutSize: '82%',
          label: {
            show: dataLabel.show,
            ...toEChartsTextStyle(typography.dataLabel),
          },
          itemStyle: {
            areaColor: '#ede9fe',
            borderColor: '#ffffff',
            borderWidth: 1.5,
          },
          data: data.mapData || [],
        },
      ];
      break;
    }

    case 'parallel': {
      option.parallel = {
        top: 86 + kpiExtraTop,
        bottom: 46 + footnoteExtraBottom,
        left: 44,
        right: 44,
      };
      option.parallelAxis = (data.parallelAxes || []).map((name, dim) => ({
        dim,
        name,
        nameTextStyle: toEChartsTextStyle(typography.axisName),
        axisLabel: toEChartsTextStyle(typography.axisLabel),
      }));
      option.series = [
        {
          name: 'Parallel',
          type: 'parallel',
          animation: false,
          lineStyle: {
            width: seriesStyle.lineWidth || 2,
            opacity: 0.75,
          },
          data: data.parallelData || [],
        },
      ];
      break;
    }

    case 'lines': {
      option.geo = {
        map: seriesStyle.mapName || 'indonesia',
        roam: false,
        layoutCenter: ['50%', '54%'],
        layoutSize: '82%',
        itemStyle: {
          areaColor: '#f1f5f9',
          borderColor: '#cbd5e1',
          borderWidth: 1.2,
        },
      };
      option.series = [
        {
          name: 'Routes',
          type: 'lines',
          animation: false,
          coordinateSystem: 'geo',
          zlevel: 2,
          effect: { show: false },
          lineStyle: {
            color: colors[0] || '#6C5CE7',
            width: seriesStyle.lineWidth || 2.5,
            opacity: 0.85,
            curveness: 0.25,
          },
          data: data.linesData || [],
        },
        {
          name: 'Hubs',
          type: 'scatter',
          animation: false,
          coordinateSystem: 'geo',
          zlevel: 3,
          symbolSize: 8,
          itemStyle: { color: colors[3] || '#FF922B' },
          data: (data.linesData || []).flatMap(l => [
            { name: l.fromName, value: [...l.coords[0], l.value || 10] },
            { name: l.toName, value: [...l.coords[1], l.value || 10] },
          ]),
        },
      ];
      break;
    }

    case 'graph': {
      option.series = [
        {
          name: 'Graph',
          type: 'graph',
          animation: false,
          layout: seriesStyle.graphLayout || 'none',
          roam: false,
          top: 72 + kpiExtraTop,
          bottom: 42 + footnoteExtraBottom,
          left: 40,
          right: 40,
          label: {
            show: true,
            position: 'inside',
            ...toEChartsTextStyle(typography.dataLabel),
            color: '#ffffff',
          },
          edgeSymbol: ['circle', 'arrow'],
          edgeSymbolSize: [4, 10],
          lineStyle: {
            color: '#cbd5e1',
            width: 2,
            curveness: 0.15,
          },
          data: (data.graphNodes || []).map((n, idx) => ({
            ...n,
            itemStyle: { color: colors[idx % colors.length] || '#6C5CE7' },
          })),
          links: data.graphLinks || [],
        },
      ];
      break;
    }

    case 'sankey': {
      option.series = [
        {
          type: 'sankey',
          animation: false,
          top: 68 + kpiExtraTop,
          bottom: 24 + footnoteExtraBottom,
          left: 24,
          right: 96,
          nodeWidth: seriesStyle.sankeyNodeWidth || 18,
          nodeGap: seriesStyle.sankeyNodeGap || 10,
          lineStyle: {
            color: 'gradient',
            curveness: seriesStyle.sankeyCurveness ?? 0.5,
            opacity: 0.45,
          },
          label: {
            ...toEChartsTextStyle(typography.dataLabel),
          },
          data: (data.sankeyNodes || []).map((n, idx) => ({
            ...n,
            itemStyle: { color: colors[idx % colors.length] || '#6C5CE7' },
          })),
          links: data.sankeyLinks || [],
        },
      ];
      break;
    }

    case 'funnel': {
      option.series = [
        {
          name: title.text || 'Funnel',
          type: 'funnel',
          animation: false,
          left: '14%',
          top: 68 + kpiExtraTop,
          bottom: 46 + footnoteExtraBottom,
          width: '72%',
          sort: seriesStyle.funnelSort || 'descending',
          gap: 4,
          itemStyle: { borderRadius: 6, borderWidth: 0 },
          label: {
            show: true,
            position: dataLabel.position === 'outside' ? 'right' : 'inside',
            ...toEChartsTextStyle(typography.dataLabel),
            color: dataLabel.position === 'outside' ? typography.dataLabel.color : '#ffffff',
          },
          data: data.items || [],
        },
      ];
      break;
    }

    case 'gauge': {
      option.series = [
        {
          name: data.gaugeName || 'KPI',
          type: 'gauge',
          animation: false,
          center: ['50%', '58%'],
          radius: '74%',
          min: Number(seriesStyle.gaugeMin) || 0,
          max: Number(seriesStyle.gaugeMax) || 100,
          startAngle: seriesStyle.gaugeStartAngle ?? 225,
          endAngle: seriesStyle.gaugeEndAngle ?? -45,
          splitNumber: seriesStyle.gaugeSplitNumber || 5,
          progress: {
            show: seriesStyle.gaugeProgress,
            width: seriesStyle.gaugeAxisWidth || 14,
            roundCap: true,
          },
          axisLine: {
            roundCap: true,
            lineStyle: {
              width: seriesStyle.gaugeAxisWidth || 14,
              color: [[1, '#f1f5f9']],
            },
          },
          pointer: {
            show: seriesStyle.gaugePointer,
          },
          axisLabel: {
            ...toEChartsTextStyle(typography.axisLabel),
            distance: 18,
          },
          title: {
            ...toEChartsTextStyle(typography.subtitle),
            offsetCenter: [0, '32%'],
          },
          detail: {
            valueAnimation: false,
            ...toEChartsTextStyle(typography.title),
            fontSize: Math.max(20, typography.title.size + 6),
            offsetCenter: [0, '12%'],
            formatter: '{value}',
          },
          data: [{ value: Number(data.gaugeValue) || 0, name: data.gaugeName || 'KPI' }],
        },
      ];
      break;
    }

    case 'themeRiver': {
      option.singleAxis = {
        top: 72 + kpiExtraTop,
        bottom: 48 + footnoteExtraBottom,
        left: 36,
        right: 36,
        type: 'time',
        axisLabel: toEChartsTextStyle(typography.axisLabel),
      };
      option.series = [
        {
          type: 'themeRiver',
          animation: false,
          emphasis: { disabled: true },
          label: {
            ...toEChartsTextStyle(typography.dataLabel),
          },
          data: data.themeRiverData || [],
        },
      ];
      break;
    }

    case 'custom': {
      option.series = [
        {
          type: 'custom',
          animation: false,
          renderItem: (_params: any, api: any) => {
            const catIdx = api.value(0);
            const start = api.coord([api.value(1), catIdx]);
            const end = api.coord([api.value(2), catIdx]);
            const barH = Math.min(18, (api.size([0, 1])[1] || 24) * 0.48);
            const color = colors[catIdx % colors.length] || '#6C5CE7';
            return {
              type: 'rect',
              shape: {
                x: Math.min(start[0], end[0]),
                y: start[1] - barH / 2,
                width: Math.max(8, Math.abs(end[0] - start[0])),
                height: barH,
                r: seriesStyle.barBorderRadius || 99,
              },
              style: {
                fill: color,
                opacity: seriesStyle.opacity ?? 0.94,
              },
            };
          },
          encode: { x: [1, 2], y: 0 },
          data: (data.customItems || []).map(it => [it.categoryIndex, it.start, it.end]),
        },
      ];
      break;
    }
  }

  if (config.customOptionJson && config.customOptionJson.trim()) {
    try {
      const parsed = JSON.parse(config.customOptionJson);
      if (isPlainObject(parsed)) {
        const merged = deepMerge(option, parsed);
        merged.animation = false;
        if (Array.isArray(merged.series)) {
          merged.series = merged.series.map((s: any) => (isPlainObject(s) ? { ...s, animation: false } : s));
        }
        return merged;
      }
    } catch (_e) {}
  }

  return option;
}

export function chartDataToCsv(config: ChartConfig): string {
  const kind: ChartDataKind = DATA_KIND_BY_TYPE[config.chartType] || 'tabular';
  const d = config.data;
  if (kind === 'tabular') {
    const header = ['Kategori', ...d.series.map(s => s.name)].join(',');
    const rows = d.categories.map((cat, idx) =>
      [cat, ...d.series.map(s => s.data[idx] ?? 0)].join(',')
    );
    return [header, ...rows].join('\n');
  }
  if (kind === 'pie' || kind === 'map') {
    const list = kind === 'map' ? d.mapData : d.items;
    return ['Nama,Nilai', ...list.map(it => `${it.name},${it.value}`)].join('\n');
  }
  if (kind === 'gauge') {
    return `Nama,Nilai\n${d.gaugeName},${d.gaugeValue}`;
  }
  return JSON.stringify(d, null, 2);
}

export function parseCsvToChartData(
  csvText: string,
  chartType: EChartsSeriesType,
  prevData: ChartConfig['data']
): ChartConfig['data'] {
  const kind: ChartDataKind = DATA_KIND_BY_TYPE[chartType] || 'tabular';
  const lines = csvText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return prevData;

  const parseRow = (line: string) => line.split(/[,\t;]+/).map(c => c.trim());

  if (kind === 'tabular') {
    const header = parseRow(lines[0]);
    const seriesNames = header.slice(1);
    if (!seriesNames.length) return prevData;
    const categories: string[] = [];
    const seriesData: number[][] = seriesNames.map(() => []);
    for (let i = 1; i < lines.length; i++) {
      const cols = parseRow(lines[i]);
      if (!cols[0]) continue;
      categories.push(cols[0]);
      seriesNames.forEach((_n, si) => {
        const val = parseFloat(cols[si + 1]);
        seriesData[si].push(Number.isFinite(val) ? val : 0);
      });
    }
    if (!categories.length) return prevData;
    return {
      ...prevData,
      categories,
      series: seriesNames.map((name, si) => ({ name, data: seriesData[si] })),
    };
  }

  if (kind === 'pie' || kind === 'map') {
    const items: Array<{ name: string; value: number }> = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseRow(lines[i]);
      if (!cols[0]) continue;
      const val = parseFloat(cols[1]);
      items.push({ name: cols[0], value: Number.isFinite(val) ? val : 0 });
    }
    if (!items.length) return prevData;
    return kind === 'map' ? { ...prevData, mapData: items } : { ...prevData, items };
  }

  return prevData;
}
