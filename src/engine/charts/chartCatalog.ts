/**
 * @file src/engine/charts/chartCatalog.ts
 * @description Katalog lengkap 22 tipe seri Apache ECharts + preset variasi populer (Fintech SaaS Default)
 */
import {
  EChartsSeriesType,
  ChartDataKind,
  ChartConfig,
  createBaseChartConfig,
  applyChartTheme,
} from './chartTypes.ts';

export type ChartCategoryId =
  | 'all'
  | 'basic'
  | 'statistical'
  | 'hierarchical'
  | 'relational'
  | 'geo'
  | 'specialized';

export interface ChartCatalogItem {
  id: string;
  chartType: EChartsSeriesType;
  category: Exclude<ChartCategoryId, 'all'>;
  dataKind: ChartDataKind;
  labelId: string;
  labelEn: string;
  descId: string;
  descEn: string;
  iconPath: string;
  applyPreset?: (cfg: ChartConfig) => void;
}

export const CHART_CATEGORIES: Array<{ id: ChartCategoryId; labelId: string; labelEn: string }> = [
  { id: 'all', labelId: 'Semua', labelEn: 'All' },
  { id: 'basic', labelId: 'Dasar', labelEn: 'Basic' },
  { id: 'statistical', labelId: 'Statistik', labelEn: 'Statistical' },
  { id: 'hierarchical', labelId: 'Hierarki', labelEn: 'Hierarchical' },
  { id: 'relational', labelId: 'Relasi & Alur', labelEn: 'Relational' },
  { id: 'geo', labelId: 'Peta & Rute', labelEn: 'Geo & Map' },
  { id: 'specialized', labelId: 'Khusus', labelEn: 'Specialized' },
];

export const DATA_KIND_BY_TYPE: Record<EChartsSeriesType, ChartDataKind> = {
  line: 'tabular',
  bar: 'tabular',
  pictorialBar: 'tabular',
  pie: 'pie',
  funnel: 'pie',
  scatter: 'scatter',
  effectScatter: 'scatter',
  radar: 'radar',
  tree: 'hierarchy',
  treemap: 'hierarchy',
  sunburst: 'hierarchy',
  boxplot: 'boxplot',
  candlestick: 'candlestick',
  heatmap: 'heatmap',
  map: 'map',
  parallel: 'parallel',
  lines: 'lines',
  graph: 'graph',
  sankey: 'sankey',
  gauge: 'gauge',
  themeRiver: 'themeRiver',
  custom: 'custom',
};

