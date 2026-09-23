const timeFmt = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });

export const fmtTime = (t: number | Date) => timeFmt.format(t);
export const fmtDeg = (d: number) => `${d.toFixed(1)}°`;

const DIRS = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
export const compass = (azimuthDeg: number) => DIRS[Math.round((((azimuthDeg % 360) + 360) % 360) / 45) % 8];
