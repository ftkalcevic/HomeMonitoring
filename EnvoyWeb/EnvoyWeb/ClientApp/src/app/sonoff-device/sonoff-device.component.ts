import { Component, ElementRef, ViewChild, AfterViewInit, OnInit, SimpleChanges } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LiveDataService, CircularBuffer, LivePower, ISonoffDailyData, ISonoffSummaryData, ISonoffHoursData, ISonoffDaysData } from '../live-data-service/live-data-service';
import { GradientStep, Gradient } from "../../data/gradient";
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
  @ViewChild('tableDiv') tableDivRef: ElementRef;
  deviceId: number;
  deviceName: string = "";
  public displayType: string = "hours";
  startDate: Date = new Date;
  showPower: boolean = false;
  showEnergy: boolean = false;
  settings = {
    bigBanner: true,
    timePicker: false,
    format: 'dd-MM-yyyy',
    defaultOpen: true
  }
  useCanvas: boolean = true;
  grid: any[];
  range: number[];
  gradient: Gradient = new Gradient([{ percent:0,   R:80,  G:75,  B:70},
                                     { percent:50,  R:235, G:115, B:20},
                                     { percent:100, R:220, G:65,  B:20}]);

  constructor(private liveDataService: LiveDataService, private route: ActivatedRoute, private datePipe: DatePipe) {
  }

  ngOnInit() {
    this.deviceId = this.route.snapshot.params.deviceId;
    try { // when reloading when debugging, the devices may not exist
      this.deviceName = this.liveDataService.sonoffDevices.filter(d => d.id == this.deviceId)[0].description;
    }
    catch (e) { }
    this.redrawChart();
  }

  
  redrawChart(displayType?: string): void {
    console.log("redrawChart " + displayType);
    if (displayType !== undefined) this.displayType = displayType;
    switch (this.displayType) {
      case "today":
        this.useCanvas = true;
        let t: Date = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), this.startDate.getDate());
        this.liveDataService.getTodaySamples(this.deviceId, t).subscribe(
          result => { this.DrawTodayChart(result); },
          error => { console.error("Failed to read daily data"); }
        );
        break;
      case "hours":
        this.liveDataService.getHoursSamples(this.deviceId).subscribe(
          result => { this.DrawHoursChart(result); },
          error => { console.error("Failed to read Hours data"); }
        );
        break;
      case "days":
        this.liveDataService.getDaysSamples(this.deviceId).subscribe(
          result => { this.DrawDaysChart(result); },
          error => { console.error("Failed to read Days data"); }
        );
        break;
      case "months":
        this.liveDataService.getSummaryData(this.deviceId).subscribe(
          result => { this.DrawSummaryChart(result); },
          error => { console.error("Failed to read Week data"); }
        );
        break;
    }
  }

  // 24hr chart showing instaneous power, or Wh energy
  public DrawTodayChart(data: ISonoffDailyData[]) {

    this.useCanvas = true;
    this.canvasRef.nativeElement.width = this.canvasRef.nativeElement.offsetWidth;
    this.canvasRef.nativeElement.height = this.canvasRef.nativeElement.offsetHeight;

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

    //if ( this.showPower )// power
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

  // Hours - one line shows 24 hours squares
  DrawHoursChart(data: ISonoffHoursData[]) {
    let maxEnergy: number = data.reduce((m, d) => Math.max(m, d.kWh), 0);

    let startDate: Date = new Date(data[0].year, data[0].month-1, data[0].day);
    let endDate: Date = new Date(data[data.length - 1].year, data[data.length - 1].month-1, data[data.length - 1].day);

    let grid: any[] = [];
    let g: number = 0;
    let dt: Date = new Date(startDate);
    let d: number = 0;
    while (dt <= endDate && d < data.length) {
      let dataDate: Date = new Date(data[d].year, data[d].month-1, data[d].day);

      if (grid[g] === undefined)
        grid[g] = { date: new Date(dt), hours: [] };

      if (dt.getTime() === dataDate.getTime()) {
        grid[g].hours[data[d].hour] = { kWh: data[d].kWh,
                                        percent: ((data[d].kWh / maxEnergy) * 100).toFixed(0) };
        d++;
      }
      else {
        dt.setDate(dt.getDate() + 1);
        g++;
      }
    }
    for (let day of grid)
      for (let h: number = 0; h < 24; h++) {
        if (day.hours[h] !== undefined) {
          day.hours[h].title = this.datePipe.transform(day.date, "d LLL yyyy") + " " + (h + 1).toString() + ":00" + " " + day.hours[h].kWh.toFixed(3) + " kWh";
          const p: number = day.hours[h].percent;
          day.hours[h].colour = "rgb(" + this.gradient.getColour(p) + ")";
        }
      }
    let range: any[] = [];
    for (let i: number = 0; i < 24; i++)
      range[i] = i;

    this.useCanvas = false;
    this.grid = grid;
    this.range = range;
    setTimeout(() => { this.tableDivRef.nativeElement.scrollTop = this.tableDivRef.nativeElement.scrollHeight; }, 100);
 }

  changeEvent() {
    console.info("changeEvent");
    this.redrawChart();
  }

  //Days - one row shows 1 month of days
  DrawDaysChart(data: ISonoffDaysData[]) {

    let maxEnergy: number = data.reduce((m, d) => Math.max(m, d.kWh), 0);

    let startDate: Date = new Date(data[0].year, data[0].month - 1, 1);
    let endDate: Date = new Date(data[data.length - 1].year, data[data.length - 1].month - 1, 1);

    let grid: any[] = [];
    let g: number = 0;
    let dt: Date = new Date(startDate);
    let d: number = 0;
    while (dt <= endDate && d < data.length) {
      let dataDate: Date = new Date(data[d].year, data[d].month - 1, 1);

      if (grid[g] === undefined)
        grid[g] = { date: new Date(dt), days: [] };

      if (dt.getTime() === dataDate.getTime()) {
        grid[g].days[data[d].day-1] = {
          kWh: data[d].kWh,
          percent: ((data[d].kWh / maxEnergy) * 100).toFixed(0)
        };
        d++;
      }
      else {
        dt.setMonth(dt.getMonth() + 1);
        g++;
      }
    }
    for (let month of grid)
      for (let d: number = 0; d < 31; d++) {
        if (month.days[d] !== undefined) {
          month.days[d].title = (d + 1).toString() + " " + this.datePipe.transform(month.date, "LLL yyyy") +
            " " + month.days[d].kWh.toFixed(3) + " kWh";
          const p: number = month.days[d].percent;
          month.days[d].colour = "rgb(" + this.gradient.getColour(month.days[d].percent) + ")";
        }
      }
    let range: any[] = [];
    for (let i: number = 0; i < 31; i++)
      range[i] = i;

    this.useCanvas = false;
    this.grid = grid;
    this.range = range;
    setTimeout(() => { this.tableDivRef.nativeElement.scrollTop = this.tableDivRef.nativeElement.scrollHeight; },100);
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

    //if (this.showEnergy)// energy
    {
      let colWidth: number = width / 7;
      for (let iy: number = 0; iy < grid.length; iy++) {
        let y: number = iy * colWidth;
        for (let ix: number = 0; ix < 7; ix++) {
          if(typeof grid[iy][ix] !== 'undefined') {
            let x: number = ix * colWidth;
            let p: number = grid[iy][ix].percent;
            ctx.fillStyle = "rgb(" + this.gradient.getColour(p) + ")";
            ctx.fillRect(x, height - y - colWidth, colWidth - 5, colWidth - 5);
            ctx.strokeRect(x, height - y - colWidth, colWidth - 5, colWidth - 5);
          }
        }
      }
    }
    ctx.restore();
  }

  getColour(a:any[], n: number): string {
    if (a === undefined)
      return "transparent";
    if (a[n] === undefined)
      return "transparent";
    const p: number = a[n].percent;
    return "rgb(" + p + "," + p + "," + p + ")";
  }

  getHoursTitle(day: any, h: number): string {
    if (day !== undefined)
      if (day.hours[h] !== undefined)
        return this.datePipe.transform(day.date, "d LLL yyyy") + " " + (h + 1).toString() + ":00" +
               " " + day.hours[h].kWh.toFixed(3)+" kWh";
    return ""; 
  }

  getDaysTitle(month: any, d: number): string {
    if (month !== undefined)
      if (month.days[d] !== undefined)
        return (d+1).toString() + " " + this.datePipe.transform(month.date, "LLL yyyy") + 
          " " + month.days[d].kWh.toFixed(3) + " kWh";
    return "";
  }
}


/*
Hours - one line shows 24 hours squares
Days - one row shows 1 month of days
Months - one row shows 12 months

*/
