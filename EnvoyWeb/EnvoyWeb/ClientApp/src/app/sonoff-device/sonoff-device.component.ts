import { Component, ElementRef, ViewChild, AfterViewInit, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LiveDataService, CircularBuffer, LivePower, ISonoffDailyData, ISonoffSummaryData } from '../live-data-service/live-data-service';
import {
  MatAutocompleteModule,
  MatButtonModule,
  MatButtonToggleModule,
  MatCardModule,
  MatCheckboxModule,
  MatChipsModule,
  MatDatepickerModule,
  MatDialogModule,
  MatExpansionModule,
  MatGridListModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatNativeDateModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatProgressSpinnerModule,
  MatRadioModule,
  MatRippleModule,
  MatSelectModule,
  MatSidenavModule,
  MatSliderModule,
  MatSlideToggleModule,
  MatSnackBarModule,
  MatSortModule,
  MatTableModule,
  MatTabsModule,
  MatToolbarModule,
  MatTooltipModule,
  MatStepperModule,
} from '@angular/material';

enum DisplayType {
  Daily,
  Weekly,
  Monthly
}


@Component({
  selector: 'app-sonoff-device',
  templateUrl: './sonoff-device.component.html'
})
export class SonoffDeviceComponent {
  @ViewChild('chartCanvas') canvasRef: ElementRef;
  deviceId: number;
  deviceName: string = "";
  displayType: string = "day";
  startDate: Date = new Date;
  showPower: boolean = true;
  showEnergy: boolean = false;
  settings = {
    bigBanner: true,
    timePicker: false,
    format: 'dd-MM-yyyy',
    defaultOpen: true
  }


  constructor(private liveDataService: LiveDataService, private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.deviceId = this.route.snapshot.params.deviceId;
    try { // when reloading when debugging, the devices may not exist
      this.deviceName = this.liveDataService.sonoffDevices.filter(d => d.id == this.deviceId)[0].description;
    }
    catch (e) { }
  }

  ngAfterViewInit() {
    this.canvasRef.nativeElement.width = this.canvasRef.nativeElement.offsetWidth;
    this.canvasRef.nativeElement.height = this.canvasRef.nativeElement.offsetHeight;

    this.redrawChart();
  }

