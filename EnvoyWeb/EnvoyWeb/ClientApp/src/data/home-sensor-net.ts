export interface ITank {
  deviceId: string;
  deviceName: string;
}

export interface ITankWaterer {
  moisture1: number;
  moisture2: number;
  tankVolume: number;
  tankFlow: number;
  tankOverflow: number;
  temperature: number;
  water24Hours: number;
  timestamp: Date;
}

export class Tank implements ITank {
  deviceId: string;
  deviceName: string;

  //public constructor(init?: Partial<ITank>) {
  //  Object.assign(this, init);
  //}

  public constructor(id: string, name: string) {
    this.deviceId = id;
    this.deviceName = name;
  }
}

export class TankWaterer implements ITankWaterer {
  moisture1: number;
  moisture2: number;
  tankVolume: number;
  tankFlow: number;
  tankOverflow: number;
  temperature: number;
  water24Hours: number;
  timestamp: Date;

  public constructor(init?: Partial<ITankWaterer>) {
    Object.assign(this, init);
  }
}

export interface IPotPlantStats {
  moisture: number;
  internalTemperature: number;
  externalTemperature: number;
  vBat: number;
  timestamp: Date;
}

export interface IRainGaugeStats {
  millimeters: number;
  temperature: number;
  humidity: number;
  vbat: number;
  vsolar: number;
  timestamp: Date;
}


export interface ICoolingFanStats {
  temperature: number;
  ambientTemperature: number;
  dutyCycle: number;
  rpm: number;
  alarms: string;
  silenced: Boolean;
  rssi: number;
  uptime: number;
  timestamp: Date;
}


export interface ICoolingFanConfig {
  manual_duty: number;
  t_min: number;
  t_max: number;
  min_duty: number;
  idle_duty: number;
  hysteresis: number;
  setpoint: number;
  kp: number;
  ki: number;
  ff_ambient: number;
  ff_gain: number;
  slew_rate: number;
  alarm_temp: number;
  report_interval: number;
  mode: string;
  control_source: string;
  alarm_enabled: Boolean;
  stall_alarm: Boolean;
  DeviceId: string;
  timestamp: Date;
  uptime: number;
}
