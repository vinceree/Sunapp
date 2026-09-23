# Sonnenradar

Eine Karte wie Google Maps, die zeigt, **wo gerade wirklich Sonne ist**: Gebäudeschatten
(aus Sonnenstand + Gebäudehöhen) kombiniert mit der **realen Bewölkung** (Open-Meteo / DWD ICON-D2).

- **Gelb** = Sonne · **dunkel** = Gebäudeschatten · **grau** = schattenfrei, aber bewölkt
- Zeitregler: jetzt bis +12 h, mit Sonne/Wolken-Leiste pro Stunde
- Auf die Karte tippen → Status für genau diesen Punkt + Stundenverlauf

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest (Geometrie, Status-Logik, Parser)
npm run build
```

Funktioniert überall, wo die Kartenkacheln Gebäude enthalten. Startpunkt ist Karlsruhe.

## Architektur

```
src/
  domain/      reine, getestete Logik – kein React, kein I/O
    geo.ts         lokale Meter-Projektion um einen Punkt
    shadow.ts      Ray-Cast Punkt → Sonne gegen Gebäude-Prismen; Schattenpolygone
    sunStatus.ts   Sonnenstand × Schatten × Wetter → ☀️ / ⛅ / 🌑 / 🌙
  map/
    SunMap.tsx     MapLibre-Karte, Schatten-Layer, Klick
    buildings.ts   Gebäude (Umriss + Höhe) aus den geladenen Vektorkacheln
    shadowCanvas.ts zeichnet Sonne/Wolken-Tönung + Schatten in ein Canvas
  services/    SunCalc, Open-Meteo, Forecast-Hook
  components/  Info-Panel für einen Punkt, Stunden-Zeitleiste
```

### Entscheidungen

- **Karte: MapLibre GL + OpenFreeMap** (kostenlos, kein API-Key). Die Vektorkacheln enthalten
  bereits OSM-Gebäude mit `render_height`/`render_min_height`, deshalb ist kein Overpass nötig.
  Gebäude werden als 3D-Blöcke gezeigt.
- **Schatten werden selbst berechnet** (nicht Cesium/Three.js-Shadow-Maps): Jeder Gebäudeumriss
  wird entlang des Schattenvektors `h / tan(Sonnenhöhe)` verschoben. Die Flächen werden in ein
  Canvas gezeichnet, das als eigener Layer **unter** den 3D-Gebäuden liegt. Der Klick-Status
  nutzt dieselbe Geometrie per Ray-Cast, deshalb stimmen Karte und Ampel immer überein.
- **Wetter: Open-Meteo „best_match“** = in Deutschland DWD ICON-D2 (2 km). Abgefragt wird für die
  Kartenmitte, neu geladen nach ~2 km Verschiebung oder 15 min.
- **„Sonne“ = Direktstrahlung ≥ 120 W/m²** (WMO-Definition der Sonnenscheindauer). Das ist
  besser als die bloße Bewölkung, weil dünne Cirren oft trotzdem Sonne durchlassen. Fallback ist
  Bewölkung ≤ 40 %.

### Bekannte Grenzen

- Gebäudehöhen: Fehlen in OSM Höhe und Stockwerke, nehmen die Kacheln 5 m an. In der Innenstadt
  ist das oft zu niedrig. Eine mögliche Verbesserung sind die amtlichen LoD2-Gebäudemodelle
  (in BW frei verfügbar).
- Nur Boden-Schatten (keine Schatten auf Dächern), kein Gelände, keine Bäume.
- Schatten erst ab Zoom 15 (vorher sind nicht alle Gebäude in den Kacheln).
- Bewölkung ist ein Wert für den ganzen Kartenausschnitt (Modellraster 2 km).
