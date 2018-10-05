import { Injectable, Inject, EventEmitter, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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


class CircularBuffer<T> {
  private data: T[];
  private size: number;
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
  data: CircularBuffer<ILivePower>;
  maxProduction: number;
  maxConsumption: number;
  maxNet: number;
  minNet: number;

  constructor(maxSamples: number) {
    this.data = new CircularBuffer<ILivePower>(maxSamples);
    this.maxProduction = 0;
    this.maxConsumption = 0;
    this.maxNet = 0;
    this.minNet = 0;
  }

  addSample(result: ILivePower):void {

    if (result.wattsProduced > this.maxProduction) this.maxProduction = result.wattsProduced;
    if (result.wattsConsumed > this.maxConsumption) this.maxConsumption = result.wattsConsumed;
    if (result.wattsNet > this.maxNet) this.maxNet = result.wattsNet;
    if (result.wattsNet < this.minNet) this.minNet = result.wattsNet;

    this.data.append(result);
  }

};

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
}

@Injectable({
  providedIn: 'root',
})
export class LiveDataService {
  private baseUrl: string;
  private http: HttpClient;
  public envoyLive: RealtimeEnvoyData;
  public sonoffDevices: SonoffDevice[];

  @Output() envoyData: EventEmitter<ILivePower> = new EventEmitter<ILivePower>(true);
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

      this.envoyLive.addSample(result);
      this.envoyData.emit(result);
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
        //d.power = result.StatusSNS.ENERGY.Power;
        this.sonoffData.emit({ device: device, data: result });
        break;
      }
  }
}
