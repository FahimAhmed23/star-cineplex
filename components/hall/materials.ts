import * as THREE from "three";

/**
 * Material for the packed seat / silhouette models (see scripts/pack-models.mjs).
 * - vertex `color` = base colour; `_tint` = 1 on upholstery; `_rough` = roughness
 * - per-instance `instanceColor` only recolours the upholstery (frames stay black, walnut stays walnut)
 * - per-instance `instanceGlow` (0..1) adds emissive on the upholstery: hover / highlight (§9.5)
 * - optional rim light (audience silhouettes, "faintly rim-lit by the screen light")
 */
export function createTintMaterial({ rim = false } = {}) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0 });
  const uniforms = {
    uRimColor: { value: new THREE.Color("#b784d6") },
    uRimStrength: { value: rim ? 0.18 : 0 },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
         attribute float _tint;
         attribute float _rough;
         attribute float instanceGlow;
         varying float vTint;
         varying float vRough;
         varying float vGlow;`,
      )
      .replace(
        "#include <color_vertex>",
        `vColor = vec4(1.0);
         #ifdef USE_COLOR
           vColor.rgb *= color.rgb;
         #endif
         #ifdef USE_INSTANCING_COLOR
           vColor.rgb *= mix(vec3(1.0), instanceColor.rgb, _tint);
         #endif
         vTint = _tint;
         vRough = _rough;
         vGlow = instanceGlow;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         uniform vec3 uRimColor;
         uniform float uRimStrength;
         varying float vTint;
         varying float vRough;
         varying float vGlow;`,
      )
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = vRough;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
         totalEmissiveRadiance += diffuseColor.rgb * vGlow * vTint;
         float rim = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 4.0);
         totalEmissiveRadiance += uRimColor * rim * uRimStrength;`,
      );
  };
  material.customProgramCacheKey = () => (rim ? "tint-rim" : "tint");
  return Object.assign(material, { rimUniforms: uniforms });
}

/** Emissive "light" material for accents, step lights, downlights — toneMapped off so Bloom picks it up. */
export function lightMaterial(color: string, intensity = 3) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color).multiplyScalar(intensity),
    toneMapped: false,
  });
}
