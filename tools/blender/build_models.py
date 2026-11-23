"""Builds the Star Cineplex low-poly models and exports raw .glb files.

Run headless (from the project root):
  "C:\\Program Files\\Blender Foundation\\Blender 5.3\\blender.exe" -b --factory-startup \
      --python tools/blender/build_models.py -- tools/blender/out
then: npm run models   (packs + compresses into /public/models)

Models (look references: references/ai/seat-*.png, audience-silhouettes.png, cinema-doors.png)
- seat-premium        classic cinema seat, fabric, black arms with cup holders, pedestal legs  (pitch 0.60 m)
- seat-semi-recliner  deeper cushions + headrest pillow, plinth base                          (pitch 0.60 m)
- seat-vip            leather recliner, footrest out, walnut swivel side table                 (pitch 0.95 m)
- seat-atmos          wingback premium seat                                                   (pitch 0.60 m)
- person-a..d         stylised seated audience silhouettes (short hair, long hair, bun, broad)
- doors               padded purple leather double doors, portholes, brass push plates
"""
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from sc_lib import box, cyl, export, join, mat, reset, sphere, srgb, torus  # noqa: E402

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "tools/blender/out"
os.makedirs(OUT, exist_ok=True)
report = {}


def frame():
    return mat("FRAME", srgb("#151316"), rough=0.45, metal=0.1)


def fabric():
    return mat("TINT_FABRIC", (1, 1, 1), rough=0.95)


def leather():
    return mat("TINT_LEATHER", (1, 1, 1), rough=0.5)


def save(name, parts):
    obj = join(parts, name)
    report[name] = export([obj], os.path.join(OUT, f"{name}.glb"))


# ───────────────────────────── Premium ─────────────────────────────
def seat_premium():
    reset()
    F, T = frame(), fabric()
    p = []
    for s in (-1, 1):
        x = s * 0.272
        p.append(box((0.05, 0.42, 0.40), (x, 0.0, 0.20), F, bevel=0.01, name="standard"))      # leg standard
        p.append(box((0.07, 0.40, 0.025), (x, 0.02, 0.012), F, bevel=0.006, name="foot"))       # foot plate
        p.append(box((0.045, 0.56, 0.36), (x, 0.0, 0.42), T, bevel=0.02, name="side"))          # upholstered side
        p.append(box((0.06, 0.58, 0.05), (x, 0.03, 0.625), F, bevel=0.02, name="arm"))          # armrest top
    p.append(cyl(0.035, 0.05, (0.272, 0.28, 0.635), F, verts=12, name="cup"))                   # cup holder (right)
    p.append(box((0.48, 0.50, 0.13), (0, 0.07, 0.43), T, bevel=0.05, segments=3, name="cushion"))
    p.append(box((0.48, 0.15, 0.66), (0, -0.20, 0.83), T, bevel=0.06, segments=3, rot=(-12, 0, 0), name="back"))
    p.append(box((0.46, 0.04, 0.62), (0, -0.29, 0.81), F, bevel=0.015, rot=(-12, 0, 0), name="shell"))
    save("seat-premium", p)


# ───────────────────────────── Semi-Recliner ─────────────────────────────
def seat_semi_recliner():
    reset()
    F, T = frame(), fabric()
    p = []
    p.append(box((0.50, 0.62, 0.10), (0, 0.0, 0.05), F, bevel=0.01, name="plinth"))
    for s in (-1, 1):
        x = s * 0.27
        p.append(box((0.055, 0.70, 0.44), (x, 0.02, 0.32), T, bevel=0.025, name="side"))
        p.append(box((0.065, 0.66, 0.05), (x, 0.06, 0.565), F, bevel=0.02, name="arm"))
    p.append(cyl(0.035, 0.05, (0.27, 0.32, 0.58), F, verts=12, name="cup"))
    p.append(box((0.48, 0.60, 0.17), (0, 0.10, 0.40), T, bevel=0.07, segments=3, name="cushion"))
    p.append(box((0.48, 0.20, 0.62), (0, -0.22, 0.78), T, bevel=0.07, segments=3, rot=(-15, 0, 0), name="back"))
    p.append(box((0.34, 0.14, 0.18), (0, -0.25, 1.17), T, bevel=0.06, segments=3, rot=(-15, 0, 0), name="headrest"))
    p.append(box((0.46, 0.04, 0.80), (0, -0.33, 0.80), F, bevel=0.015, rot=(-15, 0, 0), name="shell"))
    save("seat-semi-recliner", p)