  redrawChart(): void {
    switch (this.displayType) {
      case "day":
        let s: Date = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), this.startDate.getDate());
        this.liveDataService.getDailySamples(this.deviceId, s).subscribe(
          result => { this.DrawDayChart(result); },
          error => { console.error("Failed to read daily data"); }
        );
        break;
      case "week":
        let w: Date = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), this.startDate.getDate());
        while (w.getDay() != 0)
          w.setDate(w.getDate() - 1);
        this.liveDataService.getWeekSamples(this.deviceId, w).subscribe(
          result => { this.DrawWeekChart(result); },
          error => { console.error("Failed to read Week data"); }
        );
        break;
      case "month":
        this.liveDataService.getSummaryData(this.deviceId).subscribe(
          result => { this.DrawSummaryChart(result); },
          error => { console.error("Failed to read Week data"); }
        );
        break;
    }
  }

  // 24hr chart showing instaneous power, or Wh energy
  public DrawDayChart(data: ISonoffDailyData[]) {

    let maxPower: number = data.reduce((m, d) => Math.max(m, d.power), 0);
    let ctx: CanvasRenderingContext2D = this.canvasRef.nativeElement.getContext('2d');

    // Clear any previous content.
    let width: number = this.canvasRef.nativeElement.width;
    let height: number = this.canvasRef.nativeElement.height;
   
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    //ctx.scale(width/1000, -(height/2) / this.maxPower);

    // Scale
    ctx.strokeStyle = "DarkGrey";
    ctx.beginPath();
    ctx.moveTo(width, height);
    ctx.lineTo(1, height);
    ctx.moveTo(1, 0);
    ctx.stroke();

    if ( this.showPower )// power
    {
      let colWidth: number = width / (24 * 60); // 1 minute widths
      for (let i: number = 0; i < data.length; i++) {
        let d: ISonoffDailyData = data[i];
        let x: number = 60 * new Date(d.timestamp).getHours();
        x += new Date(d.timestamp).getMinutes(); 
        x *= colWidth;
        let h: number = d.power / maxPower * height;
        ctx.fillRect(x, height - h, colWidth, h);
      }
    }
    if ( this.showEnergy )// energy
    {
      let maxEnergy: number = 0;
      let energy: number[] = [];

      // split energy up into 15 minute chunks
      const period: number = 15;
      let last = 0;
      let lastE = 0;
      let nextE = 0;
      for (let t: number = 1; t < 24 * 60 / period; t++) {
        for (let i: number = last; i < data.length - 1; i++) {
          let d: ISonoffDailyData = data[i];
          let dt: Date = new Date(d.timestamp);
          let et = 60 * dt.getHours() +
            dt.getMinutes() +
            dt.getSeconds() / 60;

          if (et > t * period) {
            nextE = d.today;
            break;
          }

          last = i;
        }
        energy[t] = nextE - lastE;
        if (energy[t] > maxEnergy)
          maxEnergy = energy[t];
        lastE = nextE;
      }

      let colWidth: number = period * width / (24 * 60);
      for (let i: number = 0; i < energy.length; i++) {
        let e: number = energy[i];
        let x: number = i * colWidth;
        let h: number = e / maxEnergy * height;
        ctx.fillRect(x, height - h, colWidth, h);
      }
    }
    ctx.restore();
  }


  // 7 day chart showing instaneous power, or Wh energy
  public DrawWeekChart(data: ISonoffDailyData[]) {

    let maxPower: number = data.reduce((m, d) => Math.max(m, d.power), 0);
    let ctx: CanvasRenderingContext2D = this.canvasRef.nativeElement.getContext('2d');

    // Clear any previous content.
    let width: number = this.canvasRef.nativeElement.width;
    let height: number = this.canvasRef.nativeElement.height;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    //ctx.scale(width/1000, -(height/2) / this.maxPower);

    // Scale
    ctx.strokeStyle = "DarkGrey";
    ctx.beginPath();
    ctx.moveTo(width, height);
    ctx.lineTo(1, height);
    ctx.moveTo(1, 0);
    ctx.stroke();

    if (this.showPower)// power
    {
      let colWidth: number = width / (7*24 * 60); // 1 minute widths
      for (let i: number = 0; i < data.length; i++) {
        let d: ISonoffDailyData = data[i];
        let dt: Date = new Date(d.timestamp);
        let x: number = 24 * 60 * dt.getDay() + 60 * dt.getHours() + dt.getMinutes();
        x *= colWidth;
        let h: number = d.power / maxPower * height;
        ctx.fillRect(x, height - h, colWidth, h);
      }
    }
    if (this.showEnergy)// energy
    {
      let maxEnergy: number = 0;
      let energy: number[] = [];

      // split energy up into 15 minute chunks
      const period: number = 15;
      let last = 0;
      let lastE = 0;
      let nextE = 0;
      for (let t: number = 1; t < 7*24 * 60 / period; t++) {
        for (let i: number = last; i < data.length - 1; i++) {
          let d: ISonoffDailyData = data[i];
          let dt: Date = new Date(d.timestamp);
          let et = 24 * 60 * dt.getDay() +
            60 * dt.getHours() +
            dt.getMinutes() +
            dt.getSeconds() / 60;

          if (et > t * period) {
            nextE = d.today;
            break;
          }

          last = i;
        }
        energy[t] = nextE - lastE;
        if (energy[t] > maxEnergy)
          maxEnergy = energy[t];
        lastE = nextE;
      }

      let colWidth: number = period * width / (7*24 * 60);
      for (let i: number = 0; i < energy.length; i++) {
        let e: number = energy[i];
        let x: number = i * colWidth;
        let h: number = e / maxEnergy * height;
        ctx.fillRect(x, height - h, colWidth, h);
      }
    }
    ctx.restore();
  }

  DrawSummaryChart(data: ISonoffSummaryData[]) {

    for (let d of data)
      d.timestamp = new Date(d.timestamp);

    let maxEnergy: number = data.reduce((m, d) => Math.max(m, d.today), 0);
    let startDate: Date = new Date(data[0].timestamp);
    let endDate: Date = new Date(data[data.length - 1].timestamp);

    while (startDate.getDay() != 0)
      startDate.setDate(startDate.getDate()-1);
    while (endDate.getDay() != 6)
      endDate.setDate(endDate.getDate()+1);

    let grid: any[] = [];
    let w: number = -1;
    let dt: Date = startDate;
    let d: number = 0;
    while (dt <= endDate && d < data.length) {
      if ( dt.getDay() == 0 )
          grid[++w] = [];
      if (dt.getFullYear() === data[d].timestamp.getFullYear() &&
          dt.getMonth() === data[d].timestamp.getMonth() &&
          dt.getDate() === data[d].timestamp.getDate() ) {
        grid[w][dt.getDay()] = {
          date: data[d].timestamp,
          energy: data[d].today,
          percent: ((data[d].today / maxEnergy) * 256).toFixed(0)
        };
        d++;
      }
      dt.setDate(dt.getDate() + 1);
    }
    let ctx: CanvasRenderingContext2D = this.canvasRef.nativeElement.getContext('2d');

    // Clear any previous content.
    let width: number = this.canvasRef.nativeElement.width;
    let height: number = this.canvasRef.nativeElement.height;

    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "paleturquoise";
    ctx.fillRect(0, 0, width, height);

    //ctx.scale(width/1000, -(height/2) / this.maxPower);

    // Scale
    ctx.strokeStyle = "DarkGrey";

    if (this.showEnergy)// energy
    {
      let colWidth: number = width / 7;
      for (let iy: number = 0; iy < grid.length; iy++) {
        let y: number = iy * colWidth;
        for (let ix: number = 0; ix < 7; ix++) {
          if(typeof grid[iy][ix] !== 'undefined') {
            let x: number = ix * colWidth;
            let p: number = grid[iy][ix].percent;
            ctx.fillStyle = "rgb(" + p + "," + p + "," + p + ")";
            ctx.fillRect(x, height - y - colWidth, colWidth - 5, colWidth - 5);
            ctx.strokeRect(x, height - y - colWidth, colWidth - 5, colWidth - 5);
          }
        }
      }
    }
    ctx.restore();
  }

}
