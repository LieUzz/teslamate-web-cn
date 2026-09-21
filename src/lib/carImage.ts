import { Car } from '@/types';
import { CAR_IMAGE_ENDPOINT, CAR_IMAGE_SIZE_PX, CAR_IMAGE_VIEW } from './constants';

// TeslaMate 的 cars.model / exterior_color / wheel_type → 特斯拉配置器的选项代码。
// 图片服务对不认识的代码也返回 200 (一张缺车身或缺轮毂的图)，所以这里只收录逐个请求并目视 / 按体积确认过的组合；
// 查不到就返回 null，界面不显示渲染图，不猜。
const PAINT_CODES: Record<string, string> = {
  SolidBlack: 'PBSB',
  MidnightSilver: 'PMNG',
  DeepBlue: 'PPSB',
  PearlWhite: 'PPSW',
  RedMulticoat: 'PPMR',
};

const MODELS: Record<string, { model: string; interior: string; wheels: Record<string, string> }> = {
  '3': { model: 'm3', interior: 'IBB1', wheels: { Pinwheel18: 'W38B', Aero18: 'W38B', Stiletto19: 'W39B', Sportwheel19: 'W39B', Performancewheel20: 'W32P' } },
  Y: { model: 'my', interior: 'INPB0', wheels: { Apollo19: 'WY19B', Induction20: 'WY20P', Uberturbine21: 'WY21P' } },
};

export function buildCarImageUrl(car: Pick<Car, 'model' | 'exterior_color' | 'wheel_type'>): string | null {
  const spec = car.model ? MODELS[car.model] : undefined;
  const paint = car.exterior_color ? PAINT_CODES[car.exterior_color] : undefined;
  const wheel = spec && car.wheel_type ? spec.wheels[car.wheel_type] : undefined;
  if (!spec || !paint || !wheel) return null;

  const params = new URLSearchParams({
    model: spec.model,
    view: CAR_IMAGE_VIEW,
    size: String(CAR_IMAGE_SIZE_PX),
    options: [paint, wheel, spec.interior].map((code) => `$${code}`).join(','),
    bkba_opt: '1', // 透明背景
    context: 'design_studio_2',
  });
  return `${CAR_IMAGE_ENDPOINT}?${params.toString()}`;
}
