"""Shared helpers for the Star Cineplex model scripts (CLAUDE.md §4 3D asset pipeline).

Conventions
- Units are metres. Blender is Z-up; the glTF exporter converts to Y-up, so Blender +Y becomes glTF -Z.
  Every seat therefore faces Blender +Y (= -Z in three.js, towards the screen).
- Origin = the seat's floor centre.
- Materials named "TINT_*" are upholstery: white base colour, recoloured at runtime per branch and seat state.
  All other materials keep their own colour. scripts/pack-models.mjs turns this into a per-vertex tint mask
  and merges each model into a single primitive (one draw call per seat type with InstancedMesh).
"""
import math
import bpy
import bmesh


_materials = {}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _materials.clear()


def mat(name, color=(1, 1, 1), rough=0.8, metal=0.0, emit=None, emit_strength=0.0):
    if name in _materials:
        return _materials[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emit is not None:
        bsdf.inputs["Emission Color"].default_value = (*emit, 1)
        bsdf.inputs["Emission Strength"].default_value = emit_strength
    _materials[name] = m
    return m


def srgb(hex_str):
    """'#RRGGBB' -> linear RGB tuple (Blender colour inputs are linear)."""
    h = hex_str.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def _finish(obj, material, bevel, segments, rot):
    obj.data.materials.append(material)
    if rot:
        obj.rotation_euler = tuple(math.radians(a) for a in rot)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if bevel > 0:
        mod = obj.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = segments
        mod.limit_method = "ANGLE"
        mod.angle_limit = math.radians(40)
        mod.harden_normals = False
        bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.select_set(False)
    return obj


def box(size, loc, material, bevel=0.0, segments=2, rot=None, name="box"):
    """Axis-aligned box: size=(x, y, z) in metres, loc = centre."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    return _finish(obj, material, bevel, segments, rot)


def cyl(radius, depth, loc, material, verts=12, rot=None, bevel=0.0, segments=1, name="cyl"):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    return _finish(obj, material, bevel, segments, rot)


def sphere(radius, loc, material, scale=(1, 1, 1), segments=12, rings=8, name="sphere"):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=radius, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    return _finish(obj, material, 0, 1, None)


def torus(major, minor, loc, material, rot=None, name="torus"):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=24, minor_segments=6,
                                     location=loc)
    obj = bpy.context.active_object
    obj.name = name
    return _finish(obj, material, 0, 1, rot)


def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = name
    obj.data.name = name
    # origin stays at world (0,0,0) = floor centre
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    me = obj.data
    me.shade_smooth()
    me.set_sharp_from_angle(angle=math.radians(35))
    # merge coincident verts from bevels, clean up
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    bm.to_mesh(me)
    bm.free()
    obj.select_set(False)
    return obj


def tri_count(obj):
    me = obj.data
    me.calc_loop_triangles()
    return len(me.loop_triangles)


def export(objs, path):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_normals=True,
        export_materials="EXPORT",
        export_texcoords=False,
    )
    tris = sum(tri_count(o) for o in objs)
    print(f"[sc] exported {path}  ({tris} triangles)")
    return tris
