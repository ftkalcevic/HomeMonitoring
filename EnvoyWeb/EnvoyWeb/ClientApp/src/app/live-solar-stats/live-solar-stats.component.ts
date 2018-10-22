import { Component, AfterViewInit } from '@angular/core';
import { LiveDataService, LivePower } from '../live-data-service/live-data-service';

@Component({
  selector: 'app-live-solar-stats',
  templateUrl: './live-solar-stats.component.html'
})
export class LiveSolarStatsComponent {
  timestamp: Date = null;
  wattsProduced: Number=0;
  wattsConsumed: Number=0;
  wattsNet: Number=0;
  subs: any[] = [];

  constructor(private liveDataService: LiveDataService) {
    this.subs.push(this.liveDataService.envoyData.subscribe(result => { this.newSample(result); }));
  }

  ngAfterViewInit() {
    //if (this.liveDataService.envoyLive.data.length > 0) {
    //  this.newSample(this.liveDataService.envoyLive.data.item(this.liveDataService.envoyLive.data.length-1));
    //}
  }

  ngOnDestroy() {
    for (let s of this.subs)
      s.unsubscribe();
  }



  public newSample(power: LivePower) {
    this.timestamp = power.timestamp;
    this.wattsProduced = Math.abs(power.wattsProduced);
    this.wattsConsumed = Math.abs(power.wattsConsumed);
    this.wattsNet = Math.abs(power.wattsNet);
  }
}
