/**
 * @file src/types/vectorTypes.ts
 * @description Tipe data domain terpusat untuk Geovanta Vector Studio
 */

export interface VectorPoint {
  x: number;
  y: number;
}

export interface NodePoint {
  id: string;
  x: number;
  y: number;
  handleIn?: VectorPoint | null;
  handleOut?: VectorPoint | null;
  type?: 'corner' | 'smooth' | 'symmetric' | string;
  sharp?: boolean;
  radius?: number;
  [key: string]: any;
}

export interface Subpath {
  closed: boolean;
  nodes: NodePoint[];
  [key: string]: any;
}

export interface GradStop {
  offset: number;
  color: string;
}

export interface GradModel {
  type: 'linear' | 'radial' | 'angular' | string;
  stops: GradStop[];
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  cx?: number;
  cy?: number;
  r?: number;
  fx?: number;
  fy?: number;
  rotation?: number;
  base?: string;
  id?: string;
  [key: string]: any;
}

export interface TextSpec {
  content: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontWeight?: string | number;
  fontStyle?: string;
  fill?: string;
  textAlign?: 'left' | 'center' | 'right' | string;
  width?: number;
  height?: number;
  [key: string]: any;
}

export type StrokeAlign = 'center' | 'inside' | 'outside';

export type BlendModeName =
  | 'normal'
  | 'darken'
  | 'multiply'
  | 'color-burn'
  | 'lighten'
  | 'screen'
  | 'color-dodge'
  | 'overlay'
  | 'soft-light'
  | 'hard-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export interface VectorObject {
  id: string;
  name?: string;
  type?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeLinejoin?: 'round' | 'bevel' | 'miter';
  strokeLinecap?: 'round' | 'butt' | 'square';
  strokeMiterlimit?: number;
  strokeDasharray?: number[] | null;
  strokeDashoffset?: number;
  strokeAlign?: StrokeAlign;
  paintOrder?: string;
  opacity?: number;
  blendMode?: BlendModeName;
  strokeGrad?: GradModel | null;
  fillRule?: 'nonzero' | 'evenodd';
  group?: string | null;
  locked?: boolean;
  hidden?: boolean;
  subs?: Subpath[];
  img?: any;
  text?: TextSpec;
  gen?: any;
  effects?: any[];
  fillStyleId?: string | null;
  strokeStyleId?: string | null;
  isFrameBg?: boolean;
  isAutoFrame?: boolean;
  containerType?: string;
  isIconFrame?: boolean;
  [key: string]: any;
}

export interface VectorDocument {
  viewBox: [number, number, number, number] | number[];
  objects: VectorObject[];
  styles?: any[];
  defs?: any[];
  [key: string]: any;
}

export interface SelectionState {
  objs: Set<string>;
  nodes: Set<string>;
}

export interface ViewState {
  zoom: number;
  pan: VectorPoint;
}

export type EditorTool =
  | 'select'
  | 'subselect'
  | 'pen'
  | 'curvature'
  | 'pencil'
  | 'eraser'
  | 'rect'
  | 'ellipse'
  | 'polygon'
  | 'star'
  | 'line'
  | 'arc'
  | 'weave'
  | 'blob'
  | 'text'
  | 'frame'
  | 'hand'
  | 'zoom'
  | string;

export interface ProjectMetadata {
  id: string;
  name: string;
  created: number;
  updated: number;
  thumbnail?: string;
  favorite?: boolean;
  trash?: boolean;
  data?: VectorDocument;
  viewState?: ViewState;
  [key: string]: any;
}
