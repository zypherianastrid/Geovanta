/**
 * @file src/engine/charts/chartStyles.ts
 * @description 25 Style Chart struktural yang berbeda (geometri, kartu, grid, sumbu, marker, tipografi, & ornamentasi) — BUKAN sekadar warna/palet.
 */
import { ChartConfig } from './chartTypes.ts';

export type ChartStyleCategoryId =
  | 'all'
  | 'modern'
  | 'minimal'
  | 'technical'
  | 'editorial'
  | 'creative';

export type ChartStyleId =
  | 'saas-clean'
  | 'pill-capsule'
  | 'dashboard-kpi'
  | 'glass-soft'
  | 'stripe-rail'
  | 'swiss-minimal'
  | 'tufte-data-ink'
  | 'compact-spark'
  | 'ring-architect'
  | 'lollipop-dot'
  | 'technical-blueprint'
  | 'step-digital'
  | 'scientific-paper'
  | 'analytics-pro'
  | 'banded-zebra'
  | 'executive-report'
  | 'editorial-serif'
  | 'framed-retro'
  | 'stacked-metric'
  | 'presentation-clean'
  | 'neo-brutalist'
  | 'wireframe-outline'
  | 'bold-poster'
  | 'dotted-studio'
  | 'infographic-badge';

export interface ChartStylePreset {
  id: ChartStyleId;
  category: Exclude<ChartStyleCategoryId, 'all'>;
  labelId: string;
  labelEn: string;
  descId: string;
  descEn: string;
  iconPath: string;
  apply: (cfg: ChartConfig) => void;
}

export const CHART_STYLE_CATEGORIES: Array<{
  id: ChartStyleCategoryId;
  labelId: string;
  labelEn: string;
}> = [
  { id: 'all', labelId: 'Semua', labelEn: 'All' },
  { id: 'modern', labelId: 'Modern', labelEn: 'Modern' },
  { id: 'minimal', labelId: 'Minimal', labelEn: 'Minimal' },
  { id: 'technical', labelId: 'Teknis', labelEn: 'Technical' },
  { id: 'editorial', labelId: 'Editorial', labelEn: 'Editorial' },
  { id: 'creative', labelId: 'Kreatif', labelEn: 'Creative' },
];

