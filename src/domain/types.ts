/** [lat, lng] in WGS84 degrees. */
export type LatLng = { lat: number; lng: number };

export type Building = {
  id: string;
  name?: string;
  /** Closed or open outer ring; the last vertex need not repeat the first. */
  footprint: LatLng[];
  heightM: number;
};

export type Cafe = {
  id: string;
  name: string;
  /** Position of the terrace / outdoor seating, not the building entrance. */
  terrace: LatLng;
};

export type SunPosition = {
  /** Degrees clockwise from north (0 = N, 90 = E, 180 = S, 270 = W). */
  azimuthDeg: number;
  /** Apparent altitude above the horizon in degrees. */
  altitudeDeg: number;
};

export type WeatherSample = {
  /** Unix time in ms, start of the interval the values describe. */
  time: number;
  /** Total cloud cover in %. */
  cloudCover: number;
  cloudCoverLow?: number;
  cloudCoverMid?: number;
  cloudCoverHigh?: number;
  /** Direct normal irradiance in W/m² (null if the source did not provide it). */
  directNormalIrradiance: number | null;
};

export type SunStatus = 'sunny' | 'cloudy' | 'shaded' | 'night';
