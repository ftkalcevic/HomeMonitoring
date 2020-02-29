import { Injectable, Inject, EventEmitter, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { EnergyPlans, EnergyPlan, MyEnergyPlan } from '../../data/energy-plans';
import * as HomeSensorNet from '../../data/home-sensor-net';
import * as SoundRecordings from '../../data/sound-recordings';
import * as Weight from '../../data/Weight';

export interface IEnergy {
  Total: number;
  Yesterday: number;
  Today: number;
  Power: number;
  Factor: number;
  Voltage: number;
  Current: number;
}

export interface IStatusSNS {
  Time: Date;
  ENERGY: IEnergy;
}

export interface ISonoffSensorData {
  StatusSNS: IStatusSNS;
}


export class CircularBuffer<T> {
  private data: T[];
  public size: number;
  private first: number;
  private last: number;

  constructor(count:number) {
    this.data = [];
    this.size = count;
    this.first = 0;
    this.last = 0;
  }

  item(index: number): T {
    if (index < 0 || index > this.length)
      throw ("Index out of range: " + index.toString() + " is not between 0 and " + this.length.toString());
    let i: number = index + this.first;
    if (i >= this.size)
      i -= this.size;
    return this.data[i];
  }

  get length(): number {
    if (this.first <= this.last)
      return this.last - this.first;
    else
      return this.size - this.first + this.last;
  }

  append(item: T): void {
    this.data[this.last] = item;
    this.last++;
    if (this.last >= this.size)
      this.last = 0;
    if (this.first == this.last) {
      this.first++;
      if (this.first >= this.size)
        this.first = 0;
    }
  }
}

class RealtimeEnvoyData {
  data: CircularBuffer<LivePower>;
  maxProduction: number;
  maxConsumption: number;
  maxNet: number;
  minNet: number;

  constructor(maxSamples: number) {
    this.data = new CircularBuffer<LivePower>(maxSamples);
    this.maxProduction = 0;
    this.maxConsumption = 0;
    this.maxNet = 0;
    this.minNet = 0;
  }

  addSample(result: LivePower): void {

    if (result.wattsProduced > this.maxProduction) this.maxProduction = result.wattsProduced;
    if (result.wattsConsumed > this.maxConsumption) this.maxConsumption = result.wattsConsumed;
    if (result.wattsNet > this.maxNet) this.maxNet = result.wattsNet;
    if (result.wattsNet < this.minNet) this.minNet = result.wattsNet;

    this.data.append(result);
  }
};

export class LivePower implements ILivePower {
  receivedTime: number;
  timestamp: Date;
  wattsProduced: number;
  wattsConsumed: number;
  wattsNet: number;
} 

class SonoffDevice implements ISonoffDevice {
  id: number;    name: string;
  description: string;
  hostname: string;
  ipAddress: string;

  public constructor(init?: Partial<ISonoffDevice>) {
    Object.assign(this, init);
  }
}

export interface ISonoffSample {
  device: SonoffDevice;
  data: ISonoffSensorData;
  receivedTime: number;
}

export interface ISonoffDailyData {
  timestamp: Date;
  today: number;
  power: number;
}

export interface ISonoffHoursData
{
  year, month, day, hour: number;
  kWh: number;
};

export interface ISonoffDaysData {
  year, month, day: number;
  kWh: number;
};

export interface ISonoffSummaryData {
  timestamp: Date;
  today: number;
}

@Injectable({
  providedIn: 'root',
})
export class LiveDataService {
  private baseUrl: string;
  private http: HttpClient;
  public envoyLive: RealtimeEnvoyData;
  public sonoffDevices: SonoffDevice[];
  public tanks: HomeSensorNet.Tank[];
  public meters: any[];
  public sonoffLive: CircularBuffer<ISonoffSample>;
  @Output() envoyData: EventEmitter<LivePower> = new EventEmitter<LivePower>(true);
  @Output() sonoffData: EventEmitter<ISonoffSample> = new EventEmitter<ISonoffSample>(true);
  public energyPlans: EnergyPlans = new EnergyPlans();
  public myEnergyPlans: MyEnergyPlan[] =
    [
      { StartDate: new Date('1 Oct 2018'), EndDate: new Date('31 Dec 2019'), PlanId: 2 },
      { StartDate: new Date('1 Jan 2020'), EndDate: new Date('22 Feb 2020'), PlanId: 3 },
      { StartDate: new Date('23 Feb 2020'), EndDate: new Date('31 Dec 3020'), PlanId: 4 },
    ];
  //private energyPlan: EnergyPlan;
  readonly POINTS: number = 2000;
  public panelInfo = {
    "system_id": 1460367,
    "rotation": 0,
    "dimensions": {
      "x_min": -477,
      "x_max": 731,
      "y_min": -480,
      "y_max": 294
    },
    "arrays": [
      {
        "array_id": 2344175,
        "label": "North West Array",
        "x": -158,
        "y": -40,
        "azimuth": 327,
        "altitude": 25,
        "power": 330,
        "panel_size": {
          "width": 1016,
          "length": 1686
        },
        "modules": [
          {
            "module_id": 31414811,
            "rotation": 0,
            "x": -200,
            "y": -100,
            "inverter": {
              "inverter_id": 32104668,
              "serial_num": "121810018710"
            }
          },
          {
            "module_id": 31414812,
            "rotation": 0,
            "x": -100,
            "y": -100,
            "inverter": {
              "inverter_id": 32104663,
              "serial_num": "121810018431"
            }
          },
          {
            "module_id": 31414813,
            "rotation": 0,
            "x": 0,
            "y": -100,
            "inverter": {
              "inverter_id": 32104666,
              "serial_num": "121810018247"
            }
          },
          {
            "module_id": 31414814,
            "rotation": 0,
            "x": 100,
            "y": -100,
            "inverter": {
              "inverter_id": 32104665,
              "serial_num": "121810018433"
            }
          },
          {
            "module_id": 31414815,
            "rotation": 0,
            "x": 200,
            "y": -100,
            "inverter": {
              "inverter_id": 32104664,
              "serial_num": "121810018427"
            }
          },
          {
            "module_id": 31414816,
            "rotation": 0,
            "x": -57,
            "y": 100,
            "inverter": {
              "inverter_id": 32104658,
              "serial_num": "121810015542"
            }
          },
          {
            "module_id": 31414817,
            "rotation": 0,
            "x": 43,
            "y": 100,
            "inverter": {
              "inverter_id": 32104669,
              "serial_num": "121810017904"
            }
          }
        ],
        "dimensions": {
          "x_min": -477,
          "x_max": 161,
          "y_min": -344,
          "y_max": 264
        }
      },
      {
        "array_id": 2344176,
        "label": "North East Array",
        "x": 520,
        "y": -226,
        "azimuth": 57,
        "altitude": 25,
        "power" : 330,
        "panel_size": {
          "width": 1016,
          "length": 1686
        },
        "modules": [
          {
            "module_id": 31414818,
            "rotation": 0,
            "x": -200,
            "y": 0,
            "inverter": {
              "inverter_id": 32104667,
              "serial_num": "121810015362"
            }
          },
          {
            "module_id": 31414819,
            "rotation": 0,
            "x": -100,
            "y": 0,
            "inverter": {
              "inverter_id": 32104662,
              "serial_num": "121810018719"
            }
          },
          {
            "module_id": 31414820,
            "rotation": 0,
            "x": 0,
            "y": 0,
            "inverter": {
              "inverter_id": 32104661,
              "serial_num": "121810018564"
            }
          },
          {
            "module_id": 31414821,
            "rotation": 0,
            "x": 100,
            "y": 0,
            "inverter": {
              "inverter_id": 32104660,
              "serial_num": "121810018700"
            }
          },
          {
            "module_id": 31414822,
            "rotation": 0,
            "x": 200,
            "y": 0,
            "inverter": {
              "inverter_id": 32104659,
              "serial_num": "121810018351"
            }
          }
        ],
        "dimensions": {
          "x_min": 291,
          "x_max": 731,
          "y_min": -420,
          "y_max": 108
        }
      }
    ],
    "haiku": "Put upon the roof / I am waiting for the sun / All I see is clouds"
  };

  constructor(http: HttpClient, @Inject('BASE_URL') baseUrl: string) {
    this.baseUrl = baseUrl;
    this.http = http;
    this.envoyLive = new RealtimeEnvoyData(this.POINTS);
    //this.energyPlan = this.energyPlans.Plans[2];
    this.sonoffLive = new CircularBuffer<ISonoffSample>(1);
    this.meters = [];
    this.meters.push({ deviceId: "ar844", deviceName: "ar844" });

    this.sonoffDevices = [];
    setTimeout(() => this.ReadEnvoyData(), 100);
    setTimeout(() => this.ReadSonoffDevices(), 100);
    setTimeout(() => this.ReadTanks(), 100);
  }

  public getEnergyPlan(dt: Date): EnergyPlan {
    for (let p of this.myEnergyPlans) {
      if (dt >= p.StartDate && dt <= p.EndDate)
        return this.energyPlans.Plans[p.PlanId];
    }
    return this.energyPlans.Plans[this.myEnergyPlans[0].PlanId];
  }

  private ProcessEnvoyData(result: ILivePower) {
    if (result.wattsConsumed != 0 || result.wattsProduced != 0) {
      // clean up data
      if (result.wattsConsumed < 0) result.wattsConsumed = 0;
      if (result.wattsProduced < 0) result.wattsProduced = 0;
      const receivedTime: number = Math.floor(Date.now()/1000);

      this.envoyLive.addSample({ receivedTime: receivedTime, timestamp: result.timestamp, wattsConsumed: result.wattsConsumed, wattsNet: result.wattsNet, wattsProduced: result.wattsProduced });
      this.envoyData.emit({ receivedTime: receivedTime, timestamp: result.timestamp, wattsConsumed: result.wattsConsumed, wattsNet: result.wattsNet, wattsProduced: result.wattsProduced });
    }
  }

  private ReadEnvoyData() {
    this.http.get<ILivePower>(this.baseUrl + 'api/Envoy/LiveData')
      .subscribe(
        result => {
          this.ProcessEnvoyData(result);
          setTimeout(() => this.ReadEnvoyData(), 1000);
        },
        error => {
          console.error(error);
          setTimeout(() => this.ReadEnvoyData(), 1000);
        }
      );
  }

  private ReadSonoffDevices() {
    this.http.get<SonoffDevice[]>(this.baseUrl + 'api/Sonoff/GetDevices')
      .subscribe(
        result => {
          this.ProcessSonoffDevices(result);
        },
        error => {
          console.error(error);
          setTimeout(() => this.ReadSonoffDevices(), 5000);
        }
      );
  }

  private ProcessSonoffDevices(devices: SonoffDevice[]) {
    this.sonoffDevices = [];
    for (let d of devices) {
      this.sonoffDevices[this.sonoffDevices.length] = new SonoffDevice({ name: d.name, description: d.description, id: d.id, hostname: d.hostname, ipAddress: d.ipAddress });
      this.requestLivePower(d);
    }
    this.sonoffLive = new CircularBuffer<ISonoffSample>(this.POINTS*this.sonoffDevices.length);
  }

  private requestLivePower(d: SonoffDevice) {
    this.http.get<ISonoffSensorData>('http://' + d.ipAddress + '/cm?cmnd=status 8')
      .subscribe(
        result => {
          this.ProcessLivePower(d, result);
          setTimeout(() => this.requestLivePower(d), 1.2 * 1000);
        },
        error => {
          console.error(error);
          setTimeout(() => this.requestLivePower(d), 5 * 1000);
        }
      )
  }

  public ProcessLivePower(device: SonoffDevice, result: ISonoffSensorData ) {

    for (let d of this.sonoffDevices)
      if (d.id == device.id) {
        const receivedTime: number = Math.floor(Date.now()/1000);
        this.sonoffLive.append({ device: device, data: result, receivedTime: receivedTime });
        this.sonoffData.emit({ device: device, data: result, receivedTime: receivedTime });
        break;
      }
  }

  public getTodaySamples(deviceId: number, dayFrom: Date): Observable<ISonoffDailyData[]> {
    return this.http.get<ISonoffDailyData[]>(this.baseUrl + 'api/Sonoff/' + deviceId + '/GetDayData/' + dayFrom.toISOString());
  }

  public getHoursSamples(deviceId: number): Observable<ISonoffHoursData[]> {
    return this.http.get<ISonoffHoursData[]>(this.baseUrl + 'api/Sonoff/' + deviceId + '/GetHoursData');
  }

  public getDaysSamples(deviceId: number): Observable<ISonoffDaysData[]> {
    return this.http.get<ISonoffDaysData[]>(this.baseUrl + 'api/Sonoff/' + deviceId + '/GetDaysData');
  }

  public getSummaryData(deviceId: number): Observable<ISonoffSummaryData[]> {
    return this.http.get<ISonoffSummaryData[]>(this.baseUrl + 'api/Sonoff/' + deviceId + '/GetSummaryData');
  }

  public getEnphaseSystem(): Observable<number> {
    return this.http.get<number>(this.baseUrl + 'api/Envoy/EnphaseSystem');
  }

  public getEnphaseSummaryData(systemId:number): Observable<ISonoffSummaryData[]> {
    return this.http.get<ISonoffSummaryData[]>(this.baseUrl + 'api/Envoy/EnphaseSummary/'+systemId);
  }

  public getEnphaseDayData(systemId:number, day:Date): Observable<IEnphaseData[]> {
    return this.http.get<IEnphaseData[]>(this.baseUrl + 'api/Envoy/EnphaseDayData/'+systemId+'/'+day.toISOString());
  }

  public ClearDay(date: Date): Observable<boolean> {
    return this.http.get<boolean>(this.baseUrl + 'api/Envoy/EnphaseDayDataDelete/' + date.toISOString());
  }

  private ProcessTanks(tanks: HomeSensorNet.ITank[]) {
    this.tanks = [];
    for (let d of tanks) {
      this.tanks[this.tanks.length] = new HomeSensorNet.Tank( d.deviceId, d.deviceName );
    }
  }

  private ReadTanks() {
    this.http.get<HomeSensorNet.ITank[]>(this.baseUrl + 'api/HomeSensorNet/GetTanks')
      .subscribe(
        result => {
          this.ProcessTanks(result);
        },
        error => {
          console.error(error);
          setTimeout(() => this.ReadTanks(), 5000);
        }
      );
  }

  public ReadTankWater(deviceId: string, week: Boolean, day: Date): Observable<HomeSensorNet.ITankWaterer[]> {
    return this
      .http
      .get<HomeSensorNet.ITankWaterer[]>(this.baseUrl + 'api/HomeSensorNet/GetTankWater/' + deviceId + '/' + week + '/' + day.toISOString())
      .pipe(map(data => data.map(d => { d.timestamp = new Date(d.timestamp); return d;} )));
  }

  public ReadNoiseSamples(deviceId: string, range: number, day: Date): Observable<SoundRecordings.ISoundRecording[]> {
    return this
      .http
      .get<SoundRecordings.ISoundRecording[]>(this.baseUrl + 'api/SoundRecordings/GetNoiseSamples/' + deviceId + '/' + String(range) + '/' + day.toISOString())
      .pipe(map(data => data.map(d => { d.timestamp = new Date(d.timestamp); return d; })));
  }

  public ReadWeight(month: Boolean, day: Date): Observable<Weight.IWeight[]> {
    return this
      .http
      .get<Weight.IWeight[]>(this.baseUrl + 'api/Weight/ReadWeight/' + String(month) + '/' + day.toISOString())
      .pipe(map(data => data.map(d => { d.timestamp = new Date(d.timestamp); return d; })));
  }

  public ReadPotPlantStats(deviceId: string, period: number, day: Date): Observable<HomeSensorNet.IPotPlantStats[]> {
    return this
      .http
      .get<HomeSensorNet.IPotPlantStats[]>(this.baseUrl + 'api/HomeSensorNet/GetPotPlantStats/' + deviceId + '/' + period + '/' + day.toISOString())
      .pipe(map(data => data.map(d => { d.timestamp = new Date(d.timestamp); return d; })));
  }

}