export const CHART_STYLES: ChartStylePreset[] = [
  // === 1-5: MODERN ===
  {
    id: 'saas-clean',
    category: 'modern',
    labelId: 'SaaS Clean',
    labelEn: 'SaaS Clean',
    descId: 'Kartu bulat halus, batang rounded-top, grid putus-putus',
    descEn: 'Soft rounded card, top-rounded bars, dashed grid',
    iconPath: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M8 16v-5 M12 16V8 M16 16v-3',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 20;
      cfg.card.borderWidth = 1;
      cfg.card.shadow = 'soft';
      cfg.seriesStyle.barWidth = 16;
      cfg.seriesStyle.barBorderRadius = 8;
      cfg.seriesStyle.smooth = true;
      cfg.yAxis.splitLine = true;
      cfg.yAxis.splitLineType = 'dashed';
      cfg.legend.show = true;
      cfg.legend.position = 'bottom';
      cfg.legend.icon = 'circle';
    },
  },
  {
    id: 'pill-capsule',
    category: 'modern',
    labelId: 'Kapsul Pil',
    labelEn: 'Pill Capsule',
    descId: 'Batang kapsul penuh, track latar, pil periode & badge',
    descEn: 'Full pill bars, rail track, period pills & rounded badges',
    iconPath: 'M6 17V9a2 2 0 0 1 4 0v8 M14 17V6a2 2 0 0 1 4 0v11 M4 20h16',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 28;
      cfg.card.borderWidth = 1;
      cfg.card.shadow = 'soft';
      cfg.seriesStyle.barWidth = 14;
      cfg.seriesStyle.barBorderRadius = 99;
      cfg.seriesStyle.showBarBackground = true;
      cfg.seriesStyle.piePadAngle = 5;
      cfg.seriesStyle.pieCornerRadius = 14;
      cfg.periodPills.show = true;
      cfg.dataLabel.pillBadge = true;
      cfg.legend.icon = 'roundRect';
    },
  },
  {
    id: 'dashboard-kpi',
    category: 'modern',
    labelId: 'KPI Dashboard',
    labelEn: 'KPI Dashboard',
    descId: 'Hero KPI besar + badge tren, pil periode & kurva area',
    descEn: 'Large KPI hero + delta badge, period pills & smooth area',
    iconPath: 'M4 5h7v5H4z M14 5h6 M14 9h4 M4 19l5-5 4 3 7-6',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 20;
      cfg.card.shadow = 'soft';
      cfg.kpi.show = true;
      cfg.periodPills.show = true;
      cfg.seriesStyle.smooth = true;
      cfg.seriesStyle.areaFill = true;
      cfg.seriesStyle.areaOpacity = 0.25;
      cfg.seriesStyle.barWidth = 14;
      cfg.seriesStyle.barBorderRadius = 8;
      cfg.yAxis.splitLine = true;
      cfg.yAxis.splitLineType = 'dashed';
    },
  },
  {
    id: 'glass-soft',
    category: 'modern',
    labelId: 'Gradien Lembut',
    labelEn: 'Soft Gradient',
    descId: 'Isian gradien vertikal, kurva tebal & elevasi tinggi',
    descEn: 'Vertical gradient fills, thick smooth curves & elevated card',
    iconPath: 'M3 17C7 9 11 13 15 7s3-1 6-3v14H3z',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 24;
      cfg.card.shadow = 'elevated';
      cfg.useGradient = true;
      cfg.gradientDirection = 'vertical';
      cfg.seriesStyle.smooth = true;
      cfg.seriesStyle.areaFill = true;
      cfg.seriesStyle.areaOpacity = 0.3;
      cfg.seriesStyle.lineWidth = 3;
      cfg.seriesStyle.barWidth = 18;
      cfg.seriesStyle.barBorderRadius = 10;
    },
  },
  {
    id: 'stripe-rail',
    category: 'modern',
    labelId: 'Garis Samping + Rail',
    labelEn: 'Accent Rail',
    descId: 'Pita aksen di tepi kiri kartu dengan track latar batang',
    descEn: 'Left card accent stripe with background rail tracks',
    iconPath: 'M4 4v16 M8 17v-6h3v6 M13 17V7h3v10 M18 17v-9h3v9',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 16;
      cfg.card.shadow = 'soft';
      cfg.card.accentBar = 'left';
      cfg.seriesStyle.showBarBackground = true;
      cfg.seriesStyle.barWidth = 14;
      cfg.seriesStyle.barBorderRadius = 8;
      cfg.yAxis.splitLine = true;
      cfg.yAxis.splitLineType = 'solid';
    },
  },

  // === 6-10: MINIMAL ===
  {
    id: 'swiss-minimal',
    category: 'minimal',
    labelId: 'Swiss Minimal',
    labelEn: 'Swiss Minimal',
    descId: 'Sudut tajam 0px, tanpa bayangan, garis lurus presisi',
    descEn: 'Sharp 0px corners, zero shadow, crisp straight geometry',
    iconPath: 'M4 4h16v16H4z M7 17V9 M12 17V6 M17 17v-5',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 0;
      cfg.card.borderWidth = 1;
      cfg.card.shadow = 'none';
      cfg.seriesStyle.barWidth = 18;
      cfg.seriesStyle.barBorderRadius = 0;
      cfg.seriesStyle.smooth = false;
      cfg.seriesStyle.pieCornerRadius = 0;
      cfg.seriesStyle.piePadAngle = 1;
      cfg.yAxis.splitLine = true;
      cfg.yAxis.splitLineType = 'solid';
      cfg.title.left = 'left';
      cfg.typography.title.weight = 'bold';
    },
  },
  {
    id: 'tufte-data-ink',
    category: 'minimal',
    labelId: 'Tufte Data-Ink',
    labelEn: 'Tufte Data-Ink',
    descId: 'Tanpa bingkai kartu & grid, fokus penuh pada data & label',
    descEn: 'No card frame or gridlines, pure data & direct labels',
    iconPath: 'M4 19h16 M7 16v-6 M12 16V7 M17 16v-8 M7 8h1 M12 5h1 M17 6h1',
    apply: cfg => {
      cfg.card.show = false;
      cfg.card.shadow = 'none';
      cfg.xAxis.axisLine = false;
      cfg.yAxis.axisLine = false;
      cfg.xAxis.splitLine = false;
      cfg.yAxis.splitLine = false;
      cfg.dataLabel.show = true;
      cfg.dataLabel.pillBadge = false;
      cfg.seriesStyle.barWidth = 12;
      cfg.seriesStyle.barBorderRadius = 2;
      cfg.seriesStyle.smooth = false;
    },
  },
  {
    id: 'compact-spark',
    category: 'minimal',
    labelId: 'Sparkline Ringkas',
    labelEn: 'Compact Spark',
    descId: 'Widget ringkas tanpa sumbu & legenda, fokus tren & KPI',
    descEn: 'Clean widget with hidden axes & legend, KPI + trend focus',
    iconPath: 'M3 16c4-6 7 2 11-5s4-2 7-4',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 18;
      cfg.card.shadow = 'soft';
      cfg.xAxis.show = false;
      cfg.yAxis.show = false;
      cfg.legend.show = false;
      cfg.kpi.show = true;
      cfg.seriesStyle.smooth = true;
      cfg.seriesStyle.areaFill = true;
      cfg.seriesStyle.areaOpacity = 0.24;
      cfg.seriesStyle.barWidth = 14;
      cfg.seriesStyle.barBorderRadius = 6;
      cfg.grid.left = 20;
      cfg.grid.right = 20;
      cfg.grid.bottom = 24;
    },
  },
  {
    id: 'ring-architect',
    category: 'minimal',
    labelId: 'Cincin Tipis',
    labelEn: 'Thin Architect',
    descId: 'Garis & batang ramping, cincin donat tipis elegan',
    descEn: 'Sleek hairline strokes, slim bars & ultra-thin donut ring',
    iconPath: 'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0 M12 12m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 14;
      cfg.card.shadow = 'none';
      cfg.seriesStyle.lineWidth = 1.5;
      cfg.seriesStyle.barWidth = 8;
      cfg.seriesStyle.barBorderRadius = 4;
      cfg.seriesStyle.pieInnerRadius = 68;
      cfg.seriesStyle.pieOuterRadius = 78;
      cfg.seriesStyle.piePadAngle = 4;
      cfg.seriesStyle.pieCornerRadius = 6;
      cfg.yAxis.splitLine = true;
      cfg.yAxis.splitLineType = 'dashed';
    },
  },
  {
    id: 'lollipop-dot',
    category: 'minimal',
    labelId: 'Lollipop & Titik',
    labelEn: 'Lollipop Dot',
    descId: 'Batang tangkai tipis dengan titik simbol menonjol',
    descEn: 'Ultra-slim stems and prominent circular data markers',
    iconPath: 'M4 20h16 M8 20V10 M8 8a2 2 0 1 0 0.01 0 M16 20V7 M16 5a2 2 0 1 0 0.01 0',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 18;
      cfg.card.shadow = 'soft';
      cfg.seriesStyle.barWidth = 6;
      cfg.seriesStyle.barBorderRadius = 99;
      cfg.seriesStyle.lineWidth = 1.8;
      cfg.seriesStyle.showSymbol = true;
      cfg.seriesStyle.symbol = 'circle';
      cfg.seriesStyle.symbolSize = 10;
      cfg.yAxis.splitLine = true;
      cfg.yAxis.splitLineType = 'dotted';
    },
  },

  // === 11-15: TECHNICAL ===
  {
    id: 'technical-blueprint',
    category: 'technical',
    labelId: 'Blueprint Teknis',
    labelEn: 'Technical Grid',
    descId: 'Grid matriks XY penuh, bingkai plot kotak, marker persegi',
    descEn: 'Full XY matrix grid, boxed plot frame & square markers',
    iconPath: 'M4 4h16v16H4z M4 10h16 M4 15h16 M10 4v16 M15 4v16',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 4;
      cfg.card.shadow = 'none';
      cfg.grid.showBorder = true;
      cfg.xAxis.axisLine = true;
      cfg.xAxis.axisTick = true;
      cfg.xAxis.splitLine = true;
      cfg.xAxis.splitLineType = 'solid';
      cfg.yAxis.axisLine = true;
      cfg.yAxis.axisTick = true;
      cfg.yAxis.splitLine = true;
      cfg.yAxis.splitLineType = 'solid';
      cfg.seriesStyle.smooth = false;
      cfg.seriesStyle.showSymbol = true;
      cfg.seriesStyle.symbol = 'rect';
      cfg.seriesStyle.symbolSize = 7;
      cfg.seriesStyle.barWidth = 14;
      cfg.seriesStyle.barBorderRadius = 0;
    },
  },
  {
    id: 'step-digital',
    category: 'technical',
    labelId: 'Tangga Digital',
    labelEn: 'Digital Step',
    descId: 'Kurva tangga bertingkat, grid titik-titik & sumbu tegas',
    descEn: 'Stepped line geometry, dotted XY grid & crisp axis baseline',
    iconPath: 'M4 17h4v-5h5v-4h5V5h2',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 6;
      cfg.card.shadow = 'none';
      cfg.seriesStyle.smooth = false;
      cfg.seriesStyle.step = 'middle';
      cfg.seriesStyle.showSymbol = true;
      cfg.seriesStyle.symbol = 'rect';
      cfg.seriesStyle.symbolSize = 6;
      cfg.seriesStyle.barWidth = 16;
      cfg.seriesStyle.barBorderRadius = 2;
      cfg.xAxis.axisLine = true;
      cfg.xAxis.splitLine = true;
      cfg.xAxis.splitLineType = 'dotted';
      cfg.yAxis.splitLine = true;
      cfg.yAxis.splitLineType = 'dotted';
    },
  },
  {
    id: 'scientific-paper',
    category: 'technical',
    labelId: 'Jurnal Ilmiah',
    labelEn: 'Scientific Paper',
    descId: 'Plot berbingkai penuh, tanda Max/Min & marker segitiga',
    descEn: 'Boxed plot, axis ticks, triangle markers & Max/Min callouts',
    iconPath: 'M4 4v16h16 M8 14l4-6 4 4 3-5 M12 6l-1.5 2.5h3z',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 2;
      cfg.card.shadow = 'none';
      cfg.grid.showBorder = true;
      cfg.xAxis.axisLine = true;
      cfg.xAxis.axisTick = true;
      cfg.yAxis.axisLine = true;
      cfg.yAxis.axisTick = true;
      cfg.yAxis.splitLine = true;
      cfg.yAxis.splitLineType = 'dashed';
      cfg.seriesStyle.smooth = false;
      cfg.seriesStyle.showSymbol = true;
      cfg.seriesStyle.symbol = 'triangle';
      cfg.seriesStyle.symbolSize = 8;
      cfg.annotations.markPointMax = true;
      cfg.annotations.markPointMin = true;
      cfg.seriesStyle.barWidth = 14;
      cfg.seriesStyle.barBorderRadius = 0;
    },
  },
  {
    id: 'analytics-pro',
    category: 'technical',
    labelId: 'Analitik Pro',
    labelEn: 'Analytics Pro',
    descId: 'Garis rata-rata putus-putus, titik puncak Max/Min & kurva halus',
    descEn: 'Average reference line, Max/Min markers & smooth trend',
    iconPath: 'M4 12h16 M4 17C8 10 12 15 20 6 M12 6a2 2 0 1 0 0.01 0',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 16;
      cfg.card.shadow = 'soft';
      cfg.annotations.markLineAvg = true;
      cfg.annotations.markPointMax = true;
      cfg.annotations.markPointMin = true;
      cfg.seriesStyle.smooth = true;
      cfg.seriesStyle.showSymbol = true;
      cfg.seriesStyle.symbolSize = 7;
      cfg.seriesStyle.barWidth = 16;
      cfg.seriesStyle.barBorderRadius = 6;
      cfg.yAxis.splitLine = true;
      cfg.yAxis.splitLineType = 'dashed';
    },
  },
  {
    id: 'banded-zebra',
    category: 'technical',
    labelId: 'Pita Zebra',
    labelEn: 'Zebra Bands',
    descId: 'Latar pita horizontal berselang-seling & legenda kanan atas',
    descEn: 'Alternating horizontal split bands & top-right legend',
    iconPath: 'M4 5h16v3H4z M4 11h16v3H4z M4 17h16v2H4z',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 10;
      cfg.card.shadow = 'none';
      cfg.yAxis.splitArea = true;
      cfg.yAxis.splitLine = false;
      cfg.xAxis.axisLine = true;
      cfg.seriesStyle.barWidth = 18;
      cfg.seriesStyle.barBorderRadius = 6;
      cfg.legend.show = true;
      cfg.legend.position = 'top';
    },
  },

  // === 16-20: EDITORIAL ===
  {
    id: 'executive-report',
    category: 'editorial',
    labelId: 'Laporan Eksekutif',
    labelEn: 'Executive Report',
    descId: 'Judul rata tengah, garis rata-rata & catatan kaki sumber',
    descEn: 'Centered header, average reference line & source footnote',
    iconPath: 'M7 5h10 M9 8h6 M4 12h16 M6 17h12 M4 20h16',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 8;
      cfg.card.borderWidth = 1;
      cfg.card.shadow = 'none';
      cfg.title.left = 'center';
      cfg.yAxis.splitLine = true;
      cfg.yAxis.splitLineType = 'solid';
      cfg.annotations.markLineAvg = true;
      cfg.footnote.show = true;
      cfg.seriesStyle.barWidth = 16;
      cfg.seriesStyle.barBorderRadius = 4;
    },
  },
  {
    id: 'editorial-serif',
    category: 'editorial',
    labelId: 'Editorial Serif',
    labelEn: 'Editorial Serif',
    descId: 'Judul tipografi Georgia klasik, aksen atas & label nilai',
    descEn: 'Classic Georgia serif title, top accent bar & data labels',
    iconPath: 'M4 4h16 M7 9h10 M12 9v8 M9 17h6',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 6;
      cfg.card.shadow = 'none';
      cfg.card.accentBar = 'top';
      cfg.typography.title.family = 'Georgia';
      cfg.typography.title.size = 20;
      cfg.typography.title.weight = 'bold';
      cfg.dataLabel.show = true;
      cfg.dataLabel.pillBadge = false;
      cfg.footnote.show = true;
      cfg.yAxis.splitLine = true;
      cfg.yAxis.splitLineType = 'solid';
      cfg.seriesStyle.barWidth = 18;
      cfg.seriesStyle.barBorderRadius = 2;
    },
  },
  {
    id: 'framed-retro',
    category: 'editorial',
    labelId: 'Bingkai Ganda Klasik',
    labelEn: 'Classic Double Frame',
    descId: 'Bingkai garis ganda klasik dengan legenda kotak & catatan kaki',
    descEn: 'Classic double-bordered frame, square legend & footnote',
    iconPath: 'M3 3h18v18H3z M6 6h12v12H6z M9 15v-4 M12 15V9 M15 15v-6',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 4;
      cfg.card.borderWidth = 1.5;
      cfg.card.shadow = 'none';
      cfg.card.doubleBorder = true;
      cfg.xAxis.axisLine = true;
      cfg.yAxis.axisLine = true;
      cfg.legend.icon = 'rect';
      cfg.footnote.show = true;
      cfg.seriesStyle.barWidth = 16;
      cfg.seriesStyle.barBorderRadius = 0;
      cfg.seriesStyle.smooth = false;
    },
  },
  {
    id: 'stacked-metric',
    category: 'editorial',
    labelId: 'Komposisi Bertumpuk',
    labelEn: 'Stacked Metric',
    descId: 'Seri bertumpuk (stack) dengan KPI hero & legenda atas',
    descEn: 'Stacked series composition with KPI hero & top legend',
    iconPath: 'M6 18v-5h4v5 M6 13V8h4v5 M14 18v-7h4v7 M14 11V6h4v5',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 18;
      cfg.card.shadow = 'soft';
      cfg.seriesStyle.stack = true;
      cfg.seriesStyle.barWidth = 22;
      cfg.seriesStyle.barBorderRadius = 6;
      cfg.kpi.show = true;
      cfg.legend.show = true;
      cfg.legend.position = 'top';
      cfg.yAxis.splitLine = true;
      cfg.yAxis.splitLineType = 'dashed';
    },
  },
  {
    id: 'presentation-clean',
    category: 'editorial',
    labelId: 'Slide Presentasi',
    labelEn: 'Slide Deck',
    descId: 'Tipografi besar mudah dibaca dari jauh tanpa garis tepi kartu',
    descEn: 'Large slide-ready typography, borderless card & top labels',
    iconPath: 'M4 5h16v11H4z M8 20l4-4 4 4 M8 13v-3 M12 13V8 M16 13v-4',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderWidth = 0;
      cfg.card.borderRadius = 14;
      cfg.card.shadow = 'none';
      cfg.typography.title.size = 20;
      cfg.typography.title.weight = 'bold';
      cfg.typography.axisLabel.size = 13;
      cfg.typography.legend.size = 13;
      cfg.dataLabel.show = true;
      cfg.dataLabel.pillBadge = false;
      cfg.seriesStyle.barWidth = 24;
      cfg.seriesStyle.barBorderRadius = 6;
      cfg.seriesStyle.lineWidth = 3.5;
    },
  },

  // === 21-25: CREATIVE ===
  {
    id: 'neo-brutalist',
    category: 'creative',
    labelId: 'Neo-Brutalist',
    labelEn: 'Neo-Brutalist',
    descId: 'Garis tepi tebal 2.5px, bayangan solid keras & batang ber-outline',
    descEn: 'Thick 2.5px border, hard offset shadow & outlined bars',
    iconPath: 'M3 3h15v15H3z M6 18h15V6 M7 14v-4h3v4 M12 14V7h3v7',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 6;
      cfg.card.borderWidth = 2.5;
      cfg.card.shadow = 'hard';
      cfg.seriesStyle.barWidth = 22;
      cfg.seriesStyle.barBorderRadius = 0;
      cfg.seriesStyle.barOutline = true;
      cfg.seriesStyle.smooth = false;
      cfg.seriesStyle.lineWidth = 3;
      cfg.xAxis.axisLine = true;
      cfg.xAxis.axisTick = true;
      cfg.yAxis.axisLine = true;
      cfg.typography.title.size = 18;
      cfg.typography.title.weight = 'bold';
    },
  },
  {
    id: 'wireframe-outline',
    category: 'creative',
    labelId: 'Garis Outline (Hollow)',
    labelEn: 'Wireframe Outline',
    descId: 'Seri berongga dengan isian transparan 14% & stroke tepi 2px',
    descEn: 'Hollow series with 14% tinted fill & crisp 2px outline',
    iconPath: 'M6 17V9h4v8z M14 17V6h4v11z M4 20h16',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 12;
      cfg.card.shadow = 'none';
      cfg.seriesStyle.outlineOnly = true;
      cfg.seriesStyle.barWidth = 18;
      cfg.seriesStyle.barBorderRadius = 6;
      cfg.seriesStyle.pieCornerRadius = 6;
      cfg.seriesStyle.piePadAngle = 4;
      cfg.yAxis.splitLine = true;
      cfg.yAxis.splitLineType = 'dashed';
    },
  },
  {
    id: 'bold-poster',
    category: 'creative',
    labelId: 'Poster Tebal',
    labelEn: 'Bold Poster',
    descId: 'Judul ekstra besar, batang gemuk 28px & tanpa grid',
    descEn: 'Oversized headline, chunky 28px bars, thick lines & no grid',
    iconPath: 'M4 5h12 M4 8h8 M6 19v-7h5v7 M13 19V10h5v9',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 16;
      cfg.card.shadow = 'elevated';
      cfg.typography.title.size = 22;
      cfg.typography.title.weight = 'bold';
      cfg.seriesStyle.barWidth = 28;
      cfg.seriesStyle.barBorderRadius = 6;
      cfg.seriesStyle.lineWidth = 4;
      cfg.dataLabel.show = true;
      cfg.dataLabel.pillBadge = false;
      cfg.yAxis.splitLine = false;
      cfg.xAxis.splitLine = false;
    },
  },
  {
    id: 'dotted-studio',
    category: 'creative',
    labelId: 'Studio Bertitik',
    labelEn: 'Dotted Studio',
    descId: 'Garis putus-putus, grid titik halus & marker berlian',
    descEn: 'Dashed line strokes, dotted grid & diamond markers',
    iconPath: 'M4 15l4-4 4 2 4-6 4 2 M8 11l1.5-1.5L11 11l-1.5 1.5z',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 16;
      cfg.card.shadow = 'soft';
      cfg.yAxis.splitLine = true;
      cfg.yAxis.splitLineType = 'dotted';
      cfg.xAxis.splitLine = true;
      cfg.xAxis.splitLineType = 'dotted';
      cfg.seriesStyle.lineType = 'dashed';
      cfg.seriesStyle.showSymbol = true;
      cfg.seriesStyle.symbol = 'diamond';
      cfg.seriesStyle.symbolSize = 9;
      cfg.legend.icon = 'roundRect';
    },
  },
  {
    id: 'infographic-badge',
    category: 'creative',
    labelId: 'Infografis Badge',
    labelEn: 'Infographic Badge',
    descId: 'Callout kapsul pada nilai, gradien diagonal & celah donat lebar',
    descEn: 'Floating pill value badges, diagonal gradients & wide slice gaps',
    iconPath: 'M5 5h6v4H5z M13 9h6v4h-6z M6 19v-5h4v5 M14 19v-3h4v3',
    apply: cfg => {
      cfg.card.show = true;
      cfg.card.borderRadius = 22;
      cfg.card.shadow = 'soft';
      cfg.title.left = 'center';
      cfg.dataLabel.show = true;
      cfg.dataLabel.pillBadge = true;
      cfg.useGradient = true;
      cfg.gradientDirection = 'diagonal';
      cfg.seriesStyle.piePadAngle = 6;
      cfg.seriesStyle.pieCornerRadius = 10;
      cfg.seriesStyle.barWidth = 18;
      cfg.seriesStyle.barBorderRadius = 10;
    },
  },
];

