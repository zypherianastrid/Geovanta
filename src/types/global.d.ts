/**
 * @file src/types/global.d.ts
 * @description Deklarasi tipe global untuk Window dan API lingkungan Geovanta
 */

export {};

declare global {
  interface Window {
    __geovantaEditorApi?: any;
    __GEOVANTA_AUDIT__?: any;
    __geovantaSetAutoSimplifyOn?: (on: boolean) => void;
    showSaveFilePicker?: (options?: any) => Promise<any>;
    showOpenFilePicker?: (options?: any) => Promise<any[]>;
    initGeovantaCanvasKit?: () => Promise<any>;
    GEOVANTA_BUNDLED_TEXT_FONT?: any;
    CanvasKitInit?: (options?: any) => Promise<any>;
    [key: string]: any;
  }

  const CanvasKitInit: ((options?: any) => Promise<any>) | undefined;
}
