// 约定：任何可能"未知"的值一律为 null，由界面显示 "--" / "暂无数据"，数据层不得用默认值顶替

// 视图模式
export type ViewMode = 'auto' | 'mobile' | 'desktop';

// 外观主题偏好
export type ThemePreference = 'system' | 'light' | 'dark';

// 车辆实时状态
export interface Car {
  id: number;
  name: string | null;
  model: string | null;
  trim_badging: string | null;
  marketing_name: string | null;
  vin: string | null;
  exterior_color: string | null;
  wheel_type: string | null;
  usable_battery_level: number | null;
  battery_level: number | null;
  // 按 TeslaMate settings.preferred_range 选取的续航 (ideal 或 rated)
  range_km: number | null;
  est_battery_range_km: number | null;
  odometer: number | null;
  speed: number | null;
  power: number | null;
  state: 'driving' | 'charging' | 'asleep' | 'online' | 'offline' | 'suspended' | 'updating' | string | null;
  since: string | null;
  inside_temp: number | null;
  outside_temp: number | null;
  is_climate_on: boolean | null;
  is_locked: boolean | null;
  is_sentry_mode: boolean | null;
  doors_open: boolean | null;
  windows_open: boolean | null;
  frunk_open: boolean | null;
  trunk_open: boolean | null;
  tire_pressure_fl: number | null;
  tire_pressure_fr: number | null;
  tire_pressure_rl: number | null;
  tire_pressure_rr: number | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  version: string | null;
  battery_heater: boolean | null;
  // 以下均为 TeslaMate 只通过 MQTT 发布的实时值，没收到就是 null
  shift_state: string | null;
  is_user_present: boolean | null;
  is_preconditioning: boolean | null;
  // 'off' | 'on' (保持) | 'dog' | 'camp'
  climate_keeper_mode: string | null;
  doors: CarOpenings;
  windows: CarOpenings;
  tire_warning_fl: boolean | null;
  tire_warning_fr: boolean | null;
  tire_warning_rl: boolean | null;
  tire_warning_rr: boolean | null;
  charging: CarChargingState;
  update_available: boolean | null;
  update_version: string | null;
  install_percent: number | null;
  download_percent: number | null;
  // 最后一次收到实时数据的时间；null = 本次运行还没收到过
  live_updated_at: string | null;
}

// 四个车门 / 车窗各自是否开着
export interface CarOpenings {
  driver_front: boolean | null;
  driver_rear: boolean | null;
  passenger_front: boolean | null;
  passenger_rear: boolean | null;
}

export interface CarChargingState {
  plugged_in: boolean | null;
  // TeslaMate 原样转发的车辆充电状态：Charging / Complete / Stopped / Disconnected / NoPower / Starting ...
  charging_state: string | null;
  charger_power_kw: number | null;
  charger_voltage: number | null;
  charger_current: number | null;
  energy_added_kwh: number | null;
  // 小时
  time_to_full_charge_h: number | null;
  charge_limit_soc: number | null;
  charge_port_door_open: boolean | null;
}

// 行程摘要
export interface DriveSummary {
  id: number;
  car_id: number;
  start_date: string;
  end_date: string | null;
  duration_min: number | null;
  distance: number | null;
  speed_max: number | null;
  speed_avg: number | null;
  power_max: number | null;
  power_min: number | null;
  start_address: string | null;
  end_address: string | null;
  start_battery_level: number | null;
  end_battery_level: number | null;
  consumption_kwh: number | null;
  efficiency_wh_km: number | null;
  start_position_id?: number | null;
  end_position_id?: number | null;
  ascent?: number | null;
  descent?: number | null;
  outside_temp_avg?: number | null;
  // 起终点标识 (地理围栏 id 或地址 id)，用于判断相邻行程是否首尾相接
  start_place_key?: string | null;
  end_place_key?: string | null;
  // 智能合并字段
  is_merged?: boolean;
  merged_count?: number;
  merged_drive_ids?: number[];
  stopover_duration_min?: number;
}

