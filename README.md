# Sonnenradar Karlsruhe

Web-App-Prototyp: Wo liegt **jetzt wirklich** Sonne auf Café-Terrassen – und in den nächsten Stunden?
Kombiniert **geometrischen Gebäudeschatten** mit **realer Bewölkung / Direktstrahlung**:

| Status | Bedeutung |
|---|---|
| ☀️ Sonnig | kein Gebäude verdeckt die Sonne **und** der Himmel ist klar |
| ⛅ Schattenfrei, aber bewölkt | Sichtlinie zur Sonne frei, aber Wolken |
| 🌑 Verschattet | ein Gebäude verdeckt die Sonne (unabhängig vom Wetter) |
| 🌙 | Sonne unter dem Horizont |

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest (Geometrie, Status-Logik, Parser)
npm run build
```

## Architektur

```
src/
  domain/      reine, getestete Logik – kein React, kein I/O
    geo.ts         lokale Meter-Projektion (ENU) um einen Punkt
    shadow.ts      Ray-Cast Punkt → Sonne gegen Gebäude-Prismen; Schattenpolygone fürs Rendering
    sunStatus.ts   Kombination Sonnenstand × Schatten × Wetter → Ampel
  services/    I/O-Adapter
    sun.ts         SunCalc-Wrapper
    weather.ts     Open-Meteo (cloud_cover + Direktstrahlung)
    useForecast.ts React-Hook, 15-min-Refresh
  data/        Cafés & (vorerst) Testgebäude
  components/  UI: StatusCard, Timeline, ShadowPlan (2D-Draufsicht)
```

### Entscheidungen

**Schatten wird analytisch berechnet, nicht über den Renderer.**
Die Frage „Liegt Punkt P im Schatten?“ lässt sich für Gebäude als Prismen mit Flachdach exakt
per 2D-Ray-Cast beantworten: Strahl von P in Richtung Sonnen-Azimut, erste Kante jedes
Gebäudes finden, Verdeckungswinkel `atan((h − 1,2 m) / d)` mit der Sonnenhöhe vergleichen.
Das kostet Mikrosekunden pro Café und Zeitschritt, ist unit-testbar und funktioniert ohne GPU.
Ein Status aus einer Shadow-Map (Cesium oder Three.js) auszulesen wäre dagegen umständlich
(GPU-Readback), aufs Pixel genau begrenzt und im Test nicht deterministisch.

**3D-Ansicht: MapLibre GL statt CesiumJS/Three.js (Meilenstein 4).**
- *CesiumJS*: Schatten sind eingebaut, aber das Bundle ist mehrere MB groß. Die gut aussehenden
  „OSM Buildings“ gibt es nur mit Cesium-Ion-Token. Es rechnet eigene Schatten, die von unserer
  Statuslogik abweichen können. Zu schwer für den Nutzen.
- *Three.js*: Man müsste Kartenkacheln, Kamera und Georeferenzierung selbst bauen.
- *MapLibre GL* (+ freie Kacheln, z. B. OpenFreeMap): `fill-extrusion` liefert 2,5D-Gebäude
  aus unseren OSM-Daten, die Schattenpolygone aus `shadow.ts` liegen als GeoJSON-Layer darauf.
  Karte und Status nutzen **dieselbe** Geometrie und können nicht auseinanderlaufen.

**Wetter: Open-Meteo, Modell „best_match“.** Für Deutschland stammt das in den ersten ~2 Tagen
bereits aus **DWD ICON-D2** (2 km). Eine eigene DWD-Anbindung (GRIB) bringt also keinen
Präzisionsgewinn. Kein API-Key, CORS-fähig.

**„Sonnig“ = Direktstrahlung ≥ 120 W/m² (WMO-Definition der Sonnenscheindauer).**
Die Gesamtbewölkung allein ist irreführend: 80 % dünne Cirren lassen oft klare Schatten zu.
Liefert die Quelle keine Strahlung, greift der Fallback „Bewölkung ≤ 40 %“.

## Roadmap

1. ✅ Ein Café, Testgebäude, SunCalc, Open-Meteo, Ampel, Stundenzeitleiste, 2D-Draufsicht
2. 10–20 echte Cafés (kuratierte Liste, Terrassen-Koordinaten) + OSM-Gebäude via Overpass
   (`height` → `building:levels × 3 m + Dach` → Default 12 m), als statisches GeoJSON gecacht
3. Übersichtsliste / Karte aller Cafés mit Zeitleiste
4. MapLibre-2,5D-Karte mit Gebäude-Extrusion und Schattenlayer
