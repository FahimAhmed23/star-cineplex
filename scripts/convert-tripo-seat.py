"""Convert a Tripo (AI) seat .glb into the hall's packed seat format.

Decimates the ~500k-triangle mesh, welds Tripo's UV seams (otherwise they open as cracks), bakes the texture into
vertex attributes and writes a .glb with POSITION, NORMAL, COLOR_0, _TINT (1 = red upholstery, recoloured per branch
at runtime) and _ROUGH, facing -Z with the origin at the floor centre (CLAUDE.md §4).

Usage:  python scripts/convert-tripo-seat.py <in.glb> <out-raw.glb> <triangles> <sx> <sy> <sz> <back_z> [smooth=0]
  sx/sy/sz  scale of the model's normalised size (Tripo exports ~1 unit tall)
  back_z    z of the seat back, to line up with the hall (premium 0.371, vip 0.487)
Then meshopt-compress the result like scripts/pack-models.mjs (dedup, weld, prune, meshopt) into public/models.
Used for seat-premium / seat-atmos (3000 tris, 0.82 1.08 0.85 0.371) and seat-vip (4500, 0.98 1.17 1.12 0.487).
Needs: pip install trimesh fast-simplification scipy pillow
"""
import sys, json, struct, numpy as np, trimesh, fast_simplification
from scipy.spatial import cKDTree
src, out, target = sys.argv[1], sys.argv[2], int(sys.argv[3])
sx, sy, sz, back_z = map(float, sys.argv[4:8])
sc = trimesh.load(src); m = list(sc.geometry.values())[0]
mat = m.visual.material
base = np.asarray(mat.baseColorTexture.convert('RGB')).astype(np.float32) / 255
rm = np.asarray(mat.metallicRoughnessTexture.convert('RGB')).astype(np.float32) / 255 if mat.metallicRoughnessTexture is not None else None
uv = m.visual.uv
def sample(img, uv):
    h, w = img.shape[:2]
    x = np.clip(uv[:, 0], 0, 1) * (w - 1); y = (1 - np.clip(uv[:, 1], 0, 1)) * (h - 1)
    return img[y.astype(int), x.astype(int)]
# texture is sRGB: linearise for glTF vertex colours
col = sample(base, uv); col_lin = col ** 2.2
rough = sample(rm, uv)[:, 1] if rm is not None else np.full(len(uv), 0.8)
# simplify
# Tripo splits vertices along texture seams; weld by position first so the seams don't open as cracks
w = trimesh.Trimesh(m.vertices.copy(), m.faces.copy(), process=False)
w.merge_vertices(merge_tex=True, merge_norm=True, digits_vertex=5)
print('welded', len(m.vertices), '->', len(w.vertices))
v2, f2 = fast_simplification.simplify(w.vertices.astype(np.float32), w.faces.astype(np.int32), target_count=target)
s = trimesh.Trimesh(v2, f2, process=True)
# AI meshes are noisy: a light Taubin smooth keeps the shape and removes the lumps
trimesh.smoothing.filter_taubin(s, lamb=0.5, nu=-0.53, iterations=int(sys.argv[8]) if len(sys.argv) > 8 else 6)
# carry colour/roughness from the 8 nearest original vertices
tree = cKDTree(m.vertices); d, idx = tree.query(s.vertices, k=8)
w = 1 / (d + 1e-4); w /= w.sum(1, keepdims=True)
c = (col_lin[idx] * w[..., None]).sum(1); c_s = (col[idx] * w[..., None]).sum(1)
r = (rough[idx] * w).sum(1)
# upholstery = clearly red in the texture → recoloured per branch at runtime (_TINT = 1, colour = white-ish shade)
# wider sample (k=48) so the texture's dark seam lines don't become cracks
d48, i48 = tree.query(s.vertices, k=48)
c_w = col[i48].mean(1)
red = (c_w[:, 0] > 0.18) & (c_w[:, 0] > 1.5 * c_w[:, 1]) & (c_w[:, 0] > 1.5 * c_w[:, 2])
# clean the upholstery mask: majority vote over mesh neighbours, a few rounds
nb = s.vertex_neighbors
lab = red.astype(float)
for _ in range(4):
    lab = np.array([(lab[i] * 2 + lab[n].sum()) / (2 + len(n)) if len(n) else lab[i] for i, n in enumerate(nb)])
red = lab > 0.5
tint = red.astype(np.float32)
lum = c_w.max(1)
ref = np.percentile(lum[red], 70) if red.any() else 1
shade = np.clip(lum / ref, 0.82, 1.0) ** 2.2   # only a gentle shade variation on the upholstery
# frames, arms, legs: neutral dark greys (no navy cast), keeping relative brightness
g = np.clip(c_w.mean(1), 0.02, 0.6)
grey = np.repeat((np.clip(g * 0.9, 0.03, 0.45) ** 2.2)[:, None], 3, 1)
color = np.where(red[:, None], np.repeat(shade[:, None], 3, 1), grey)
rough = np.clip(np.where(red, np.maximum(r, 0.75), r), 0.3, 1)
# orient: model fronts face +Z → rotate 180° about Y so the seat faces −Z (towards the screen)
V = s.vertices.copy(); V[:, 0] *= -1; V[:, 2] *= -1
V *= np.array([sx, sy, sz]); V[:, 1] -= V[:, 1].min(); V[:, 0] -= (V[:, 0].min() + V[:, 0].max()) / 2
V[:, 2] += back_z - V[:, 2].max()   # back of the seat lines up with the old model
s2 = trimesh.Trimesh(V, s.faces, process=False)
N = s2.vertex_normals.astype(np.float32)
print(out, 'tris', len(s.faces), 'verts', len(V), 'upholstery %', round(tint.mean() * 100), 'size', (V.max(0) - V.min(0)).round(3), 'bounds z', V[:, 2].min().round(3), V[:, 2].max().round(3))
# write a minimal GLB with POSITION, NORMAL, COLOR_0, _TINT, _ROUGH
arrs = [V.astype(np.float32), N, color.astype(np.float32), tint, rough.astype(np.float32), s.faces.astype(np.uint32).ravel()]
blob = b''; views = []; accs = []
types = ['VEC3', 'VEC3', 'VEC3', 'SCALAR', 'SCALAR', 'SCALAR']
for i, a in enumerate(arrs):
    b = a.astype(a.dtype).tobytes(); off = len(blob); blob += b + b'\0' * ((4 - len(b) % 4) % 4)
    views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(b), **({'target': 34963} if i == 5 else {'target': 34962})})
    acc = {'bufferView': i, 'componentType': 5125 if i == 5 else 5126, 'count': len(a) if a.ndim == 2 else (a.size), 'type': types[i]}
    if i == 0: acc['min'] = V.min(0).tolist(); acc['max'] = V.max(0).tolist()
    accs.append(acc)
gl = {'asset': {'version': '2.0', 'generator': 'star-cineplex convert.py'}, 'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0, 'name': 'seat'}],
      'materials': [{'name': 'seat', 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': 0.8}}],
      'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'COLOR_0': 2, '_TINT': 3, '_ROUGH': 4}, 'indices': 5, 'material': 0}]}],
      'buffers': [{'byteLength': len(blob)}], 'bufferViews': views, 'accessors': accs}
js = json.dumps(gl).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + blob
open(out, 'wb').write(glb)
np.save(out + '.preview.npy', {'V': V, 'F': s.faces, 'C': color, 'T': tint}, allow_pickle=True)