// 行程详情与轨迹点
export interface DriveDetail extends DriveSummary {
  positions: PositionPoint[];
}

export interface PositionPoint {
  id: number;
  date: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  power: number | null;
  battery_level: number | null;
  odometer: number | null;
  elevation: number | null;
  inside_temp?: number | null;
  outside_temp?: number | null;
}

// 全量足迹轨迹段 (用于绘制全景行车大地图)
export interface FootprintDrivePath {
  id: number;
  start_date: string;
  distance: number | null;
  duration_min: number | null;
  start_address: string | null;
  end_address: string | null;
  points: [number, number][]; // [lat, lng] GCJ-02
}

// 停车段摘要
export interface ParkingSummary {
  id: number;
  car_id: number;
  start_date: string;
  end_date: string | null;
  duration_min: number | null;
  start_range_km: number | null;
  end_range_km: number | null;
  start_battery_level: number | null;
  end_battery_level: number | null;
  range_lost_km: number | null;
  energy_lost_kwh: number | null;
  drain_rate_kwh_per_hour: number | null;
  address: string | null;
  is_home: boolean | null;
  has_charge: boolean;
  is_current: boolean;
}

// 停车详情
export interface ParkingDetail extends ParkingSummary {
  points: ParkingPoint[];
}

export interface ParkingPoint {
  date: string;
  battery_level: number | null;
  range_km: number | null;
  inside_temp?: number | null;
  outside_temp?: number | null;
}

// 充电记录摘要
export interface ChargeSummary {
  id: number;
  car_id: number;
  start_date: string;
  end_date: string | null;
  duration_min: number | null;
  charge_energy_added: number | null;
  charge_energy_used: number | null;
  start_battery_level: number | null;
  end_battery_level: number | null;
  start_range_km: number | null;
  end_range_km: number | null;
  cost: number | null;
  // cost 的来源：teslamate = charging_processes.cost；tou = 汉化仪表盘分时电价表；configured = 配置的电价估算
  cost_source: 'teslamate' | 'tou' | 'configured' | null;
  address: string | null;
  is_fast_charge: boolean | null;
  fast_charger_brand: string | null;
  max_charger_power_kw: number | null;
}

export interface ChargeDetail extends ChargeSummary {
  points: ChargePoint[];
}

export interface ChargePoint {
  date: string;
  battery_level: number | null;
  charge_energy_added: number | null;
  charger_power: number | null;
  charger_voltage?: number | null;
  charger_actual_current?: number | null;
  outside_temp?: number | null;
}

// 电量去向剖析 (只统计有记录的数据)
export interface EnergyBreakdown {
  total_energy_added_kwh: number | null;
  grid_energy_used_kwh: number | null;
  driving_energy_kwh: number | null;
  parking_drain_kwh: number | null;
  charging_loss_kwh: number | null;
  driving_percent: number | null;
  parking_percent: number | null;
  charging_efficiency_percent: number | null;
  online_hours: number | null;
  asleep_hours: number | null;
  offline_hours: number | null;
  avg_parking_drain_kwh_per_hour: number | null;
}

// 电池健康
export interface BatteryHealthInfo {
  // 由充电记录推导的当前满电可用容量 (kWh)
  current_capacity_kwh: number | null;
  // 有记录以来推导出的最大容量 (kWh)，接入 TeslaMate 之后的基准，不等于出厂值
  max_observed_capacity_kwh: number | null;
  // 当前满电续航估算 (km)
  estimated_full_range_km: number | null;
  // 出厂满电续航：来自配置 BATTERY_ORIGINAL_RANGE_KM，未配置为 null
  original_full_range_km: number | null;
  health_percent: number | null;
  degradation_percent: number | null;
  // health/degradation 的对比基准
  baseline: 'configured_original' | 'max_observed' | null;
  slow_charge_count: number | null;
  fast_charge_count: number | null;
  total_energy_added_kwh: number | null;
  cycle_count: number | null;
  is_lfp: boolean | null;
  // 参与容量推导的充电次数
  sample_count: number;
}

