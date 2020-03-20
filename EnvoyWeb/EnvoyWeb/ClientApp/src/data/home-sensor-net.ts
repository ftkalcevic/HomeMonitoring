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