export const CHART_CATALOG: ChartCatalogItem[] = [
  // === BASIC ===
  {
    id: 'bar',
    chartType: 'bar',
    category: 'basic',
    dataKind: 'tabular',
    labelId: 'Batang (Bar)',
    labelEn: 'Bar Chart',
    descId: 'Batang kapsul modern dengan perbandingan Projection vs Actual',
    descEn: 'Modern pill-rounded comparison bars',
    iconPath: 'M4 20h16 M6 17v-6h3v6 M10.5 17V7h3v10 M15 17v-9h3v9',
    applyPreset: cfg => {
      cfg.title.text = 'Total revenue';
      cfg.colors = ['#A5B4FC', '#6366F1', '#0F172A', '#10B981', '#EC4899'];
      cfg.seriesStyle.barWidth = 16;
      cfg.seriesStyle.barBorderRadius = 8;
      cfg.yAxis.valuePrefix = '$';
      cfg.yAxis.valueSuffix = 'k';
      cfg.periodPills.show = true;
    },
  },
  {
    id: 'bar-horizontal',
    chartType: 'bar',
    category: 'basic',
    dataKind: 'tabular',
    labelId: 'Batang Horizontal',
    labelEn: 'Horizontal Bar',
    descId: 'Batang kapsul mendatar dengan track latar halus',
    descEn: 'Horizontal pill bars with soft background track',
    iconPath: 'M4 4v16 M4 6h12v3H4 M4 10.5h15v3H4 M4 15h9v3H4',
    applyPreset: cfg => {
      cfg.seriesStyle.horizontal = true;
      cfg.seriesStyle.barWidth = 12;
      cfg.seriesStyle.barBorderRadius = 99;
      cfg.seriesStyle.showBarBackground = true;
      cfg.title.text = 'Conversion rate';
    },
  },
  {
    id: 'bar-stacked',
    chartType: 'bar',
    category: 'basic',
    dataKind: 'tabular',
    labelId: 'Batang Bertumpuk',
    labelEn: 'Stacked Bar',
    descId: 'Batang kapsul bertumpuk dengan KPI hero & badge persentase',
    descEn: 'Stacked pill bars with KPI hero & trend badge',
    iconPath: 'M4 20h16 M6 17v-5h3v5 M6 12V8h3v4 M11 17v-7h3v7 M11 10V5h3v5 M16 17v-4h3v4 M16 13V9h3v4',
    applyPreset: cfg => {
      cfg.seriesStyle.stack = true;
      cfg.seriesStyle.barWidth = 18;
      cfg.seriesStyle.barBorderRadius = 99;
      cfg.colors = ['#1E1E24', '#6C5CE7', '#C8C2FA'];
      cfg.title.text = 'Conversion rate';
      cfg.title.subtext = 'Apr 30 – May 30';
      cfg.kpi = {
        show: true,
        value: '3.42%',
        delta: '+17.58%',
        deltaTone: 'positive',
        caption: 'Completion rate',
      };
    },
  },
  {
    id: 'bar-polar',
    chartType: 'bar',
    category: 'basic',
    dataKind: 'tabular',
    labelId: 'Batang Polar',
    labelEn: 'Polar Bar',
    descId: 'Diagram batang melingkar pada koordinat polar',
    descEn: 'Circular bar chart on polar coordinates',
    iconPath: 'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0 M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M12 4v8l6 3',
    applyPreset: cfg => {
      cfg.seriesStyle.polar = true;
      cfg.title.text = 'Polar distribution';
    },
  },
  {
    id: 'line',
    chartType: 'line',
    category: 'basic',
    dataKind: 'tabular',
    labelId: 'Garis (Line)',
    labelEn: 'Line Chart',
    descId: 'Tren garis bersih dengan titik & grid halus',
    descEn: 'Clean trend line chart with subtle dashed grid',
    iconPath: 'M4 20h16 M4 16l5-6 4 3 7-8',
    applyPreset: cfg => {
      cfg.seriesStyle.smooth = false;
      cfg.seriesStyle.areaFill = false;
      cfg.seriesStyle.showSymbol = true;
      cfg.seriesStyle.symbolSize = 6;
      cfg.title.text = 'Total revenue';
    },
  },
  {
    id: 'line-smooth-area',
    chartType: 'line',
    category: 'basic',
    dataKind: 'tabular',
    labelId: 'Area Halus',
    labelEn: 'Smooth Area',
    descId: 'Kurva halus dengan gradien area & KPI hero',
    descEn: 'Smooth curve with soft gradient fill & KPI hero',
    iconPath: 'M4 20h16 M4 16C7 9 10 14 14 9s4-2 6-4v15H4z',
    applyPreset: cfg => {
      cfg.colors = ['#10B981', '#6366F1', '#F59E0B'];
      cfg.seriesStyle.smooth = true;
      cfg.seriesStyle.areaFill = true;
      cfg.seriesStyle.areaOpacity = 0.28;
      cfg.seriesStyle.showSymbol = false;
      cfg.yAxis.valuePrefix = '$';
      cfg.yAxis.valueSuffix = 'k';
      cfg.periodPills.show = false;
      cfg.title.text = 'Total revenue';
      cfg.kpi = {
        show: true,
        value: '$12.100',
        delta: '↗ 50% from last week',
        deltaTone: 'positive',
        caption: '',
      };
    },
  },
  {
    id: 'pie',
    chartType: 'pie',
    category: 'basic',
    dataKind: 'pie',
    labelId: 'Lingkaran (Pie)',
    labelEn: 'Pie Chart',
    descId: 'Proporsi bagian dengan label persentase kapsul',
    descEn: 'Part-to-whole proportion slices with pill callouts',
    iconPath: 'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0 M12 12V4 M12 12l6 5',
    applyPreset: cfg => {
      cfg.colors = ['#6C5CE7', '#FF922B', '#EC4899', '#10B981', '#38BDF8'];
      cfg.seriesStyle.pieInnerRadius = 0;
      cfg.seriesStyle.pieOuterRadius = 70;
      cfg.seriesStyle.pieRoseType = false;
      cfg.seriesStyle.piePadAngle = 2;
      cfg.dataLabel.show = true;
      cfg.dataLabel.pillBadge = true;
      cfg.title.text = 'Order status';
    },
  },
  {
    id: 'pie-donut',
    chartType: 'pie',
    category: 'basic',
    dataKind: 'pie',
    labelId: 'Donat (Donut)',
    labelEn: 'Donut Chart',
    descId: 'Cincin modern dengan sudut bulat & callout persentase',
    descEn: 'Modern rounded donut with pill percentage badges',
    iconPath: 'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0 M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
    applyPreset: cfg => {
      cfg.colors = ['#6366F1', '#F59E0B', '#EC4899', '#10B981', '#06B6D4'];
      cfg.seriesStyle.pieInnerRadius = 52;
      cfg.seriesStyle.pieOuterRadius = 74;
      cfg.seriesStyle.piePadAngle = 3;
      cfg.seriesStyle.pieCornerRadius = 8;
      cfg.seriesStyle.showDonutCenter = true;
      cfg.seriesStyle.donutCenterLabel = 'Total';
      cfg.periodPills.show = false;
      cfg.dataLabel.show = true;
      cfg.dataLabel.pillBadge = true;
      cfg.title.text = 'Order status';
    },
  },
  {
    id: 'pie-rose',
    chartType: 'pie',
    category: 'basic',
    dataKind: 'pie',
    labelId: 'Mawar Nightingale',
    labelEn: 'Nightingale Rose',
    descId: 'Diagram polar dengan radius sesuai nilai',
    descEn: 'Rose diagram with value-proportional radius',
    iconPath: 'M12 12V4a8 8 0 0 1 7 4z M12 12l6 4a7 7 0 0 1-6 4z M12 12l-5 3a6 6 0 0 1 0-6z',
    applyPreset: cfg => {
      cfg.colors = ['#6C5CE7', '#FF922B', '#EC4899', '#10B981', '#38BDF8'];
      cfg.seriesStyle.pieInnerRadius = 16;
      cfg.seriesStyle.pieOuterRadius = 74;
      cfg.seriesStyle.pieRoseType = 'area';
      cfg.seriesStyle.piePadAngle = 0; // ECharts 6 SSR requirement for roseType
      cfg.seriesStyle.pieCornerRadius = 6;
      cfg.dataLabel.show = true;
      cfg.dataLabel.pillBadge = true;
      cfg.title.text = 'Channel mix';
    },
  },

  // === STATISTICAL ===
  {
    id: 'scatter',
    chartType: 'scatter',
    category: 'statistical',
    dataKind: 'scatter',
    labelId: 'Sebar (Scatter)',
    labelEn: 'Scatter Plot',
    descId: 'Sebaran titik dua variabel X dan Y',
    descEn: 'Two-variable X/Y point distribution',
    iconPath: 'M4 20h16 M4 4v16 M8 14a1.5 1.5 0 1 0 0.01 0 M12 9a1.5 1.5 0 1 0 0.01 0 M16 12a1.5 1.5 0 1 0 0.01 0 M18 6a1.5 1.5 0 1 0 0.01 0',
    applyPreset: cfg => {
      cfg.seriesStyle.symbolSize = 14;
      cfg.title.text = 'Scatter distribution';
    },
  },
  {
    id: 'effectScatter',
    chartType: 'effectScatter',
    category: 'statistical',
    dataKind: 'scatter',
    labelId: 'Sebar Efek (EffectScatter)',
    labelEn: 'Effect Scatter',
    descId: 'Titik sebar dengan cincin sorotan halus',
    descEn: 'Scatter plot with clean highlight ring',
    iconPath: 'M4 20h16 M4 4v16 M10 13a2 2 0 1 0 0.01 0 M10 13m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M16 7a1.5 1.5 0 1 0 0.01 0',
    applyPreset: cfg => {
      cfg.seriesStyle.symbolSize = 14;
      cfg.title.text = 'Highlight scatter';
    },
  },
  {
    id: 'radar',
    chartType: 'radar',
    category: 'statistical',
    dataKind: 'radar',
    labelId: 'Radar',
    labelEn: 'Radar Chart',
    descId: 'Perbandingan multivariabel pada sumbu radial',
    descEn: 'Multi-variable comparison on radial axes',
    iconPath: 'M12 3l7 5-3 9H8L5 8z M12 7l4 3-1.5 5h-5L8 10z',
    applyPreset: cfg => {
      cfg.title.text = 'Performance radar';
    },
  },
  {
    id: 'boxplot',
    chartType: 'boxplot',
    category: 'statistical',
    dataKind: 'boxplot',
    labelId: 'Kotak & Kumis (Boxplot)',
    labelEn: 'Boxplot',
    descId: 'Distribusi kuartil, median, minimum, dan maksimum',
    descEn: 'Quartile, median, min, and max distribution',
    iconPath: 'M7 5h4 M9 5v3 M7 8h4v6H7z M7 11h4 M9 14v5 M7 19h4 M15 7h4 M17 7v2 M15 9h4v7h-4z M17 16v3',
    applyPreset: cfg => {
      cfg.title.text = 'Quartile boxplot';
    },
  },
  {
    id: 'candlestick',
    chartType: 'candlestick',
    category: 'statistical',
    dataKind: 'candlestick',
    labelId: 'Lilin Saham (Candlestick)',
    labelEn: 'Candlestick',
    descId: 'Data OHLC (Open, High, Low, Close) finansial',
    descEn: 'Financial OHLC candlestick chart',
    iconPath: 'M7 4v16 M5.5 8h3v7h-3z M13 6v12 M11.5 9h3v5h-3z M18 3v15 M16.5 7h3v8h-3z',
    applyPreset: cfg => {
      cfg.title.text = 'Market OHLC';
    },
  },
  {
    id: 'heatmap',
    chartType: 'heatmap',
    category: 'statistical',
    dataKind: 'heatmap',
    labelId: 'Peta Panas (Heatmap)',
    labelEn: 'Heatmap',
    descId: 'Matriks intensitas nilai berbasis gradasi warna',
    descEn: 'Color-coded intensity matrix',
    iconPath: 'M4 4h4v4H4z M10 4h4v4h-4z M16 4h4v4h-4z M4 10h4v4H4z M10 10h4v4h-4z M16 10h4v4h-4z M4 16h4v4H4z M10 16h4v4h-4z',
    applyPreset: cfg => {
      cfg.visualMap.show = true;
      cfg.visualMap.min = 0;
      cfg.visualMap.max = 100;
      cfg.visualMap.colors = ['#ede9fe', '#a78bfa', '#6C5CE7'];
      cfg.title.text = 'Activity heatmap';
    },
  },
  {
    id: 'parallel',
    chartType: 'parallel',
    category: 'statistical',
    dataKind: 'parallel',
    labelId: 'Koordinat Paralel',
    labelEn: 'Parallel Coordinates',
    descId: 'Analisis data multidimensi lintas sumbu sejajar',
    descEn: 'Multi-dimensional analysis across parallel axes',
    iconPath: 'M5 4v16 M12 4v16 M19 4v16 M5 14l7-6 7 4 M5 8l7 8 7-9',
    applyPreset: cfg => {
      cfg.title.text = 'Parallel metrics';
    },
  },

  // === HIERARCHICAL ===
  {
    id: 'tree',
    chartType: 'tree',
    category: 'hierarchical',
    dataKind: 'hierarchy',
    labelId: 'Pohon (Tree)',
    labelEn: 'Tree Diagram',
    descId: 'Struktur hierarki bercabang dari akar ke daun',
    descEn: 'Branching hierarchy from root to leaves',
    iconPath: 'M4 12h5 M9 12c2 0 2-6 5-6h4 M9 12c2 0 2 6 5 6h4 M4 12a1.5 1.5 0 1 0 0.01 0',
    applyPreset: cfg => {
      cfg.seriesStyle.treeOrient = 'LR';
      cfg.title.text = 'Organization tree';
    },
  },
  {
    id: 'tree-radial',
    chartType: 'tree',
    category: 'hierarchical',
    dataKind: 'hierarchy',
    labelId: 'Pohon Radial',
    labelEn: 'Radial Tree',
    descId: 'Hierarki pohon memancar dari pusat',
    descEn: 'Hierarchy radiating outward from center',
    iconPath: 'M12 12L6 6 M12 12L18 6 M12 12L6 18 M12 12L18 18 M12 12a2 2 0 1 0 0.01 0',
    applyPreset: cfg => {
      cfg.seriesStyle.treeOrient = 'radial';
      cfg.title.text = 'Radial tree';
    },
  },
  {
    id: 'treemap',
    chartType: 'treemap',
    category: 'hierarchical',
    dataKind: 'hierarchy',
    labelId: 'Treemap',
    labelEn: 'Treemap',
    descId: 'Hierarki proporsional berbasis kotak bersarang',
    descEn: 'Proportional nested rectangle hierarchy',
    iconPath: 'M3 4h18v16H3z M12 4v16 M12 12h9 M3 13h9',
    applyPreset: cfg => {
      cfg.title.text = 'Budget allocation';
    },
  },
  {
    id: 'sunburst',
    chartType: 'sunburst',
    category: 'hierarchical',
    dataKind: 'hierarchy',
    labelId: 'Sunburst',
    labelEn: 'Sunburst',
    descId: 'Hierarki bertingkat dalam cincin konsentris',
    descEn: 'Multi-level hierarchy in concentric rings',
    iconPath: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M12 12m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0 M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0',
    applyPreset: cfg => {
      cfg.title.text = 'Sunburst breakdown';
    },
  },

  // === RELATIONAL ===
  {
    id: 'graph',
    chartType: 'graph',
    category: 'relational',
    dataKind: 'graph',
    labelId: 'Graf Jaringan (Graph)',
    labelEn: 'Network Graph',
    descId: 'Simpul dan tautan relasi antar entitas',
    descEn: 'Nodes and edges showing entity relationships',
    iconPath: 'M6 7l12 2-5 9z M6 7a2 2 0 1 0 0.01 0 M18 9a2 2 0 1 0 0.01 0 M13 18a2 2 0 1 0 0.01 0',
    applyPreset: cfg => {
      cfg.seriesStyle.graphLayout = 'none';
      cfg.title.text = 'System network';
    },
  },
  {
    id: 'sankey',
    chartType: 'sankey',
    category: 'relational',
    dataKind: 'sankey',
    labelId: 'Diagram Sankey',
    labelEn: 'Sankey Diagram',
    descId: 'Aliran kuantitas dari sumber ke tujuan',
    descEn: 'Flow quantities from source to target nodes',
    iconPath: 'M4 5h3v6H4z M4 14h3v5H4z M17 8h3v9h-3z M7 7c5 0 5 3 10 3 M7 16c5 0 5-2 10-2',
    applyPreset: cfg => {
      cfg.title.text = 'Conversion flow';
    },
  },
  {
    id: 'funnel',
    chartType: 'funnel',
    category: 'relational',
    dataKind: 'pie',
    labelId: 'Corong (Funnel)',
    labelEn: 'Funnel Chart',
    descId: 'Tahapan konversi yang menyempit bertahap',
    descEn: 'Sequential conversion funnel stages',
    iconPath: 'M4 5h16l-3 4H7z M7 10.5h10l-2.5 4H9.5z M9.5 16h5l-1.5 3h-2z',
    applyPreset: cfg => {
      cfg.dataLabel.show = true;
      cfg.dataLabel.position = 'inside';
      cfg.title.text = 'Sales funnel';
    },
  },

  // === GEO & MAP ===
  {
    id: 'map',
    chartType: 'map',
    category: 'geo',
    dataKind: 'map',
    labelId: 'Peta Choropleth (Map)',
    labelEn: 'Geo Map',
    descId: 'Peta wilayah dengan pewarnaan nilai (Indonesia / Dunia / GeoJSON)',
    descEn: 'Choropleth region map (Indonesia / World / custom GeoJSON)',
    iconPath: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z M9 4v14 M15 6v14',
    applyPreset: cfg => {
      cfg.seriesStyle.mapName = 'indonesia';
      cfg.visualMap.show = true;
      cfg.visualMap.min = 20;
      cfg.visualMap.max = 100;
      cfg.visualMap.colors = ['#ede9fe', '#a78bfa', '#6C5CE7'];
      cfg.title.text = 'Regional revenue';
    },
  },
  {
    id: 'lines',
    chartType: 'lines',
    category: 'geo',
    dataKind: 'lines',
    labelId: 'Garis Rute (Lines)',
    labelEn: 'Flow Lines',
    descId: 'Rute aliran & koneksi antar titik koordinat',
    descEn: 'Origin-destination flow lines across map',
    iconPath: 'M4 18C8 8 14 6 20 8 M4 18a2 2 0 1 0 0.01 0 M20 8a2 2 0 1 0 0.01 0',
    applyPreset: cfg => {
      cfg.seriesStyle.mapName = 'indonesia';
      cfg.title.text = 'Logistics routes';
    },
  },

  // === SPECIALIZED ===
  {
    id: 'gauge',
    chartType: 'gauge',
    category: 'specialized',
    dataKind: 'gauge',
    labelId: 'Pengukur (Gauge)',
    labelEn: 'Gauge Meter',
    descId: 'Indikator progres & KPI berbentuk dial',
    descEn: 'Dial KPI and progress indicator',
    iconPath: 'M5 17a8 8 0 1 1 14 0 M12 13l4-4 M12 13a1.5 1.5 0 1 0 0.01 0',
    applyPreset: cfg => {
      cfg.title.text = 'KPI score';
    },
  },
  {
    id: 'pictorialBar',
    chartType: 'pictorialBar',
    category: 'specialized',
    dataKind: 'tabular',
    labelId: 'Batang Piktorial',
    labelEn: 'Pictorial Bar',
    descId: 'Batang yang tersusun dari ikon/simbol berulang',
    descEn: 'Bars composed of repeated geometric symbols',
    iconPath: 'M6 17h3v2H6z M6 13h3v2H6z M6 9h3v2H6z M11 17h3v2h-3z M11 13h3v2h-3z M16 17h3v2h-3z M16 13h3v2h-3z M16 9h3v2h-3z M16 5h3v2h-3z',
    applyPreset: cfg => {
      cfg.title.text = 'Pictorial units';
    },
  },
  {
    id: 'themeRiver',
    chartType: 'themeRiver',
    category: 'specialized',
    dataKind: 'themeRiver',
    labelId: 'Sungai Tema (ThemeRiver)',
    labelEn: 'ThemeRiver',
    descId: 'Aliran perubahan beberapa topik sepanjang waktu',
    descEn: 'Streamgraph of topic volumes over time',
    iconPath: 'M3 10c4-4 7 2 11-2s4 1 7-1v8c-3 2-5-1-7 1s-7 2-11-2z',
    applyPreset: cfg => {
      cfg.title.text = 'Traffic stream';
    },
  },
  {
    id: 'custom',
    chartType: 'custom',
    category: 'specialized',
    dataKind: 'custom',
    labelId: 'Kustom (Custom Gantt)',
    labelEn: 'Custom Series',
    descId: 'Seri render kustom (durasi / jadwal Gantt kapsul)',
    descEn: 'Custom vector renderItem (pill duration / Gantt bars)',
    iconPath: 'M4 5v14 M4 19h16 M7 7h6v2.5H7z M10 11.5h7V14h-7z M13 15.5h5V18h-5z',
    applyPreset: cfg => {
      cfg.title.text = 'Usage duration';
      cfg.seriesStyle.barBorderRadius = 99;
    },
  },
];

