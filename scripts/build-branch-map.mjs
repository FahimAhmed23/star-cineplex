// Builds data/branch-map.json for the branches constellation (CLAUDE.md §8.9): the Bangladesh outline from Natural
// Earth (via the world-atlas package, public domain) projected to SVG, plus each branch's position on the country
// map and in the zoomed Dhaka–Chattogram view. Run from the project root:
//   npx --yes -p world-atlas@2 -p topojson-client -p d3-geo node scripts/build-branch-map.mjs
// (or npm i --no-save world-atlas@2 topojson-client d3-geo first). Branch coordinates below are approximate.
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { geoMercator, geoPath, geoArea } from "d3-geo";
const require = createRequire(import.meta.url);
const topo = require("world-atlas/countries-10m.json");
const { feature } = require("topojson-client");
const bd = feature(topo, topo.objects.countries).features.find((f) => f.properties.name === "Bangladesh");
// drop specks (tiny islands) so the outline reads cleanly at this size
bd.geometry.coordinates = bd.geometry.coordinates.filter((poly) => geoArea({ type: "Polygon", coordinates: poly }) > 2e-6);

// approximate branch locations (lat, lon) — sources: Wikipedia (Centrepoint), The Daily Star (areas); good to ~0.5 km
const B = {
  "bashundhara-city": [23.7509, 90.3906],
  "shimanto-shambhar": [23.7386, 90.3830],
  "sks-tower": [23.7800, 90.4005],
  "sony-square": [23.7989, 90.3530],
  "military-museum": [23.7716, 90.3886],
  "centrepoint": [23.8525, 90.4062],
  "shimanto-tower": [23.6600, 90.5050],
  "bali-arcade": [22.3606, 91.8370],
  "finlay-square": [22.3628, 91.8216],
};

const W = 1000, H = 820;
const MAP = [[20, 30], [530, 800]]; // the country, left
const proj = geoMercator().fitExtent(MAP, bd);
const r1 = (v) => Math.round(v * 10) / 10;
const outline = geoPath(proj)(bd).replace(/\d+\.\d+/g, (n) => String(r1(+n)));

const pts = {};
for (const [slug, [lat, lon]] of Object.entries(B)) { const [x, y] = proj([lon, lat]); pts[slug] = { map: { x: r1(x), y: r1(y) } }; }
// Chattogram's two branches are ~1.6 km apart: spread them a little so both stars read (art direction)
pts["bali-arcade"].map.x += 7; pts["finlay-square"].map.x -= 7;

// the zoomed view (Nov 27): Dhaka, Narayanganj and Chattogram in one crop of the outline. Stars closer than MIN units
// are pushed apart (with a weak pull back home) so each one reads; positions are approximate.
const MIN = 8;
const P = Object.fromEntries(Object.entries(pts).map(([k, v]) => [k, [v.map.x, v.map.y]]));
P["bali-arcade"][0] -= 7; P["finlay-square"][0] += 7; // undo the country-map spread; the relaxation spreads them
const home = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, [...v]]));
for (let it = 0; it < 400; it++) {
  const ks = Object.keys(P);
  for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
    const a = P[ks[i]], b = P[ks[j]];
    let dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1e-3;
    if (d < MIN) { const push = (MIN - d) / 2, ux = dx / d, uy = dy / d; a[0] -= ux * push; a[1] -= uy * push; b[0] += ux * push; b[1] += uy * push; }
  }
  for (const k of ks) { P[k][0] += (home[k][0] - P[k][0]) * 0.02; P[k][1] += (home[k][1] - P[k][1]) * 0.02; }
}
const crop = { x: 220, y: 342, w: 280, h: 290 };
const r2 = (v) => Math.round(v * 100) / 100;
const zoom = { crop, points: Object.fromEntries(Object.entries(P).map(([k, [x, y]]) => [k, { x: r2(((x - crop.x) / crop.w) * 100), y: r2(((y - crop.y) / crop.h) * 100) }])) };
writeFileSync("data/branch-map.json", JSON.stringify({ viewBox: [W, H], outline, points: pts, zoom, approx: true }, null, 2) + "\n");
console.log("outline chars", outline.length, zoom);
