import { describe, expect, it } from 'vitest';
import { sunPosition } from './sun';

describe('sunPosition', () => {
  it('Karlsruhe, autumn equinox, solar noon: sun due south at ~41°', () => {
    // Solar noon at 8.40° E on 2026-09-23 ≈ 11:18 UTC (equation of time ≈ +7.6 min).
    const p = sunPosition(new Date('2026-09-23T11:18:00Z'), { lat: 49.0094, lng: 8.4037 });
    expect(p.azimuthDeg).toBeGreaterThan(178);
    expect(p.azimuthDeg).toBeLessThan(182);
    expect(p.altitudeDeg).toBeCloseTo(90 - 49.0094 + -0.3, 0);
  });
});