/**
 * Menerapkan style struktural chart tanpa mengubah palet warna/tema warna yang dipilih pengguna.
 */
export function applyChartStyle(cfg: ChartConfig, styleId: string): ChartConfig {
  const preset = CHART_STYLES.find(s => s.id === styleId) || CHART_STYLES[0];
  const next: ChartConfig = JSON.parse(JSON.stringify(cfg));

  // Reset style-specific structural flags to neutral baseline before applying
  next.chartStyleId = preset.id;
  next.useGradient = false;
  next.card.show = true;
  next.card.borderWidth = 1;
  next.card.shadow = 'soft';
  next.card.accentBar = 'none';
  next.card.doubleBorder = false;
  next.kpi.show = false;
  next.periodPills.show = false;
  next.footnote.show = false;
  next.legend.show = true;
  next.legend.position = 'bottom';
  next.legend.icon = 'circle';
  next.grid.showBorder = false;
  next.grid.left = 52;
  next.grid.right = 28;
  next.grid.bottom = 56;
  next.xAxis.show = true;
  next.xAxis.axisLine = false;
  next.xAxis.axisTick = false;
  next.xAxis.splitLine = false;
  next.xAxis.splitArea = false;
  next.yAxis.show = true;
  next.yAxis.axisLine = false;
  next.yAxis.axisTick = false;
  next.yAxis.splitLine = true;
  next.yAxis.splitLineType = 'dashed';
  next.yAxis.splitArea = false;
  next.dataLabel.show = false;
  next.dataLabel.pillBadge = false;
  next.annotations.markLineAvg = false;
  next.annotations.markPointMax = false;
  next.annotations.markPointMin = false;
  next.seriesStyle.smooth = true;
  next.seriesStyle.areaFill = false;
  next.seriesStyle.lineWidth = 2.5;
  next.seriesStyle.lineType = 'solid';
  next.seriesStyle.step = false;
  next.seriesStyle.showSymbol = false;
  next.seriesStyle.symbol = 'circle';
  next.seriesStyle.symbolSize = 8;
  next.seriesStyle.stack = false;
  next.seriesStyle.showBarBackground = false;
  next.seriesStyle.barWidth = 16;
  next.seriesStyle.barBorderRadius = 8;
  next.seriesStyle.outlineOnly = false;
  next.seriesStyle.barOutline = false;
  next.seriesStyle.pieInnerRadius = cfg.seriesStyle.pieInnerRadius;
  next.seriesStyle.pieOuterRadius = 74;
  next.seriesStyle.piePadAngle = 3;
  next.seriesStyle.pieCornerRadius = 8;
  next.title.left = 'left';
  next.typography.title.family = cfg.typography.global.family || 'Geovanta Sans';
  next.typography.title.size = 16;
  next.typography.title.weight = '600';
  next.typography.axisLabel.size = 11;
  next.typography.legend.size = 12;

  preset.apply(next);
  return next;
}
