import { LngLatBounds, MercatorCoordinate } from 'maplibre-gl';
import { shadowOffset, shadowPolygons } from '../domain/shadow';
import type { Building, SunPosition } from '../domain/types';

/** sun/cloud: tint the lit ground; unknown: shadows only; none: draw nothing. */
export type SkyTint = 'sun' | 'cloud' | 'unknown' | 'none';

export const COLORS = {
  sun: '#ffc21a',
  cloud: '#8e9aab',
  shadow: '#1b2140',
};

export type CanvasFrame = {
  /** Corners for the MapLibre canvas source: TL, TR, BR, BL as [lng, lat]. */
  coordinates: [[number, number], [number, number], [number, number], [number, number]];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/** Mercator frame covering the bounds, padded so small pans stay covered. */
export function frameFor(bounds: LngLatBounds, pad = 0.35): CanvasFrame {
  const nw = MercatorCoordinate.fromLngLat(bounds.getNorthWest());
  const se = MercatorCoordinate.fromLngLat(bounds.getSouthEast());
  const w = se.x - nw.x;
  const h = se.y - nw.y;
  const minX = nw.x - w * pad;
  const maxX = se.x + w * pad;
  const minY = nw.y - h * pad;
  const maxY = se.y + h * pad;
  const ll = (x: number, y: number): [number, number] => {
    const p = new MercatorCoordinate(x, y).toLngLat();
    return [p.lng, p.lat];
  };
  return { coordinates: [ll(minX, minY), ll(maxX, minY), ll(maxX, maxY), ll(minX, maxY)], minX, minY, maxX, maxY };
}

/**
 * Paints the whole frame in the "sky" colour (sun or cloud) and the ground
 * shadows of all buildings on top, fully opaque — the map layer applies the
 * transparency, so overlapping shadows do not get darker.
 */
export function drawShadows(
  canvas: HTMLCanvasElement,
  frame: CanvasFrame,
  buildings: Building[],
  sun: SunPosition,
  tint: SkyTint,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: W, height: H } = canvas;
  ctx.clearRect(0, 0, W, H);
  if (sun.altitudeDeg <= 0 || tint === 'none') return;

  if (tint !== 'unknown') {
    ctx.fillStyle = tint === 'sun' ? COLORS.sun : COLORS.cloud;
    ctx.fillRect(0, 0, W, H);
  }

  const sx = W / (frame.maxX - frame.minX);
  const sy = H / (frame.maxY - frame.minY);
  const path = new Path2D();

  for (const b of buildings) {
    const anchor = MercatorCoordinate.fromLngLat(b.footprint[0]);
    const unitsPerMetre = anchor.meterInMercatorCoordinateUnits();
    // Local metric frame (x east, y north) → canvas pixels (y down).
    const ring = b.footprint.map((p) => {
      const m = MercatorCoordinate.fromLngLat(p);
      return { x: (m.x - anchor.x) / unitsPerMetre, y: -(m.y - anchor.y) / unitsPerMetre };
    });
    const toPx = (v: { x: number; y: number }) => [
      (anchor.x + v.x * unitsPerMetre - frame.minX) * sx,
      (anchor.y - v.y * unitsPerMetre - frame.minY) * sy,
    ];
    const polys = shadowPolygons(ring, shadowOffset(sun, b.minHeightM ?? 0), shadowOffset(sun, b.heightM));
    for (const poly of polys) {
      poly.forEach((v, k) => {
        const [x, y] = toPx(v);
        if (k === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      });
      path.closePath();
    }
  }
  ctx.fillStyle = COLORS.shadow;
  // All sub-polygons are counter-clockwise, so nonzero winding yields their union.
  ctx.fill(path, 'nonzero');
}
