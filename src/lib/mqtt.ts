import mqtt, { MqttClient } from 'mqtt';

// TeslaMate 通过 MQTT 发布的实时状态 (retained)。没收到的字段保持 undefined，不做任何假设。
export interface CarMqttState {
  display_name?: string;
  state?: string;
  since?: string;
  version?: string;
  geofence?: string;
  sentry_mode?: boolean;
  locked?: boolean;
  doors_open?: boolean;
  windows_open?: boolean;
  frunk_open?: boolean;
  trunk_open?: boolean;
  is_climate_on?: boolean;
  battery_heater?: boolean;
  battery_level?: number;
  usable_battery_level?: number;
  rated_battery_range_km?: number;
  ideal_battery_range_km?: number;
  est_battery_range_km?: number;
  odometer?: number;
  speed?: number;
  power?: number;
  inside_temp?: number;
  outside_temp?: number;
  latitude?: number;
  longitude?: number;
  tpms_pressure_fl?: number;
  tpms_pressure_fr?: number;
  tpms_pressure_rl?: number;
  tpms_pressure_rr?: number;
  shift_state?: string;
  heading?: number;
  elevation?: number;
  // 充电
  plugged_in?: boolean;
  charging_state?: string;
  charger_power?: number;
  charger_voltage?: number;
  charger_actual_current?: number;
  charge_energy_added?: number;
  time_to_full_charge?: number;
  charge_limit_soc?: number;
  charge_port_door_open?: boolean;
  // 空调 / 乘员
  climate_keeper_mode?: string;
  is_preconditioning?: boolean;
  is_user_present?: boolean;
  // 软件更新
  update_available?: boolean;
  update_version?: string;
  install_perc?: number;
  download_perc?: number;
  // 胎压警告 (车辆自己给出的信号)
  tpms_soft_warning_fl?: boolean;
  tpms_soft_warning_fr?: boolean;
  tpms_soft_warning_rl?: boolean;
  tpms_soft_warning_rr?: boolean;
  // 各车门 / 车窗
  driver_front_door_open?: boolean;
  driver_rear_door_open?: boolean;
  passenger_front_door_open?: boolean;
  passenger_rear_door_open?: boolean;
  driver_front_window_open?: boolean;
  driver_rear_window_open?: boolean;
  passenger_front_window_open?: boolean;
  passenger_rear_window_open?: boolean;
  // 最后一次收到该车任意 MQTT 消息的时间 (ISO)
  received_at?: string;
}

const BOOLEAN_KEYS = new Set([
  'sentry_mode', 'locked', 'doors_open', 'windows_open', 'frunk_open', 'trunk_open', 'is_climate_on', 'battery_heater',
  'plugged_in', 'charge_port_door_open', 'is_preconditioning', 'is_user_present', 'update_available',
  'tpms_soft_warning_fl', 'tpms_soft_warning_fr', 'tpms_soft_warning_rl', 'tpms_soft_warning_rr',
  'driver_front_door_open', 'driver_rear_door_open', 'passenger_front_door_open', 'passenger_rear_door_open',
  'driver_front_window_open', 'driver_rear_window_open', 'passenger_front_window_open', 'passenger_rear_window_open',
]);
const NUMBER_KEYS = new Set([
  'battery_level', 'usable_battery_level', 'rated_battery_range_km', 'ideal_battery_range_km', 'est_battery_range_km',
  'odometer', 'speed', 'power', 'inside_temp', 'outside_temp', 'latitude', 'longitude',
  'tpms_pressure_fl', 'tpms_pressure_fr', 'tpms_pressure_rl', 'tpms_pressure_rr',
  'heading', 'elevation', 'charger_power', 'charger_voltage', 'charger_actual_current', 'charge_energy_added',
  'time_to_full_charge', 'charge_limit_soc', 'install_perc', 'download_perc',
]);
const STRING_KEYS = new Set([
  'display_name', 'state', 'since', 'version', 'geofence', 'shift_state',
  'charging_state', 'climate_keeper_mode', 'update_version',
]);

const carStates = new Map<number, CarMqttState>();
let client: MqttClient | null = null;

export function initMqtt() {
  if (client) return;

  const host = process.env.MQTT_HOST;
  if (!host) {
    console.warn('MQTT_HOST is not set, live state disabled');
    return;
  }
  const port = process.env.MQTT_PORT || '1883';
  const namespace = process.env.MQTT_NAMESPACE ? `teslamate/${process.env.MQTT_NAMESPACE}` : 'teslamate';
  const url = `mqtt://${host}:${port}`;
  const prefix = `${namespace}/cars/`;

  try {
    client = mqtt.connect(url, {
      clientId: `teslamate_cn_web_${Math.random().toString(16).slice(2, 8)}`,
      username: process.env.MQTT_USERNAME || undefined,
      password: process.env.MQTT_PASSWORD || undefined,
      connectTimeout: 4000,
      reconnectPeriod: 5000,
    });

    client.on('connect', () => {
      console.log('Connected to TeslaMate MQTT broker at', url);
      client?.subscribe(`${prefix}#`);
    });

    client.on('message', (topic, message) => {
      // topic 格式: {namespace}/cars/{car_id}/{key}
      if (!topic.startsWith(prefix)) return;
      const [idPart, ...keyParts] = topic.slice(prefix.length).split('/');
      const carId = parseInt(idPart, 10);
      if (isNaN(carId) || keyParts.length === 0) return;
      const key = keyParts.join('_');
      const valStr = message.toString().trim();

      const current = (carStates.get(carId) || {}) as Record<string, unknown>;
      if (valStr === '' || valStr === 'nil' || valStr === 'null') {
        delete current[key];
      } else if (BOOLEAN_KEYS.has(key)) {
        current[key] = valStr === 'true';
      } else if (NUMBER_KEYS.has(key)) {
        const n = Number(valStr);
        if (Number.isFinite(n)) current[key] = n;
        else delete current[key];
      } else if (STRING_KEYS.has(key)) {
        current[key] = valStr;
      }
      current.received_at = new Date().toISOString();
      carStates.set(carId, current as CarMqttState);
    });

    client.on('error', (err) => {
      console.warn('MQTT connection warning:', err.message);
    });
  } catch (err) {
    console.warn('MQTT init failed:', err);
  }
}

// 获取车辆最新 MQTT 状态；没有数据时返回空对象
export function getCarMqttState(carId: number): CarMqttState {
  if (!client) {
    initMqtt();
  }
  return carStates.get(carId) || {};
}