// 月度能耗报告
export interface MonthlyReport {
  month: string;
  drive_count: number;
  distance_km: number;
  drive_kwh: number | null;
  avg_wh_km: number | null;
  charge_count: number;
  charge_energy_kwh: number;
  charge_cost: number | null;
  // 有多少次充电没有费用数据 (不计入 charge_cost)
  unpriced_charge_count: number;
}

// 首页用车小结：自然日 / 自然周 (周一起) / 自然月，按配置时区
export type UsagePeriod = 'today' | 'week' | 'month';
export interface UsageSummary {
  period: UsagePeriod;
  drive_count: number;
  distance_km: number | null;
  drive_kwh: number | null;
  avg_wh_km: number | null;
  charge_count: number;
  charge_energy_kwh: number | null;
  charge_cost: number | null;
  unpriced_charge_count: number;
}

// 气温能耗关联点
export interface TemperatureEfficiencyPoint {
  temp: number;
  drive_count: number;
  avg_wh_km: number;
}

// 常用地点驻留统计
export interface VisitedLocation {
  name: string;
  visit_count: number;
  total_parking_hours: number | null;
  is_home: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
}

// 全生命周期统计
export interface LifetimeStats {
  total_drives: number; // 智能合并后的连贯行程数
  raw_total_drives: number; // 原始底表记录总数
  total_distance_km: number | null; // 车辆当前总里程 (odometer)
  logged_distance_km: number | null; // TeslaMate 实际记录的行驶里程
  first_logged_odometer: number | null; // 首次接入 TeslaMate 时的里程读数
  first_logged_date: string | null;
  total_drive_duration_hours: number | null;
  total_energy_kwh: number | null;
  avg_efficiency_wh_km: number | null;
  total_charges: number;
  total_charge_energy_added: number | null;
  total_charge_cost: number | null;
  unpriced_charge_count: number;
  asleep_duration_hours: number | null;
}

// 极值单项记录
export interface DrivingRecordItem {
  value: number;
  formatted_value: string;
  unit: string;
  title: string;
  sub_text?: string;
  date: string | null;
  location?: string | null;
  drive_id?: number;
  secondary_value?: string;
}

// 某时间周期下的完整极值榜单；没有合格行程的项为 null
export interface DrivingRecords {
  period: RecordPeriod;
  drive_count: number;
  max_speed: DrivingRecordItem | null;
  longest_distance: DrivingRecordItem | null;
  longest_duration: DrivingRecordItem | null;
  best_efficiency: DrivingRecordItem | null;
  max_power: DrivingRecordItem | null;
  max_regen: DrivingRecordItem | null;
  max_ascent: DrivingRecordItem | null;
  extreme_temp: {
    lowest: DrivingRecordItem | null;
    highest: DrivingRecordItem | null;
  };
}

// 里程碑单项
export interface CarMilestone {
  target_km: number;
  label: string;
  is_achieved: boolean;
  // true = 接入 TeslaMate 之前就已超过，达成时间未知
  achieved_before_logging?: boolean;
  achieved_date?: string | null;
  achieved_duration_days?: number | null;
  drive_id?: number | null;
  current_progress_percent?: number | null;
  remaining_km?: number | null;
  predicted_days_remaining?: number | null;
  predicted_date?: string | null;
}

// 里程碑总览
export interface CarMilestonesData {
  car_id: number | null;
  delivery_date: string | null; // 来自配置 DELIVERY_DATE
  days_since_delivery: number | null;
  current_odometer: number | null;
  // 提车至今日均 = 当前总里程 ÷ 提车天数 (需要配置提车日)
  daily_avg_km: number | null;
  // 近期日均 = 有记录里程 ÷ 有记录天数，用于预测
  recent_daily_avg_km: number | null;
  milestones: CarMilestone[];
}

export type RecordPeriod = 'month' | 'half_year' | 'year' | 'all';
export type DrivingRecordsByPeriod = Record<RecordPeriod, DrivingRecords>;
