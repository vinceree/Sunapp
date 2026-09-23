import type { Position } from 'geojson';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { Building } from '../domain/types';

/** Source id used by OpenMapTiles-based styles (OpenFreeMap, MapTiler, …). */
export const BUILDING_SOURCE = 'openmaptiles';
const BUILDING_SOURCE_LAYER = 'building';
/** OpenMapTiles falls back to 5 m when OSM has neither height nor levels. */
const FALLBACK_HEIGHT_M = 5;

/**
 * Buildings of all currently loaded tiles. Footprints clipped at tile borders
 * come back as several pieces; that is fine, the union of their shadows is the
 * shadow of the whole building.
 */
export function buildingsFromMap(map: MapLibreMap): Building[] {
  const source = map.getSource(BUILDING_SOURCE);
  if (!source) return [];
  const features = map.querySourceFeatures(
    BUILDING_SOURCE,
    source.type === 'vector' ? { sourceLayer: BUILDING_SOURCE_LAYER } : undefined,
  );

  const out: Building[] = [];
  features.forEach((f, i) => {
    const heightM = Number(f.properties?.render_height ?? f.properties?.height ?? FALLBACK_HEIGHT_M);
    const minHeightM = Number(f.properties?.render_min_height ?? f.properties?.min_height ?? 0);
    if (f.properties?.hide_3d || !(heightM > minHeightM)) return;
    const g = f.geometry;
    const polygons: Position[][][] = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    polygons.forEach((poly, j) => {
      const outer = poly[0];
      if (!outer || outer.length < 4) return;
      out.push({
        id: `${f.id ?? i}-${j}`,
        // GeoJSON rings repeat the first vertex at the end.
        footprint: outer.slice(0, -1).map(([lng, lat]) => ({ lat, lng })),
        heightM,
        minHeightM,
      });
    });
  });
  return out;
}
