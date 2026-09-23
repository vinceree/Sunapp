import { describe, expect, it } from 'vitest';
import { evaluateStatus } from './sunStatus';
import type { ShadowResult } from './shadow';

const up = { azimuthDeg: 180, altitudeDeg: 30 };
const free: ShadowResult = { shadowed: false };
const blocked: ShadowResult = { shadowed: true, hit: { building: { id: 'x', footprint: [], heightM: 20 }, distanceM: 10, obstructionAngleDeg: 60 } };
const w = (cloudCover: number, dni: number | null = null) => ({ time: 0, cloudCover, directNormalIrradiance: dni });

describe('evaluateStatus', () => {
  it('sunny: no shadow and clear sky', () => expect(evaluateStatus(up, free, w(10)).status).toBe('sunny'));
  it('cloudy: no shadow but overcast', () => expect(evaluateStatus(up, free, w(90)).status).toBe('cloudy'));
  it('shaded wins over weather', () => expect(evaluateStatus(up, blocked, w(0)).status).toBe('shaded'));
  it('night below horizon', () => expect(evaluateStatus({ azimuthDeg: 0, altitudeDeg: -3 }, free, w(0)).status).toBe('night'));
  it('no weather data → never claims sunny', () => expect(evaluateStatus(up, free, null).status).toBe('cloudy'));
  it('DNI overrides cloud cover (thin cirrus)', () => expect(evaluateStatus(up, free, w(85, 450)).status).toBe('sunny'));
  it('low DNI means no sun despite little cloud', () => expect(evaluateStatus(up, free, w(20, 40)).status).toBe('cloudy'));
});
