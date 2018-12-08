import { Component, Inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { LiveDataService, ISonoffSensorData, ISonoffSample, CircularBuffer, LivePower } from '../live-data-service/live-data-service';
import * as common from '../../data/common';
import { ActivatedRoute } from "@angular/router";


@Component({
  selector: 'app-live-power-stats',
  templateUrl: './live-power-stats.component.html'
})

export class LivePowerStatsComponent {
  devices: any[] = [];
  subs: any[] = [];
  highlighted: number;

  constructor(private liveDataService: LiveDataService, private route: ActivatedRoute ) {
    this.ReadDevices();
    this.subs.push(this.liveDataService.envoyData.subscribe(result => { this.newSample(result); }));
    this.subs.push(this.liveDataService.sonoffData.subscribe(result => { this.newSonoffSample(result); }));
    if (this.route.snapshot.paramMap.has("deviceId")) 
      this.highlighted = parseInt(this.route.snapshot.paramMap.get("deviceId"));
  }

  ngAfterViewInit() {
  } 

  ngOnDestroy() {
    for (let s of this.subs)
      s.unsubscribe();
  }

  public ReadDevices() {
    this.devices = [];
    for (let d of this.liveDataService.sonoffDevices) {
      this.devices[this.devices.length] = {
        name: d.description,
        id: d.id,
        type: "sonoff",
        total: 0,
        yesterday: 0,
        today: 0,
        power: 0,
        factor: 0,
        voltage: 0,
        current: 0
      };
    }
    this.devices[this.devices.length] = {
      name: "Enphase Solar",
      id: common.GENERATED_ID,
      type: "envoy",
      wattsConsumed: 0,
      wattsNet: 0,
      wattsProduced: 0
    };

  }

  public newSonoffSample(s: ISonoffSample ) {

    for (let loop: number = 0; loop < 2; loop++) {
      for (let d of this.devices)
        if (d.id == s.device.id) {
          d.timestamp = s.data.StatusSNS.Time;
          d.total = s.data.StatusSNS.ENERGY.Total;
          d.yesterday = s.data.StatusSNS.ENERGY.Yesterday;
          d.today = s.data.StatusSNS.ENERGY.Today;
          d.power = s.data.StatusSNS.ENERGY.Power;
          d.factor = s.data.StatusSNS.ENERGY.Factor;
          d.voltage = s.data.StatusSNS.ENERGY.Voltage;
          d.current = s.data.StatusSNS.ENERGY.Current;
          return;
        }
    // No devices
    this.ReadDevices();
    }
  }

  public newSample(result: LivePower ) {
    for (let d of this.devices)
      if (d.id == common.GENERATED_ID) {
        d.timestamp = result.timestamp;
        d.wattsConsumed = result.wattsConsumed.toFixed(0);
        d.wattsNet = result.wattsNet.toFixed(0);
        d.wattsProduced = result.wattsProduced.toFixed(0);
      }
  }

  getBackgroundColour(id: number): string {
    return "rgb("+common.colourList[id]+")";
  }
}


/*
 * Devices list - show live data - now, today, yesterday, etc
 * Individual device - historic data graphs, etc.
 * Live Power - bar/pie.  Different colours for each device.  Callout to show each device details (name, W)
 */
