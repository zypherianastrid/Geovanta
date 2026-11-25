/**
 * @file src/engine/charts/chartTypes.ts
 * @description Tipe data terpusat, konfigurasi kustomisasi lengkap (Fintech SaaS Default), & palet warna untuk Geovanta Charts
 */

export type EChartsSeriesType =
  | 'line'
  | 'bar'
  | 'pie'
  | 'scatter'
  | 'effectScatter'
  | 'radar'
  | 'tree'
  | 'treemap'
  | 'sunburst'
  | 'boxplot'
  | 'candlestick'
  | 'heatmap'
  | 'map'
  | 'parallel'
  | 'lines'
  | 'graph'
  | 'sankey'
  | 'funnel'
  | 'gauge'
  | 'pictorialBar'
  | 'themeRiver'
  | 'custom';

export type ChartDataKind =
  | 'tabular'
  | 'pie'
  | 'scatter'
  | 'radar'
  | 'hierarchy'
  | 'boxplot'
  | 'candlestick'
  | 'heatmap'
  | 'map'
  | 'parallel'
  | 'lines'
  | 'graph'
  | 'sankey'
  | 'gauge'
  | 'themeRiver'
  | 'custom';

export interface ChartFontStyle {
  family: string;
  size: number;
  weight: 'normal' | '500' | '600' | 'bold';
  style: 'normal' | 'italic';
  color: string;
}

export interface ChartTabularSeries {
  name: string;
  data: number[];
  typeOverride?: 'line' | 'bar' | 'scatter';
}

export interface ChartDataPayload {
  categories: string[];
  series: ChartTabularSeries[];
  items: Array<{ name: string; value: number }>;
  scatterSeries: Array<{ name: string; points: number[][] }>;
  radarIndicators: Array<{ name: string; max: number }>;
  radarSeries: Array<{ name: string; value: number[] }>;
  hierarchyRoot: {
    name: string;
    value?: number;
    children?: any[];
  };
  boxplotCategories: string[];
  boxplotData: number[][];
  candlestickCategories: string[];
  candlestickData: number[][]; // [open, close, lowest, highest]
  heatmapX: string[];
  heatmapY: string[];
  heatmapData: number[][]; // [xIdx, yIdx, val]
  mapData: Array<{ name: string; value: number }>;
  parallelAxes: string[];
  parallelData: number[][];
  linesData: Array<{ fromName: string; toName: string; coords: [[number, number], [number, number]]; value?: number }>;
  graphNodes: Array<{ name: string; value?: number; symbolSize?: number; category?: number; x?: number; y?: number }>;
  graphLinks: Array<{ source: string; target: string; value?: number }>;
  sankeyNodes: Array<{ name: string }>;
  sankeyLinks: Array<{ source: string; target: string; value: number }>;
  gaugeValue: number;
  gaugeName: string;
  themeRiverData: Array<[string, number, string]>;
  customCategories: string[];
  customItems: Array<{ categoryIndex: number; start: number; end: number; label?: string }>;
}

