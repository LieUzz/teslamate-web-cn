// 3D 车模的漆色：按 TeslaMate 的 exterior_color 取色。对照表之外的颜色返回 null，
// 首页据此留在 2D 渲染图，不臆造颜色 (与 carImage.ts 的规则一致)。客户端可用。

import { Car } from '@/types';

export interface PaintSpec {
  hex: number;
  metallic: number;
  roughness: number;
}

const PAINTS: Record<string, PaintSpec> = {
  SolidBlack: { hex: 0x0b0b0d, metallic: 0.55, roughness: 0.32 },
  MidnightSilver: { hex: 0x3a3d42, metallic: 0.85, roughness: 0.3 },
  DeepBlue: { hex: 0x10305e, metallic: 0.8, roughness: 0.3 },
  PearlWhite: { hex: 0xe8e8e6, metallic: 0.3, roughness: 0.28 },
  RedMulticoat: { hex: 0x9c0f1c, metallic: 0.7, roughness: 0.28 },
  // 2021 年后的常见颜色
  QuickSilver: { hex: 0x9a9da3, metallic: 0.9, roughness: 0.28 },
  UltraRed: { hex: 0xa3121f, metallic: 0.7, roughness: 0.26 },
  StealthGrey: { hex: 0x4b4d50, metallic: 0.8, roughness: 0.34 },
};

export function paintFor(car: Pick<Car, 'exterior_color'>): PaintSpec | null {
  if (!car.exterior_color) return null;
  return PAINTS[car.exterior_color] ?? null;
}
