import {
  GeolocateControl,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  ScaleControl,
  type CanvasSource,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './maplibreWorker';
import { useEffect, useRef } from 'react';
import type { Building, LatLng, SunPosition } from '../domain/types';
import { BUILDING_SOURCE, buildingsFromMap } from './buildings';
import { drawShadows, frameFor, type CanvasFrame, type SkyTint } from './shadowCanvas';

export const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
/** Below this zoom building tiles are incomplete, so shadows would be wrong. */
export const MIN_SHADOW_ZOOM = 15;
const MAX_CANVAS_PX = 4096;
const SHADOW_SOURCE = 'sun-shadows';

type Props = {
  initialCenter: LatLng;
  sun: SunPosition;
  tint: SkyTint;
  picked: LatLng | null;
  onPick: (p: LatLng) => void;
  onBuildings: (b: Building[]) => void;
  onView: (v: { center: LatLng; zoom: number }) => void;
};

export function SunMap({ initialCenter, sun, tint, picked, onPick, onBuildings, onView }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null as unknown as HTMLCanvasElement);
  const cache = useRef<{ buildings: Building[]; frame: CanvasFrame | null }>({ buildings: [], frame: null });
  // Latest props for use inside map event handlers.
  const latest = useRef({ sun, tint, onPick, onBuildings, onView });
  useEffect(() => {
    latest.current = { sun, tint, onPick, onBuildings, onView };
  });

  const redraw = useRef(() => {});

  useEffect(() => {
    canvas.current = document.createElement('canvas');
    const map = new MapLibreMap({
      container: container.current!,
      style: STYLE_URL,
      center: [initialCenter.lng, initialCenter.lat],
      zoom: 16.5,
      pitch: 35,
      maxPitch: 70,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new GeolocateControl({ trackUserLocation: false }), 'top-right');
    map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left');

    let viewDirty = true;

    redraw.current = () => {
      const src = map.getSource<CanvasSource>(SHADOW_SOURCE);
      const { frame, buildings } = cache.current;
      if (!src || !frame) return;
      const { sun, tint } = latest.current;
      drawShadows(canvas.current, frame, buildings, sun, map.getZoom() >= MIN_SHADOW_ZOOM ? tint : 'none');
      src.play();
      map.once('render', () => src.pause());
    };

    const refresh = () => {
      const frame = frameFor(map.getBounds());
      // Aim for ~screen resolution at the current zoom, capped for memory.
      const worldPx = 512 * 2 ** map.getZoom() * Math.min(window.devicePixelRatio, 2);
      const scale = Math.min(1, MAX_CANVAS_PX / (Math.max(frame.maxX - frame.minX, frame.maxY - frame.minY) * worldPx));
      canvas.current.width = Math.max(1, Math.round((frame.maxX - frame.minX) * worldPx * scale));
      canvas.current.height = Math.max(1, Math.round((frame.maxY - frame.minY) * worldPx * scale));
      const buildings = map.getZoom() >= MIN_SHADOW_ZOOM - 0.5 ? buildingsFromMap(map) : [];
      cache.current = { buildings, frame };
      map.getSource<CanvasSource>(SHADOW_SOURCE)?.setCoordinates(frame.coordinates);
      redraw.current();
      latest.current.onBuildings(buildings);
    };

    map.on('load', () => {
      canvas.current.width = canvas.current.height = 1;
      map.addSource(SHADOW_SOURCE, {
        type: 'canvas',
        canvas: canvas.current,
        animate: false,
        coordinates: frameFor(map.getBounds()).coordinates,
      });
      // Below the building layers: shadows lie on the ground, roofs stay clean.
      const firstBuildingLayer = map
        .getStyle()
        .layers.find((l) => l.type === 'fill-extrusion' || ('source-layer' in l && l['source-layer'] === 'building'));
      map.addLayer(
        {
          id: SHADOW_SOURCE,
          type: 'raster',
          source: SHADOW_SOURCE,
          paint: { 'raster-opacity': 0.5, 'raster-fade-duration': 0 },
        },
        firstBuildingLayer?.id,
      );
      viewDirty = true;
    });

    map.on('moveend', () => {
      viewDirty = true;
      const c = map.getCenter();
      latest.current.onView({ center: { lat: c.lat, lng: c.lng }, zoom: map.getZoom() });
    });
    // "idle" = all tiles for the current view are loaded → building set is complete.
    map.on('idle', () => {
      if (!viewDirty || !map.getSource(SHADOW_SOURCE)) return;
      viewDirty = false;
      refresh();
    });
    map.on('sourcedata', (e) => {
      if (e.sourceId === BUILDING_SOURCE && e.isSourceLoaded) viewDirty = true;
    });
    map.on('click', (e) => latest.current.onPick({ lat: e.lngLat.lat, lng: e.lngLat.lng }));

    return () => map.remove();
    // The map is created once; later prop changes flow through `latest`.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => redraw.current(), [sun, tint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerRef.current?.remove();
    markerRef.current = picked ? new Marker({ color: '#e5484d' }).setLngLat([picked.lng, picked.lat]).addTo(map) : null;
  }, [picked]);

  return <div ref={container} className="map" />;
}