export interface ChartConfig {
  chartType: EChartsSeriesType;
  presetId: string;
  width: number;
  height: number;
  backgroundColor: string;
  transparentBg: boolean;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  paletteId: string;
  colors: string[];
  useGradient: boolean;
  gradientDirection: 'vertical' | 'horizontal' | 'diagonal';
  card: {
    show: boolean;
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    borderRadius: number;
  };
  kpi: {
    show: boolean;
    value: string;
    delta: string;
    deltaTone: 'positive' | 'negative' | 'neutral';
    caption: string;
  };
  periodPills: {
    show: boolean;
    items: string[];
    activeIndex: number;
  };
  footnote: {
    show: boolean;
    text: string;
    align: 'left' | 'center' | 'right';
  };
  typography: {
    global: ChartFontStyle;
    title: ChartFontStyle;
    subtitle: ChartFontStyle;
    axisLabel: ChartFontStyle;
    axisName: ChartFontStyle;
    dataLabel: ChartFontStyle;
    legend: ChartFontStyle;
  };
  title: {
    show: boolean;
    text: string;
    subtext: string;
    left: 'left' | 'center' | 'right';
    top: number;
    itemGap: number;
  };
  legend: {
    show: boolean;
    orient: 'horizontal' | 'vertical';
    position: 'top' | 'bottom' | 'left' | 'right';
    icon: 'roundRect' | 'circle' | 'rect' | 'triangle' | 'diamond';
    itemWidth: number;
    itemHeight: number;
    itemGap: number;
  };
  grid: {
    top: number;
    right: number;
    bottom: number;
    left: number;
    containLabel: boolean;
    showBorder: boolean;
    borderColor: string;
  };
  xAxis: {
    show: boolean;
    name: string;
    inverse: boolean;
    axisLine: boolean;
    axisTick: boolean;
    splitLine: boolean;
    splitLineType: 'solid' | 'dashed' | 'dotted';
    splitLineColor: string;
    splitArea: boolean;
    labelRotate: number;
    min: string;
    max: string;
    valuePrefix: string;
    valueSuffix: string;
  };
  yAxis: {
    show: boolean;
    name: string;
    inverse: boolean;
    axisLine: boolean;
    axisTick: boolean;
    splitLine: boolean;
    splitLineType: 'solid' | 'dashed' | 'dotted';
    splitLineColor: string;
    splitArea: boolean;
    labelRotate: number;
    min: string;
    max: string;
    valuePrefix: string;
    valueSuffix: string;
  };
  seriesStyle: {
    smooth: boolean;
    areaFill: boolean;
    areaOpacity: number;
    lineWidth: number;
    lineType: 'solid' | 'dashed' | 'dotted';
    step: false | 'start' | 'middle' | 'end';
    showSymbol: boolean;
    symbol: string;
    symbolSize: number;
    stack: boolean;
    horizontal: boolean;
    polar: boolean;
    barWidth: number;
    barBorderRadius: number;
    showBarBackground: boolean;
    pieInnerRadius: number;
    pieOuterRadius: number;
    pieRoseType: false | 'radius' | 'area';
    piePadAngle: number;
    pieCornerRadius: number;
    pieStartAngle: number;
    pieHalf: boolean;
    gaugeMin: number;
    gaugeMax: number;
    gaugeStartAngle: number;
    gaugeEndAngle: number;
    gaugeProgress: boolean;
    gaugeAxisWidth: number;
    gaugePointer: boolean;
    gaugeSplitNumber: number;
    radarShape: 'polygon' | 'circle';
    radarSplitNumber: number;
    radarAreaOpacity: number;
    funnelSort: 'descending' | 'ascending' | 'none';
    sankeyNodeWidth: number;
    sankeyNodeGap: number;
    sankeyCurveness: number;
    graphLayout: 'circular' | 'none';
    treeOrient: 'LR' | 'RL' | 'TB' | 'BT' | 'radial';
    heatmapCalendar: boolean;
    mapName: 'world' | 'indonesia' | string;
    pictorialSymbol: string;
    pictorialRepeat: boolean;
    opacity: number;
  };
  dataLabel: {
    show: boolean;
    pillBadge: boolean;
    position: string;
    formatter: string;
    distance: number;
    rotate: number;
  };
  annotations: {
    markPointMax: boolean;
    markPointMin: boolean;
    markLineAvg: boolean;
    markLineAvgLabel: string;
    markLineTarget: string;
    markLineTargetLabel: string;
    markLineColor: string;
    markAreaFrom: string;
    markAreaTo: string;
  };
  visualMap: {
    show: boolean;
    min: number;
    max: number;
    orient: 'horizontal' | 'vertical';
    colors: string[];
  };
  data: ChartDataPayload;
  customOptionJson: string;
}

export interface ChartPalette {
  id: string;
  name: string;
  colors: string[];
}

