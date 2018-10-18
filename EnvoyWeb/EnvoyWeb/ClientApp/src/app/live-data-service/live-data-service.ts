import { Injectable, Inject, EventEmitter, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

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
  public sonoffLive: CircularBuffer<ISonoffSample>;
  @Output() envoyData: EventEmitter<LivePower> = new EventEmitter<LivePower>(true);
  @Output() sonoffData: EventEmitter<ISonoffSample> = new EventEmitter<ISonoffSample>(true);

  constructor(http: HttpClient, @Inject('BASE_URL') baseUrl: string) {
    this.baseUrl = baseUrl;
    this.http = http;
    this.envoyLive = new RealtimeEnvoyData(600);

    this.sonoffDevices = [];
    setTimeout(() => this.ReadEnvoyData(), 100);
    setTimeout(() => this.ReadSonoffDevices(), 100);
  }

  private ProcessEnvoyData(result: ILivePower) {
    if (result.wattsConsumed != 0 || result.wattsProduced != 0) {
      // clean up data
      if (result.wattsConsumed < 0) result.wattsConsumed = 0;
      if (result.wattsProduced < 0) result.wattsProduced = 0;
      const receivedTime: number = Date.now();

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
      this.sonoffDevices[this.sonoffDevices.length] = new SonoffDevice({ name: d.name, description: d.description, id: d.id, hostname: d.hostname });
      this.requestLivePower(d);
    }
    this.sonoffLive = new CircularBuffer<ISonoffSample>(600*this.sonoffDevices.length);
  }

  private requestLivePower(d: SonoffDevice) {
    this.http.get<ISonoffSensorData>('http://' + d.hostname + '/cm?cmnd=status 8')
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
        const receivedTime: number = Date.now();
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
}
