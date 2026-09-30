// 车模材质：不用模型自带的材质 / 贴图，按材质名归类后统一换成这里的 PBR 材质，
// 这样任何来源的模型只要材质命名可辨认就能得到一致的观感，漆色也能随 TeslaMate 的颜色走。

import { Color, Material, MeshPhysicalMaterial, MeshStandardMaterial, DoubleSide } from 'three';
import { PaintSpec } from '@/lib/carPaint';

export type MaterialRole = 'paint' | 'glass' | 'tire' | 'rim' | 'chrome' | 'light_front' | 'light_rear' | 'interior' | 'trim';

const ROLE_PATTERNS: [MaterialRole, RegExp][] = [
  ['glass', /glass|window|windshield|windscreen|screen_front/i],
  ['light_rear', /tail|brake|rear.?light|light.?rear|light.?trunk/i],
  ['light_front', /head.?l|lamp|light|drl|fog/i],
  ['tire', /tire|tyre|rubber/i],
  ['rim', /rim|wheel|alloy|spoke|hub/i],
  ['chrome', /chrome|metal|steel|alumin|silver|mirror/i],
  ['paint', /paint|body|carpaint|exterior|shell|hood|door|trunk|bumper|fender/i],
  ['interior', /interior|seat|leather|carpet|dash|console|suede|belt|steering|plastic/i],
];

// 材质名 → 角色；匹配不到的一律当作黑色饰件
export function roleForMaterialName(name: string): MaterialRole {
  for (const [role, re] of ROLE_PATTERNS) if (re.test(name)) return role;
  return 'trim';
}

export interface CarMaterials {
  byRole: Record<MaterialRole, Material>;
  paint: MeshPhysicalMaterial;
  lightRear: MeshStandardMaterial;
  lightFront: MeshStandardMaterial;
  dispose(): void;
}

export function createCarMaterials(spec: PaintSpec): CarMaterials {
  const paint = new MeshPhysicalMaterial({
    color: new Color(spec.hex),
    metalness: spec.metallic,
    roughness: spec.roughness,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.1,
  });
  const glass = new MeshPhysicalMaterial({
    color: new Color(0x0d1319),
    metalness: 0.9,
    roughness: 0.06,
    transparent: true,
    opacity: 0.82,
    envMapIntensity: 1.2,
    side: DoubleSide,
  });
  const tire = new MeshStandardMaterial({ color: new Color(0x0e0e0e), roughness: 0.95, metalness: 0 });
  const rim = new MeshStandardMaterial({ color: new Color(0x2a2b2e), roughness: 0.35, metalness: 0.85 });
  const chrome = new MeshStandardMaterial({ color: new Color(0xcfd2d6), roughness: 0.15, metalness: 1 });
  const lightFront = new MeshStandardMaterial({ color: new Color(0xf4f7fb), emissive: new Color(0xffffff), emissiveIntensity: 0.35, roughness: 0.2, metalness: 0.2 });
  const lightRear = new MeshStandardMaterial({ color: new Color(0x5a0a10), emissive: new Color(0xff2a2a), emissiveIntensity: 0.25, roughness: 0.25, metalness: 0.2 });
  const interior = new MeshStandardMaterial({ color: new Color(0x141416), roughness: 0.9, metalness: 0 });
  const trim = new MeshStandardMaterial({ color: new Color(0x0a0a0b), roughness: 0.6, metalness: 0.2 });

  const byRole: Record<MaterialRole, Material> = {
    paint,
    glass,
    tire,
    rim,
    chrome,
    light_front: lightFront,
    light_rear: lightRear,
    interior,
    trim,
  };

  return {
    byRole,
    paint,
    lightRear,
    lightFront,
    dispose() {
      for (const m of Object.values(byRole)) m.dispose();
    },
  };
}
