/**
 * @file scripts/mcp-server/engineBundleEntry.ts
 * @description Pre-bundled entry for Geovanta headless geometry engine (used by Netlify Function & Node MCP Server)
 */
import * as svgPathParser from '../../src/engine/svgPathParser.tsx';
import * as svgDocParser from '../../src/engine/svgDocumentParser.tsx';
import * as svgDocSerializer from '../../src/engine/svgDocumentSerializer.tsx';
import * as topologicalSimplifier from '../../src/engine/topologicalCurveSimplifier.tsx';
import * as pathBooleanModule from '../../src/engine/pathBoolean.tsx';
import * as cornerFilletModule from '../../src/engine/cornerFilletEngine.tsx';
import * as blobGenerator from '../../src/engine/blobGenerator.tsx';
import * as weaveGenerator from '../../src/engine/weaveGenerator.tsx';

export {
  svgPathParser,
  svgDocParser,
  svgDocSerializer,
  topologicalSimplifier,
  pathBooleanModule,
  cornerFilletModule,
  blobGenerator,
  weaveGenerator
};