export function getCatalogItem(chartType: EChartsSeriesType, presetId?: string): ChartCatalogItem {
  if (presetId) {
    const exact = CHART_CATALOG.find(c => c.id === presetId);
    if (exact) return exact;
  }
  return CHART_CATALOG.find(c => c.chartType === chartType) || CHART_CATALOG[0];
}

export function createChartConfigForType(chartType: EChartsSeriesType, presetId?: string): ChartConfig {
  const item = getCatalogItem(chartType, presetId);
  const cfg = createBaseChartConfig(item.chartType, item.id);
  if (item.applyPreset) item.applyPreset(cfg);
  return cfg;
}

export function convertChartConfigType(
  prev: ChartConfig,
  nextChartType: EChartsSeriesType,
  nextPresetId?: string,
  opts?: { preserveVisuals?: boolean }
): ChartConfig {
  const item = getCatalogItem(nextChartType, nextPresetId);
  const fresh = createChartConfigForType(item.chartType, item.id);
  const preserveVisuals = !!opts?.preserveVisuals;

  // Keep user-edited title only if it differs from default catalog titles
  const prevTitle = (prev.title?.text || '').trim();
  const knownDefaultTitles = new Set(
    CHART_CATALOG.map(c => {
      const tmp = createBaseChartConfig(c.chartType, c.id);
      if (c.applyPreset) c.applyPreset(tmp);
      return tmp.title.text;
    })
  );
  const keepTitle = prevTitle && !knownDefaultTitles.has(prevTitle);

  let next: ChartConfig = {
    ...fresh,
    width: prev.width,
    height: prev.height,
    themeId: prev.themeId || 'saas-light',
    backgroundColor: prev.backgroundColor,
    transparentBg: prev.transparentBg,
    borderColor: prev.borderColor,
    borderWidth: prev.borderWidth,
    borderRadius: prev.borderRadius,
    card: { ...prev.card },
    footnote: { ...prev.footnote },
    typography: JSON.parse(JSON.stringify(prev.typography)),
    title: {
      ...fresh.title,
      show: prev.title.show,
      left: prev.title.left,
      text: keepTitle ? prev.title.text : fresh.title.text,
      subtext: keepTitle ? prev.title.subtext : fresh.title.subtext,
    },
    legend: {
      ...prev.legend,
      show: fresh.legend.show,
    },
    data: JSON.parse(JSON.stringify(prev.data)),
    customOptionJson: prev.customOptionJson,
  };

  if (preserveVisuals) {
    next.paletteId = prev.paletteId;
    next.colors = [...prev.colors];
    next.useGradient = prev.useGradient;
    next.gradientDirection = prev.gradientDirection;
    next.kpi = { ...prev.kpi };
    next.periodPills = { ...prev.periodPills };
  } else if (prev.themeId && prev.themeId !== 'saas-light') {
    next = applyChartTheme(next, prev.themeId);
  }

  return next;
}
