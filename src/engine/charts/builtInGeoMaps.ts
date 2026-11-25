/**
 * @file src/engine/charts/builtInGeoMaps.ts
 * @description Peta GeoJSON ringan bawaan (Indonesia & Dunia) + registrasi peta GeoJSON kustom untuk seri Map & Lines
 */

const REGISTERED_MAPS = new Set<string>();

export const INDONESIA_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Sumatra' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[95.3, 5.5], [98.6, 3.6], [102.5, 1.2], [104.8, -1.8], [105.9, -5.9], [103.6, -5.1], [101.2, -2.5], [98.2, 0.8], [95.3, 5.5]]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Jawa' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[105.4, -6.1], [108.5, -6.4], [111.5, -6.7], [114.5, -7.8], [114.2, -8.6], [110.2, -8.1], [106.4, -7.4], [105.4, -6.1]]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Kalimantan' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[109.2, 1.5], [112.0, 1.6], [115.6, 4.2], [118.8, 4.5], [117.6, -1.2], [115.9, -3.9], [111.5, -3.2], [109.0, -1.5], [109.2, 1.5]]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Sulawesi' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[119.2, 1.2], [125.0, 1.7], [124.2, 0.4], [121.6, -0.5], [123.0, -3.9], [121.8, -5.2], [119.4, -5.5], [118.8, -2.6], [119.2, 1.2]]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Bali & Nusa Tenggara' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[114.6, -8.1], [116.5, -8.3], [119.0, -8.4], [123.6, -8.6], [124.8, -9.2], [123.2, -10.3], [118.5, -9.0], [115.2, -8.8], [114.6, -8.1]]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Maluku' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[127.1, 2.2], [129.0, 1.5], [130.6, -3.2], [128.0, -3.9], [126.2, -2.0], [127.1, 2.2]]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Papua' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[130.8, -1.2], [135.2, -1.6], [141.0, -2.6], [141.0, -8.8], [138.0, -8.2], [134.5, -5.1], [132.1, -3.4], [130.8, -1.2]]],
      },
    },
  ],
};

export const WORLD_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'North America' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-165, 65], [-125, 70], [-65, 55], [-80, 25], [-105, 18], [-122, 37], [-145, 58], [-165, 65]]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'South America' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-80, 10], [-60, 10], [-35, -8], [-55, -35], [-68, -54], [-75, -40], [-81, -5], [-80, 10]]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Europe' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-10, 36], [28, 38], [45, 55], [30, 70], [5, 62], [-9, 44], [-10, 36]]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Africa' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-17, 15], [-5, 35], [32, 31], [50, 12], [38, -18], [20, -35], [12, -15], [8, 4], [-17, 15]]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Asia' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[42, 42], [75, 68], [140, 66], [145, 40], [122, 22], [105, 10], [78, 8], [55, 24], [42, 42]]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Oceania' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[113, -22], [130, -12], [153, -26], [147, -40], [116, -34], [113, -22]]],
      },
    },
  ],
};

export function registerBuiltInGeoMaps(echartsModule: any): void {
  if (!echartsModule || typeof echartsModule.registerMap !== 'function') return;
  if (!REGISTERED_MAPS.has('indonesia')) {
    echartsModule.registerMap('indonesia', INDONESIA_GEOJSON as any);
    REGISTERED_MAPS.add('indonesia');
  }
  if (!REGISTERED_MAPS.has('world')) {
    echartsModule.registerMap('world', WORLD_GEOJSON as any);
    REGISTERED_MAPS.add('world');
  }
}

export function registerCustomGeoMap(echartsModule: any, name: string, geoJson: any): string {
  const cleanName = String(name || 'custom-map').trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'custom-map';
  if (!echartsModule || typeof echartsModule.registerMap !== 'function') {
    throw new Error('ECharts registerMap tidak tersedia');
  }
  if (!geoJson || typeof geoJson !== 'object' || !Array.isArray(geoJson.features)) {
    throw new Error('GeoJSON tidak valid (harus memiliki properti features)');
  }
  echartsModule.registerMap(cleanName, geoJson);
  REGISTERED_MAPS.add(cleanName);
  return cleanName;
}

export function listRegisteredGeoMaps(): string[] {
  return Array.from(REGISTERED_MAPS);
}
