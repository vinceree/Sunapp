import { setWorkerUrl } from 'maplibre-gl';
// MapLibre ≥ 6 resolves its worker relative to its own module file, which does
// not survive bundling. Let Vite bundle the worker (with its shared chunk).
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(workerUrl);
