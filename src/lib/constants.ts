// 算法常数：不是数据，也不是用户参数。改动会改变统计口径。

// 相邻行程间隔不超过该分钟数，且首尾地点一致时，合并为一段连贯行程
export const MERGE_MAX_GAP_MINUTES = 10;
// TeslaMate 相邻记录的时间戳可能有少量重叠
export const MERGE_GAP_SLACK_MINUTES = -1;

// 短于该时长的两段行程间隔不算一次停车
export const MIN_PARKING_SECONDS = 120;
// 停车详情曲线最多抽样的点数
export const PARKING_CURVE_TARGET_POINTS = 200;

// 距离过短的行程能耗噪声很大，不参与能耗类统计
export const MIN_DISTANCE_FOR_EFFICIENCY_KM = 0.5;
// 参与"最佳能耗"评选的最短行程
export const MIN_DISTANCE_FOR_EFFICIENCY_RECORD_KM = 3;
// 足迹地图忽略的极短行程
export const MIN_DISTANCE_FOR_FOOTPRINT_KM = 0.2;
// 足迹地图最多绘制最近多少段行程 (界面上要说明这个范围)
export const FOOTPRINT_MAX_DRIVES = 1000;
// 足迹地图每段行程抽样的目标点数
export const FOOTPRINT_TARGET_POINTS = 120;

// 极值榜的滚动窗口 (天)
export const RECORD_WINDOW_DAYS = { month: 30, half_year: 180, year: 365 } as const;

// 电池容量推导 (同 TeslaMate Grafana "Battery Health")：只用充入电量足够大的充电，避免小样本噪声
export const BATTERY_HEALTH_MIN_ENERGY_ADDED_KWH = 5;
export const BATTERY_HEALTH_MIN_SOC_DELTA = 10;
// 取最近 N 次合格充电的中位数作为"当前容量"
export const BATTERY_HEALTH_RECENT_SAMPLES = 10;

// 有记录的天数少于该值时，不计算"近期日均里程"，也不据此预测
export const MIN_LOGGED_DAYS_FOR_DAILY_AVG = 7;

// 里程碑阶梯 (km)
export const MILESTONE_TARGETS_KM: { target: number; label: string }[] = [
  { target: 1000, label: '1,000 km' },
  { target: 5000, label: '5,000 km' },
  { target: 10000, label: '10,000 km' },
  { target: 20000, label: '20,000 km' },
  { target: 50000, label: '50,000 km' },
  { target: 100000, label: '100,000 km' },
  { target: 150000, label: '150,000 km' },
  { target: 200000, label: '200,000 km' },
  { target: 300000, label: '300,000 km' },
];

// 逆地理编码：对外部服务的请求间隔 (Nominatim 使用政策要求 ≤1 次/秒)
export const GEOCODER_MIN_INTERVAL_MS = 1100;
export const GEOCODER_TIMEOUT_MS = 4000;
export const GEOCODER_CACHE_MAX_ENTRIES = 5000;

// 首页实时车况的轮询间隔：行驶 / 充电时数据几秒一变，停车时变化很慢，休眠时 TeslaMate 不会唤醒车辆
export const LIVE_POLL_MS_ACTIVE = 5_000;
export const LIVE_POLL_MS_ONLINE = 30_000;
export const LIVE_POLL_MS_ASLEEP = 120_000;

// 车辆渲染图：特斯拉官方配置器的图片服务
export const CAR_IMAGE_ENDPOINT = 'https://static-assets.tesla.cn/configurator/compositor';
export const CAR_IMAGE_VIEW = 'STUD_3QTR';
export const CAR_IMAGE_SIZE_PX = 1000;
export const CAR_IMAGE_TIMEOUT_MS = 10_000;
export const CAR_IMAGE_BROWSER_MAX_AGE_S = 30 * 24 * 3600;

// 首页 3D 车模 (components/home/CarStage.tsx)：模型文件缓存期与舞台参数
export const CAR_MODEL_BROWSER_MAX_AGE_S = 30 * 24 * 3600;
// 车身长度 (m)，模型按此归一化；Model Y 4.75 m，轮胎半径约 0.36 m
export const SCENE3D_CAR_LENGTH_M = 4.75;
export const SCENE3D_WHEEL_RADIUS_M = 0.36;
// 相机球坐标：r 距离 (m)、yaw / pitch 角度 (度)、fov。车头朝 -Z，yaw=180 在正前方
export const SCENE3D_HERO_POSE = { r: 5.9, yaw: 142, pitch: 10, fov: 30 } as const;
export const SCENE3D_ENTRANCE_FROM = { r: 8.5, yaw: 176, pitch: 3, fov: 36 } as const;
export const SCENE3D_ENTRANCE_MS = 1500;
export const SCENE3D_FADE_MS = 500;
// 入场后继续轻微摆动的时长，之后停止渲染
export const SCENE3D_IDLE_SECONDS = 20;
// 拖动转视角的范围 (相对英雄位)
export const SCENE3D_YAW_LIMIT_DEG = 70;
export const SCENE3D_PITCH_RANGE_DEG = [4, 22] as const;
export const SCENE3D_MAX_DPR = 2;
// 铰链打开角度 (度)
export const SCENE3D_HINGE_DEG = { door: 55, frunk: 45, trunk: 70, chargePort: 90 } as const;
export const SCENE3D_HINGE_MS = 700;
// 休眠 / 离线时的曝光
export const SCENE3D_DIM_EXPOSURE = 0.45;

// 首页渲染图动画 (纯装饰)：把车速 / 充电功率换算成动画周期，并钳制在上下限之间
export const SCENE_ROAD_SECONDS_AT_100_KMH = 0.5;
export const SCENE_ROAD_SECONDS_RANGE = [0.3, 3] as const;
export const SCENE_CHARGE_SECONDS_AT_50_KW = 1.4;
export const SCENE_CHARGE_SECONDS_RANGE = [0.8, 3.5] as const;

// 车辆控制 (Tesla Fleet API)：休眠的车先唤醒再发命令；唤醒按次计费，且命令超时后绝不重发 (可能重复执行)
export const FLEET_WAKE_TIMEOUT_MS = 30_000;
export const FLEET_WAKE_POLL_MS = 3_000;
export const FLEET_COMMAND_TIMEOUT_MS = 15_000;
export const FLEET_TOKEN_TIMEOUT_MS = 10_000;
// 本进程内的限流，远低于 Tesla 的上限 (30 命令 / 分、3 唤醒 / 分)
export const FLEET_MAX_COMMANDS_PER_MIN = 10;
export const FLEET_MAX_WAKES_PER_MIN = 2;
// access token 距过期不足该时长就先刷新
export const FLEET_TOKEN_REFRESH_MARGIN_MS = 60_000;
// OAuth state cookie 的有效期
export const FLEET_OAUTH_STATE_MAX_AGE_S = 600;
// 控制按钮：长按触发时长、结果提示停留时长
export const FLEET_LONG_PRESS_MS = 1_000;
export const FLEET_RESULT_FLASH_MS = 2_000;

// 停车待机功率分档 (W)：低于第一档视为已休眠，高于第二档视为偏高 (哨兵开启约 250–300 W)
export const PARKING_DRAIN_POWER_BANDS_W = { normal_from: 100, high_from: 300 } as const;
// 停车页掉电趋势图显示最近几个自然月
export const PARKING_DRAIN_TREND_MONTHS = 6;
