import { describe, expect, it } from 'vitest';
import { fromLocal } from './geo';
import { computeShadow, shadowPolygonsLocal } from './shadow';
import type { Building } from './types';

const origin = { lat: 49.0094, lng: 8.4037 };
const box = (x0: number, y0: number, x1: number, y1: number, heightM: number): Building => ({
  id: 'b',
  heightM,
  footprint: [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ].map((v) => fromLocal(origin, v)),
});

// 21.2 m tall building whose north face is 20 m south of the point:
// obstruction angle = atan(20 / 20) = 45°.
const south = box(-10, -40, 10, -20, 21.2);

describe('computeShadow', () => {
  it('is shadowed when the sun is behind the building and lower than the roof edge', () => {
    const r = computeShadow(origin, [south], { azimuthDeg: 180, altitudeDeg: 30 });
    expect(r.shadowed).toBe(true);
    if (r.shadowed) {
      expect(r.hit.distanceM).toBeCloseTo(20, 1);
      expect(r.hit.obstructionAngleDeg).toBeCloseTo(45, 0);
    }
  });

  it('is sunny when the sun is higher than the roof edge', () => {
    expect(computeShadow(origin, [south], { azimuthDeg: 180, altitudeDeg: 50 }).shadowed).toBe(false);
  });

  it('ignores buildings on the other side', () => {
    expect(computeShadow(origin, [south], { azimuthDeg: 0, altitudeDeg: 10 }).shadowed).toBe(false);
  });

  it('misses a building when the ray passes beside it', () => {
    // 10 m wide at 20 m distance → ±26.6° around south.
    expect(computeShadow(origin, [south], { azimuthDeg: 180 + 25, altitudeDeg: 20 }).shadowed).toBe(true);
    expect(computeShadow(origin, [south], { azimuthDeg: 180 + 28, altitudeDeg: 20 }).shadowed).toBe(false);
  });

  it('reports the highest obstruction among several buildings', () => {
    const tallFar = { ...box(-10, -80, 10, -60, 100), id: 'tall' };
    const r = computeShadow(origin, [south, tallFar], { azimuthDeg: 180, altitudeDeg: 30 });
    expect(r.shadowed && r.hit.building.id).toBe('tall');
  });

  it('detects points inside a building footprint', () => {
    const r = computeShadow(origin, [box(-5, -5, 5, 5, 10)], { azimuthDeg: 90, altitudeDeg: 60 });
    expect(r.shadowed && r.insideBuilding).toBe(true);
  });

  it('lets the sun through below an elevated building part (passage)', () => {
    // Bridge 20 m south, from 8 m to 12 m height, 20 m deep.
    const bridge = { ...box(-10, -40, 10, -20, 12), minHeightM: 8 };
    // Ray height over the bridge at 10°: 1.2 + [20..40]·tan10° = 4.7..8.3 m → grazes the underside.
    expect(computeShadow(origin, [bridge], { azimuthDeg: 180, altitudeDeg: 10 }).shadowed).toBe(true);
    // At 5°: 2.9..4.7 m → passes underneath.
    expect(computeShadow(origin, [bridge], { azimuthDeg: 180, altitudeDeg: 5 }).shadowed).toBe(false);
  });

  it('never shadows below the horizon', () => {
    expect(computeShadow(origin, [south], { azimuthDeg: 180, altitudeDeg: -5 }).shadowed).toBe(false);
  });
});

describe('shadowPolygonsLocal', () => {
  it('offsets the footprint away from the sun by h / tan(altitude)', () => {
    const polys = shadowPolygonsLocal(origin, box(0, 0, 10, 10, 10), { azimuthDeg: 180, altitudeDeg: 45 });
    const shifted = polys[1];
    // Sun in the south → shadow points north by 10 m.
    expect(shifted[0].x).toBeCloseTo(0, 3);
    expect(shifted[0].y).toBeCloseTo(10, 3);
    expect(polys).toHaveLength(2 + 4);
  });
});
