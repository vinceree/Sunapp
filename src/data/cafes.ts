import { fromLocal } from '../domain/geo';
import type { Building, Cafe } from '../domain/types';

// Milestone 1: a single test location on Karlsruhe's Marktplatz with a
// synthetic building. Replaced by real cafés + OSM buildings in milestone 2.
export const TEST_CAFE: Cafe = {
  id: 'test-marktplatz',
  name: 'Test-Café am Marktplatz',
  terrace: { lat: 49.00937, lng: 8.40391 },
};

function rectangle(origin: Cafe['terrace'], x0: number, y0: number, x1: number, y1: number) {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ].map((v) => fromLocal(origin, v));
}

// 22 m block ~20–45 m south-west of the terrace: throws shadow on the terrace
// in the early/mid afternoon, when the sun is in the south-west.
export const TEST_BUILDINGS: Building[] = [
  {
    id: 'test-block-sw',
    name: 'Testgebäude (22 m)',
    footprint: rectangle(TEST_CAFE.terrace, -40, -45, -12, -20),
    heightM: 22,
  },
];