# ───────────────────────────── VIP recliner ─────────────────────────────
def seat_vip():
    reset()
    F, L = frame(), leather()
    wood = mat("WALNUT", srgb("#4A2C1C"), rough=0.55)
    metal = mat("METAL", srgb("#2A2A2E"), rough=0.35, metal=0.8)
    p = []
    p.append(box((0.80, 0.86, 0.10), (0, -0.02, 0.05), F, bevel=0.01, name="plinth"))
    for s in (-1, 1):
        x = s * 0.33
        p.append(box((0.15, 0.92, 0.52), (x, 0.0, 0.36), L, bevel=0.05, segments=3, name="arm"))
    p.append(cyl(0.04, 0.05, (-0.33, 0.30, 0.62), F, verts=12, name="cup"))
    p.append(box((0.52, 0.66, 0.20), (0, 0.06, 0.42), L, bevel=0.07, segments=3, name="cushion"))
    p.append(box((0.52, 0.24, 0.62), (0, -0.30, 0.78), L, bevel=0.08, segments=3, rot=(-18, 0, 0), name="back"))
    p.append(box((0.44, 0.16, 0.20), (0, -0.36, 1.13), L, bevel=0.07, segments=3, rot=(-18, 0, 0), name="headrest"))
    p.append(box((0.50, 0.40, 0.12), (0, 0.55, 0.33), L, bevel=0.05, segments=3, rot=(25, 0, 0), name="footrest"))
    p.append(box((0.50, 0.07, 0.24), (0, 0.42, 0.30), F, bevel=0.01, name="footrest-hinge"))
    # swivel side table on the right arm
    p.append(cyl(0.015, 0.16, (0.33, 0.20, 0.69), metal, verts=8, name="post"))
    p.append(box((0.30, 0.22, 0.022), (0.30, 0.24, 0.78), wood, bevel=0.008, name="table"))
    save("seat-vip", p)


# ───────────────────────────── Atmos ─────────────────────────────
def seat_atmos():
    reset()
    F, T = frame(), fabric()
    p = []
    p.append(box((0.50, 0.56, 0.10), (0, 0.0, 0.05), F, bevel=0.01, name="plinth"))
    for s in (-1, 1):
        x = s * 0.27
        p.append(box((0.05, 0.64, 0.46), (x, 0.02, 0.33), F, bevel=0.02, name="arm-panel"))
        p.append(box((0.065, 0.64, 0.05), (x, 0.04, 0.58), F, bevel=0.02, name="arm"))
        p.append(box((0.07, 0.22, 0.56), (s * 0.22, -0.24, 0.98), T, bevel=0.04, segments=3, rot=(-10, 0, s * 12),
                     name="wing"))
    p.append(cyl(0.035, 0.05, (0.27, 0.28, 0.595), F, verts=12, name="cup"))
    p.append(box((0.46, 0.56, 0.17), (0, 0.08, 0.41), T, bevel=0.07, segments=3, name="cushion"))
    p.append(box((0.40, 0.20, 0.74), (0, -0.22, 0.86), T, bevel=0.07, segments=3, rot=(-12, 0, 0), name="back"))
    p.append(box((0.44, 0.04, 0.78), (0, -0.32, 0.86), F, bevel=0.015, rot=(-12, 0, 0), name="shell"))
    save("seat-atmos", p)


