import { describe, expect, it } from 'vitest';
import { parseForecast, sampleAt } from './weather';

const raw = {
  current: { time: 1790168400, cloud_cover: 42, direct_normal_irradiance: 310.5 },
  hourly: {
    time: [1790168400, 1790172000],
    cloud_cover: [40, 80],
    cloud_cover_low: [10, 70],
    cloud_cover_mid: [0, 20],
    cloud_cover_high: [35, 5],
    direct_normal_irradiance_instant: [300, null],
  },
};

describe('parseForecast', () => {
  it('maps Open-Meteo unixtime fields to samples', () => {
    const f = parseForecast(raw);
    expect(f.current).toMatchObject({ time: 1790168400_000, cloudCover: 42, directNormalIrradiance: 310.5 });
    expect(f.hourly[1]).toMatchObject({ cloudCover: 80, cloudCoverLow: 70, directNormalIrradiance: null });
  });

  it('sampleAt picks the nearest hour and rejects far-away times', () => {
    const f = parseForecast(raw);
    expect(sampleAt(f, 1790172000_000 - 10 * 60_000)?.cloudCover).toBe(80);
    expect(sampleAt(f, 1790172000_000 + 3 * 3_600_000)).toBeNull();
  });
});
