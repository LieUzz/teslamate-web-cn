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

// 汽油燃烧的 CO₂ 排放系数 (kg/L)
export const CO2_KG_PER_LITRE_PETROL = 2.31;

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