# ───────────────────────────── Audience silhouettes ─────────────────────────────
def person(name, hair, shoulders=0.42, height=1.0):
    """Seated, stylised, no faces. Single tinted material; colour comes from the instance."""
    reset()
    B = mat("TINT_BODY", (1, 1, 1), rough=0.9)
    h = height
    p = []
    p.append(box((shoulders - 0.08, 0.22, 0.30), (0, -0.09, 0.62 * h), B, bevel=0.05, segments=2, rot=(-8, 0, 0),
                 name="waist"))
    p.append(box((shoulders, 0.24, 0.26), (0, -0.12, 0.86 * h), B, bevel=0.09, segments=3, rot=(-8, 0, 0),
                 name="chest"))
    p.append(cyl(0.05, 0.10, (0, -0.13, 1.03 * h), B, verts=8, name="neck"))
    p.append(sphere(0.105, (0, -0.12, 1.16 * h), B, scale=(0.9, 1.0, 1.12), name="head"))
    for s in (-1, 1):
        p.append(box((0.15, 0.42, 0.13), (s * 0.1, 0.12, 0.52), B, bevel=0.05, segments=2, name="thigh"))
        p.append(box((0.11, 0.12, 0.44), (s * 0.1, 0.36, 0.24), B, bevel=0.04, segments=2, name="shin"))
        p.append(box((0.08, 0.30, 0.09), (s * (shoulders / 2 + 0.005), 0.02, 0.66 * h), B, bevel=0.035, segments=2,
                     name="forearm"))
    top = 1.16 * h
    if hair == "short":
        p.append(sphere(0.112, (0, -0.135, top + 0.025), B, scale=(0.95, 1.05, 0.95), name="hair"))
    elif hair == "long":
        p.append(sphere(0.115, (0, -0.14, top + 0.015), B, scale=(1.0, 1.05, 1.0), name="hair"))
        p.append(box((0.24, 0.10, 0.30), (0, -0.20, top - 0.12), B, bevel=0.045, segments=2, name="hair-long"))
    elif hair == "bun":
        p.append(sphere(0.11, (0, -0.135, top + 0.02), B, scale=(0.95, 1.05, 0.95), name="hair"))
        p.append(sphere(0.055, (0, -0.22, top + 0.08), B, name="bun"))
    elif hair == "curly":
        p.append(sphere(0.125, (0, -0.135, top + 0.035), B, scale=(1.05, 1.05, 0.95), segments=10, rings=6,
                        name="hair"))
    save(name, p)


# ───────────────────────────── Cinema doors ─────────────────────────────
def doors():
    """Two leaves, each hinged on its outer edge (origin on the hinge line) — ready for a rotateY swing."""
    reset()
    leather_m = mat("DOOR_LEATHER", srgb("#4B1E4F"), rough=0.55)
    stitch = mat("DOOR_STITCH", srgb("#2A0F2D"), rough=0.7)
    brass = mat("BRASS", srgb("#C9A24A"), rough=0.3, metal=1.0)
    glass = mat("PORTHOLE", srgb("#FFB35C"), rough=0.2, emit=srgb("#FFB35C"), emit_strength=2.0)
    W, H, D = 1.05, 2.5, 0.08
    leaves = []
    for side, s in (("door-left", -1), ("door-right", 1)):
        # built with the hinge at x=0, leaf extending towards the centre (−s direction)
        cx = -s * W / 2
        p = [box((W, D, H), (cx, 0, H / 2), leather_m, bevel=0.03, segments=3, name="leaf")]
        for i in range(1, 6):  # vertical stitching
            p.append(box((0.008, 0.006, H - 0.2), (cx - s * (W / 2 - i * W / 6) + s * 0.0, D / 2 + 0.002, H / 2),
                         stitch, name="stitch"))
        p.append(torus(0.17, 0.025, (cx, D / 2 + 0.01, 1.75), brass, rot=(90, 0, 0), name="porthole-ring"))
        p.append(cyl(0.16, 0.01, (cx, D / 2 + 0.004, 1.75), glass, verts=24, rot=(90, 0, 0), name="porthole"))
        p.append(box((0.10, 0.02, 0.36), (-s * (W - 0.12), D / 2 + 0.012, 1.08), brass, bevel=0.006, name="plate"))
        obj = join(p, side)
        obj.location.x = s * W  # hinges at x = ±W, leaves meet at x = 0
        leaves.append(obj)
    report["doors"] = export(leaves, os.path.join(OUT, "doors.glb"))


seat_premium()
seat_semi_recliner()
seat_vip()
seat_atmos()
person("person-a", "short")
person("person-b", "long", shoulders=0.38, height=0.97)
person("person-c", "bun", shoulders=0.37, height=0.96)
person("person-d", "curly", shoulders=0.48, height=1.03)
doors()

print("[sc] triangles:", report)
over = {k: v for k, v in report.items() if k.startswith("seat") and v > 3000}
if over:
    print("[sc] WARNING over the 3k triangle budget:", over)
