// Builds data/branch-map.json for the branches constellation (CLAUDE.md §8.9): the Bangladesh outline from Natural
// Earth (via the world-atlas package, public domain) projected to SVG, plus each branch's position on the country
// map and in the magnified Dhaka lens. Run from the project root:
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
const LENS = ["bashundhara-city", "shimanto-shambhar", "sks-tower", "sony-square", "military-museum", "centrepoint", "shimanto-tower"];

const W = 1000, H = 820;
const MAP = [[20, 30], [530, 800]]; // the country, left
const proj = geoMercator().fitExtent(MAP, bd);
const r1 = (v) => Math.round(v * 10) / 10;
const outline = geoPath(proj)(bd).replace(/\d+\.\d+/g, (n) => String(r1(+n)));

const pts = {};
for (const [slug, [lat, lon]] of Object.entries(B)) { const [x, y] = proj([lon, lat]); pts[slug] = { map: { x: r1(x), y: r1(y) } }; }
// Chattogram's two branches are ~1.6 km apart: spread them a little so both stars read (art direction)
pts["bali-arcade"].map.x += 7; pts["finlay-square"].map.x -= 7;

// the Dhaka lens: the 7 Dhaka-area branches at their true relative positions, magnified
const lens = { cx: 805, cy: 190, r: 160 };
const lensFeat = { type: "MultiPoint", coordinates: LENS.map((s) => [B[s][1], B[s][0]]) };
const lp = geoMercator().fitExtent([[lens.cx - lens.r * 0.62, lens.cy - lens.r * 0.7], [lens.cx + lens.r * 0.62, lens.cy + lens.r * 0.7]], lensFeat);
// spread the dense centre (Panthapath, Dhanmondi, Bijoy Sarani, Mohakhali are 1-2 km apart) with a radial
// ease around the cluster's middle, then fit the result back into the lens
const raw = LENS.map((s) => lp([B[s][1], B[s][0]]));
const core = ["bashundhara-city", "shimanto-shambhar", "military-museum", "sks-tower"].map((s) => lp([B[s][1], B[s][0]]));
const c = [core.reduce((a, p) => a + p[0], 0) / core.length, core.reduce((a, p) => a + p[1], 0) / core.length];
const eased = raw.map(([x, y]) => { const dx = x - c[0], dy = y - c[1], d = Math.hypot(dx, dy) || 1; const k = Math.pow(d, 0.55) / d; return [dx * k, dy * k]; });
const ex = eased.map((p) => p[0]), ey = eased.map((p) => p[1]);
const cx0 = (Math.min(...ex) + Math.max(...ex)) / 2, cy0 = (Math.min(...ey) + Math.max(...ey)) / 2;
const sc = (lens.r * 1.32) / Math.max(Math.max(...ex) - Math.min(...ex), Math.max(...ey) - Math.min(...ey));
LENS.forEach((s, i) => { pts[s].lens = { x: r1(lens.cx + (eased[i][0] - cx0) * sc), y: r1(lens.cy + (eased[i][1] - cy0) * sc) }; });
// the Dhaka hub on the country map: centre of the 7
const hub = { x: r1(LENS.reduce((a, s) => a + pts[s].map.x, 0) / LENS.length), y: r1(LENS.reduce((a, s) => a + pts[s].map.y, 0) / LENS.length) };
// lens scale: km per lens unit, for a small scale note
const kmPerUnit = (6371 * Math.PI / 180) / (lp.scale() * Math.PI / 180) ;
writeFileSync("data/branch-map.json", JSON.stringify({ viewBox: [W, H], outline, hub, lens, points: pts, approx: true }, null, 2) + "\n");
console.log("outline chars", outline.length, "hub", hub, "ctg", pts["bali-arcade"].map, pts["finlay-square"].map);
console.log(Object.fromEntries(LENS.map(s=>[s,pts[s].lens])));