export const CHART_PALETTES: ChartPalette[] = [
  {
    id: 'geovanta-fintech',
    name: 'Geovanta Fintech',
    colors: ['#6C5CE7', '#C8C2FA', '#1E1E24', '#FF922B', '#EC4899', '#10B981', '#F4845F', '#38BDF8'],
  },
  {
    id: 'geovanta-modern',
    name: 'Geovanta Modern',
    colors: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'],
  },
  {
    id: 'vivid-pop',
    name: 'Vivid Pop',
    colors: ['#2563eb', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'],
  },
  {
    id: 'pastel-soft',
    name: 'Pastel Soft',
    colors: ['#93c5fd', '#fda4af', '#86efac', '#fde047', '#c4b5fd', '#67e8f9', '#f9a8d4', '#bef264'],
  },
  {
    id: 'ocean-depth',
    name: 'Ocean Depth',
    colors: ['#0c4a6e', '#0284c7', '#06b6d4', '#2dd4bf', '#38bdf8', '#818cf8', '#0ea5e9', '#14b8a6'],
  },
  {
    id: 'warm-sunset',
    name: 'Warm Sunset',
    colors: ['#991b1b', '#dc2626', '#ea580c', '#f59e0b', '#fbbf24', '#f43f5e', '#fb7185', '#fdba74'],
  },
  {
    id: 'forest-botanical',
    name: 'Forest Botanical',
    colors: ['#14532d', '#15803d', '#22c55e', '#84cc16', '#0d9488', '#65a30d', '#4ade80', '#2dd4bf'],
  },
  {
    id: 'corporate-slate',
    name: 'Corporate Slate',
    colors: ['#1e293b', '#334155', '#475569', '#64748b', '#0284c7', '#0f766e', '#6366f1', '#94a3b8'],
  },
  {
    id: 'neon-cyber',
    name: 'Neon Cyber',
    colors: ['#00f5d4', '#00bbf9', '#9b5de5', '#f15bb5', '#fee440', '#fb5607', '#3a86ff', '#ff006e'],
  },
  {
    id: 'monochrome-ink',
    name: 'Monochrome Ink',
    colors: ['#18181b', '#3f3f46', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8', '#27272a', '#09090b'],
  },
  {
    id: 'earth-terracotta',
    name: 'Earth Terracotta',
    colors: ['#7c2d12', '#c2410c', '#d97706', '#ca8a04', '#65a30d', '#78350f', '#b45309', '#a16207'],
  },
  {
    id: 'berry-punch',
    name: 'Berry Punch',
    colors: ['#831843', '#be185d', '#ec4899', '#a855f7', '#7e22ce', '#6366f1', '#f472b6', '#c084fc'],
  },
];

export const ALL_ECHARTS_SERIES_TYPES: EChartsSeriesType[] = [
  'line',
  'bar',
  'pie',
  'scatter',
  'effectScatter',
  'radar',
  'tree',
  'treemap',
  'sunburst',
  'boxplot',
  'candlestick',
  'heatmap',
  'map',
  'parallel',
  'lines',
  'graph',
  'sankey',
  'funnel',
  'gauge',
  'pictorialBar',
  'themeRiver',
  'custom',
];

export function createDefaultDataPayload(): ChartDataPayload {
  return {
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu'],
    series: [
      { name: 'Projection', data: [24, 30, 34, 42, 48, 52, 56, 62] },
      { name: 'Actual', data: [18, 25, 28, 36, 40, 44, 48, 55] },
    ],
    items: [
      { name: 'Delivered', value: 48 },
      { name: 'In progress', value: 35 },
      { name: 'To-do', value: 17 },
    ],
    scatterSeries: [
      {
        name: 'Grup A',
        points: [
          [10, 25, 18],
          [22, 48, 26],
          [35, 38, 15],
          [48, 72, 34],
          [62, 65, 22],
          [78, 88, 40],
        ],
      },
      {
        name: 'Grup B',
        points: [
          [15, 42, 20],
          [28, 28, 16],
          [44, 58, 28],
          [56, 46, 24],
          [70, 74, 30],
          [85, 54, 18],
        ],
      },
    ],
    radarIndicators: [
      { name: 'Penjualan', max: 100 },
      { name: 'Pemasaran', max: 100 },
      { name: 'Pengembangan', max: 100 },
      { name: 'Dukungan', max: 100 },
      { name: 'Kualitas', max: 100 },
      { name: 'Kecepatan', max: 100 },
    ],
    radarSeries: [
      { name: 'Target', value: [85, 78, 92, 80, 90, 84] },
      { name: 'Aktual', value: [72, 88, 80, 91, 76, 89] },
    ],
    hierarchyRoot: {
      name: 'Perusahaan',
      children: [
        {
          name: 'Produk',
          value: 45,
          children: [
            { name: 'Desain', value: 20 },
            { name: 'Riset', value: 25 },
          ],
        },
        {
          name: 'Teknik',
          value: 60,
          children: [
            { name: 'Frontend', value: 28 },
            { name: 'Backend', value: 32 },
          ],
        },
        {
          name: 'Bisnis',
          value: 35,
          children: [
            { name: 'Penjualan', value: 20 },
            { name: 'Marketing', value: 15 },
          ],
        },
      ],
    },
    boxplotCategories: ['Q1', 'Q2', 'Q3', 'Q4'],
    boxplotData: [
      [18, 26, 35, 48, 62],
      [22, 34, 45, 58, 74],
      [15, 28, 40, 52, 68],
      [30, 42, 55, 67, 85],
    ],
    candlestickCategories: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'],
    candlestickData: [
      [100, 118, 95, 124],
      [118, 112, 108, 126],
      [112, 130, 110, 135],
      [130, 125, 120, 138],
      [125, 142, 122, 148],
    ],
    heatmapX: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
    heatmapY: ['Pagi', 'Siang', 'Sore', 'Malam'],
    heatmapData: [
      [0, 0, 15], [1, 0, 28], [2, 0, 42], [3, 0, 35], [4, 0, 50], [5, 0, 20],
      [0, 1, 45], [1, 1, 68], [2, 1, 82], [3, 1, 74], [4, 1, 90], [5, 1, 40],
      [0, 2, 60], [1, 2, 75], [2, 2, 55], [3, 2, 88], [4, 2, 72], [5, 2, 65],
      [0, 3, 25], [1, 3, 30], [2, 3, 48], [3, 3, 40], [4, 3, 62], [5, 3, 85],
    ],
    mapData: [
      { name: 'Sumatra', value: 78 },
      { name: 'Jawa', value: 96 },
      { name: 'Kalimantan', value: 54 },
      { name: 'Sulawesi', value: 63 },
      { name: 'Bali & Nusa Tenggara', value: 72 },
      { name: 'Maluku', value: 38 },
      { name: 'Papua', value: 45 },
    ],
    parallelAxes: ['Harga', 'Performa', 'Baterai', 'Kamera', 'Desain'],
    parallelData: [
      [80, 92, 85, 88, 90],
      [65, 78, 90, 72, 82],
      [90, 86, 70, 95, 88],
      [55, 68, 82, 65, 74],
      [75, 84, 78, 80, 86],
    ],
    linesData: [
      { fromName: 'Jawa', toName: 'Sumatra', coords: [[110, -7.2], [101.5, 0.5]], value: 85 },
      { fromName: 'Jawa', toName: 'Kalimantan', coords: [[110, -7.2], [114.5, 0.2]], value: 64 },
      { fromName: 'Jawa', toName: 'Sulawesi', coords: [[110, -7.2], [120.5, -2.0]], value: 72 },
      { fromName: 'Jawa', toName: 'Papua', coords: [[110, -7.2], [137.5, -4.0]], value: 48 },
    ],
    graphNodes: [
      { name: 'Inti', value: 40, symbolSize: 42, x: 200, y: 150 },
      { name: 'Data', value: 28, symbolSize: 30, x: 90, y: 90 },
      { name: 'Desain', value: 30, symbolSize: 32, x: 310, y: 90 },
      { name: 'API', value: 24, symbolSize: 28, x: 100, y: 220 },
      { name: 'Export', value: 26, symbolSize: 28, x: 300, y: 220 },
    ],
    graphLinks: [
      { source: 'Inti', target: 'Data', value: 10 },
      { source: 'Inti', target: 'Desain', value: 12 },
      { source: 'Inti', target: 'API', value: 8 },
      { source: 'Inti', target: 'Export', value: 9 },
      { source: 'Data', target: 'API', value: 6 },
      { source: 'Desain', target: 'Export', value: 7 },
    ],
    sankeyNodes: [
      { name: 'Organik' },
      { name: 'Iklan' },
      { name: 'Sosial' },
      { name: 'Kunjungan' },
      { name: 'Daftar' },
      { name: 'Beli' },
    ],
    sankeyLinks: [
      { source: 'Organik', target: 'Kunjungan', value: 50 },
      { source: 'Iklan', target: 'Kunjungan', value: 35 },
      { source: 'Sosial', target: 'Kunjungan', value: 25 },
      { source: 'Kunjungan', target: 'Daftar', value: 65 },
      { source: 'Daftar', target: 'Beli', value: 42 },
    ],
    gaugeValue: 74,
    gaugeName: 'Skor KPI',
    themeRiverData: [
      ['2026/01/01', 20, 'Web'], ['2026/02/01', 32, 'Web'], ['2026/03/01', 45, 'Web'], ['2026/04/01', 38, 'Web'], ['2026/05/01', 55, 'Web'],
      ['2026/01/01', 15, 'Mobile'], ['2026/02/01', 28, 'Mobile'], ['2026/03/01', 35, 'Mobile'], ['2026/04/01', 52, 'Mobile'], ['2026/05/01', 64, 'Mobile'],
      ['2026/01/01', 12, 'Desktop'], ['2026/02/01', 18, 'Desktop'], ['2026/03/01', 24, 'Desktop'], ['2026/04/01', 22, 'Desktop'], ['2026/05/01', 30, 'Desktop'],
    ],
    customCategories: ['CPU', 'Entertainment', 'Productivity', 'Games'],
    customItems: [
      { categoryIndex: 0, start: 0, end: 52, label: '3h 46m' },
      { categoryIndex: 1, start: 0, end: 84, label: '6h 37m' },
      { categoryIndex: 2, start: 0, end: 28, label: '1h 45m' },
      { categoryIndex: 3, start: 0, end: 48, label: '3h 24m' },
    ],
  };
}

export function createBaseChartConfig(
  chartType: EChartsSeriesType = 'bar',
  presetId: string = 'bar'
): ChartConfig {
  const palette = CHART_PALETTES[0];
  const baseFont: ChartFontStyle = {
    family: 'Geovanta Sans',
    size: 12,
    weight: 'normal',
    style: 'normal',
    color: '#64748b',
  };
  return {
    chartType,
    presetId,
    width: 600,
    height: 420,
    backgroundColor: '#ffffff',
    transparentBg: true,
    borderColor: '#eef2f6',
    borderWidth: 0,
    borderRadius: 0,
    paletteId: palette.id,
    colors: [...palette.colors],
    useGradient: false,
    gradientDirection: 'vertical',
    card: {
      show: true,
      backgroundColor: '#ffffff',
      borderColor: '#eef2f6',
      borderWidth: 1,
      borderRadius: 20,
    },
    kpi: {
      show: false,
      value: '$23.700',
      delta: '↗ 50% from last week',
      deltaTone: 'positive',
      caption: 'Completion rate',
    },
    periodPills: {
      show: false,
      items: ['Monthly', 'Yearly'],
      activeIndex: 0,
    },
    footnote: {
      show: false,
      text: 'Source: Geovanta Analytics',
      align: 'left',
    },
    typography: {
      global: { ...baseFont },
      title: { ...baseFont, size: 16, weight: '600', color: '#111827' },
      subtitle: { ...baseFont, size: 12, color: '#94a3b8' },
      axisLabel: { ...baseFont, size: 11, color: '#94a3b8' },
      axisName: { ...baseFont, size: 11, weight: '500', color: '#64748b' },
      dataLabel: { ...baseFont, size: 11, weight: '600', color: '#1e293b' },
      legend: { ...baseFont, size: 12, color: '#64748b' },
    },
    title: {
      show: true,
      text: 'Total revenue',
      subtext: '',
      left: 'left',
      top: 20,
      itemGap: 4,
    },
    legend: {
      show: true,
      orient: 'horizontal',
      position: 'bottom',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 16,
    },
    grid: {
      top: 72,
      right: 28,
      bottom: 56,
      left: 52,
      containLabel: true,
      showBorder: false,
      borderColor: '#eef2f6',
    },
    xAxis: {
      show: true,
      name: '',
      inverse: false,
      axisLine: false,
      axisTick: false,
      splitLine: false,
      splitLineType: 'dashed',
      splitLineColor: '#f1f5f9',
      splitArea: false,
      labelRotate: 0,
      min: '',
      max: '',
      valuePrefix: '',
      valueSuffix: '',
    },
    yAxis: {
      show: true,
      name: '',
      inverse: false,
      axisLine: false,
      axisTick: false,
      splitLine: true,
      splitLineType: 'dashed',
      splitLineColor: '#f1f5f9',
      splitArea: false,
      labelRotate: 0,
      min: '',
      max: '',
      valuePrefix: '',
      valueSuffix: '',
    },
    seriesStyle: {
      smooth: true,
      areaFill: false,
      areaOpacity: 0.22,
      lineWidth: 2.5,
      lineType: 'solid',
      step: false,
      showSymbol: false,
      symbol: 'circle',
      symbolSize: 8,
      stack: false,
      horizontal: false,
      polar: false,
      barWidth: 12,
      barBorderRadius: 99,
      showBarBackground: false,
      pieInnerRadius: 48,
      pieOuterRadius: 74,
      pieRoseType: false,
      piePadAngle: 4,
      pieCornerRadius: 8,
      pieStartAngle: 90,
      pieHalf: false,
      gaugeMin: 0,
      gaugeMax: 100,
      gaugeStartAngle: 225,
      gaugeEndAngle: -45,
      gaugeProgress: true,
      gaugeAxisWidth: 14,
      gaugePointer: true,
      gaugeSplitNumber: 5,
      radarShape: 'polygon',
      radarSplitNumber: 4,
      radarAreaOpacity: 0.24,
      funnelSort: 'descending',
      sankeyNodeWidth: 18,
      sankeyNodeGap: 10,
      sankeyCurveness: 0.5,
      graphLayout: 'none',
      treeOrient: 'LR',
      heatmapCalendar: false,
      mapName: 'indonesia',
      pictorialSymbol: 'roundRect',
      pictorialRepeat: true,
      opacity: 1,
    },
    dataLabel: {
      show: false,
      pillBadge: false,
      position: 'top',
      formatter: '',
      distance: 6,
      rotate: 0,
    },
    annotations: {
      markPointMax: false,
      markPointMin: false,
      markLineAvg: false,
      markLineAvgLabel: 'avg',
      markLineTarget: '',
      markLineTargetLabel: 'Target',
      markLineColor: '#6C5CE7',
      markAreaFrom: '',
      markAreaTo: '',
    },
    visualMap: {
      show: false,
      min: 0,
      max: 100,
      orient: 'horizontal',
      colors: ['#ede9fe', '#a78bfa', '#6c5ce7'],
    },
    data: createDefaultDataPayload(),
    customOptionJson: '',
  };
}
