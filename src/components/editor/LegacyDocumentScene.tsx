import React from 'react';
import {mergeLegacyTextObjects} from '../../engine/legacyText.tsx';
import {serializeDoc} from '../../engine/svgDocumentSerializer.tsx';

// The complete SVG scene keeps preserved text in its original stacking order.
// It is only mounted for older projects containing text; vector-only projects
// continue to use CanvasKit.
export const LegacyDocumentScene: React.FC<any> = React.memo(function LegacyDocumentScene({doc, source}: any) {
  const merged = mergeLegacyTextObjects(doc, source);
  const [vx, vy] = doc.viewBox;
  const markup = serializeDoc(merged)
    .replace(/^<\?xml[^\n]*\n/, '')
    .replace('<svg ', `<svg x="${Number(vx) || 0}" y="${Number(vy) || 0}" overflow="visible" `);
  return <g pointerEvents="none" aria-label="Legacy document scene"
    dangerouslySetInnerHTML={{__html: markup}} />;
});
