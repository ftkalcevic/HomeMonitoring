import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { LiveDataService } from '../live-data-service/live-data-service';
import * as common from '../../data/common';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MY_FORMATS } from '../solar-history/solar-history.component';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ICoolingFanStats } from '../../data/home-sensor-net';
import { ICoolingFanConfig } from '../../data/home-sensor-net';
import { ChartComponent, DataSeries, EAxisType } from '../chart/chart.component';

@Component({
  selector: 'app-garden-cooling-fan',
  templateUrl: './garden-cooling-fan.component.html',
  providers: [
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
  ]
})
export class GardenCoolingFanComponent implements OnDestroy {
  @ViewChild('chart') chart: ChartComponent;

  subs: any[] = [];
  public displayType: string = "day";
  public date: Date;
  public firstDate: Date = new Date(2020, 2, 23);
  public showTemperature: boolean = true;
  public showDuty: boolean = true;
  public showRpm: boolean = true;
  public coolingFanConfig: ICoolingFanConfig = null;



  constructor(private liveDataService: LiveDataService, private route: ActivatedRoute) {
    let now: Date = new Date();
    this.date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    //this.date = new Date(2020, 1, 13, 0, 0, 0);
    this.subs.push(this.liveDataService.ReadCoolingFanConfig().subscribe(result => { this.coolingFanConfig = result; this.RequestReadCoolingFan(); }));
    
  }

  ngOnDestroy() {
    for (let s of this.subs)
      s.unsubscribe();
  }

  RequestReadCoolingFan() {
    let period: number;
    if (this.displayType == "day")
      period = 0;
    else if (this.displayType == "week")
      period = 1;
    else if (this.displayType == "month")
      period = 2;
    else // Year
      period = 3;
    this.subs.push(this.liveDataService.ReadCoolingFanStats(period, this.date).subscribe(result => { this.draw(result); }));
  }

  dateChange(evt: Date) {
    let d: Date = new Date(evt);
    this.date = d;
    this.RequestReadCoolingFan();
  }

  public incrementDate() {
    let d: Date;

    if (this.displayType == "day")
      d = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate()+1);
    else if (this.displayType == "week")
      d = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate()+7);
    else if (this.displayType == "month")
      d = new Date(this.date.getFullYear(), this.date.getMonth()+1, this.date.getDate());
    else // Year
      d = new Date(this.date.getFullYear()+1, this.date.getMonth(), this.date.getDate());

    if (d.getTime() > Date.now())
      d = new Date(Date.now());
    this.date = d;
    this.RequestReadCoolingFan();
  }

  public decrementDate() {
    let d: Date;
    if (this.displayType == "day")
      d = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate() - 1);
    else if (this.displayType == "week")
      d = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate() - 7);
    else if (this.displayType == "month")
      d = new Date(this.date.getFullYear(), this.date.getMonth() - 1, this.date.getDate());
    else // Year
      d = new Date(this.date.getFullYear() - 1, this.date.getMonth(), this.date.getDate());

    if (d.getTime() < this.firstDate.getTime())
      d = this.firstDate;
    this.date = d;
    this.RequestReadCoolingFan();
  }

  public displayTypeChanged(newType: string) {
    this.displayType = newType;
    this.RequestReadCoolingFan();
    }

  // Format seconds as the largest non-zero unit followed by as many smaller units (y, mo, d, h, m, s) as fit in maxStringLen characters.
  // A year is 365 days and a month is 30 days.
  formatUptime(seconds: number, maxStringLen: number): string {
    const units: { name: string, secs: number }[] = [
      { name: "y", secs: 365 * 86400 },
      { name: "mo", secs: 30 * 86400 },
      { name: "d", secs: 86400 },
      { name: "h", secs: 3600 },
      { name: "m", secs: 60 },
      { name: "s", secs: 1 },
    ];

    let remaining: number = Math.max(0, Math.floor(seconds));
    for (let i = 0; i < units.length; i++) {
      const big: number = Math.floor(remaining / units[i].secs);
      if (big == 0 && i < units.length - 1)
        continue;

      // Keep appending the next smaller unit while it still fits
      let result: string = big + units[i].name;
      remaining -= big * units[i].secs;
      for (let j = i + 1; j < units.length; j++) {
        const next: number = Math.floor(remaining / units[j].secs);
        const withNext: string = result + " " + next + units[j].name;
        if (withNext.length > maxStringLen)
          break;
        result = withNext;
        remaining -= next * units[j].secs;
      }
      return result;
    }
    return "0s";
  }

  draw(data: ICoolingFanStats[]) {

    this.chart.clearDataSeries();

    // Get start/end dates
    let dayStart: number;
    let dayEnd: number;
    let xTickFmt: string;
    if (this.displayType == "day") {
      dayStart = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate()).getTime() / (24 * 60 * 60 * 1000);
      dayEnd = dayStart + 1;
      xTickFmt = "HH:mm";
    }
    else if (this.displayType == "week") {
      // Sunday will be the start of the week
      let offset: number = this.date.getDay();
      dayStart = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate() - offset).getTime() / (24 * 60 * 60 * 1000);
      dayEnd = dayStart + 7;
      xTickFmt = "E d MMM";
    }
    else if (this.displayType == "month") {
      dayStart = new Date(this.date.getFullYear(), this.date.getMonth(), 1).getTime() / (24 * 60 * 60 * 1000);   // ms -> days
      dayEnd = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 1).getTime() / (24 * 60 * 60 * 1000);   // ms -> days
      xTickFmt = "dMMMyy";
    }
    else {
      dayStart = new Date(this.date.getFullYear(), 0, 1).getTime() / (24 * 60 * 60 * 1000);   // ms -> days
      dayEnd = new Date(this.date.getFullYear() + 1, 0, 1).getTime() / (24 * 60 * 60 * 1000);   // ms -> days
      xTickFmt = "MMMyy";
    }

    let dataSeriesTemp: DataSeries[] = [];
    
    // Temperature (C)
    let minTemp: number = 10;
    let maxTemp: number = 20;

    // duty
    let minDuty: number = 0;
    let maxDuty: number = 100;

    // rpm
    let minRpm: number = 0;
    let maxRpm: number = 3000;

    let activeAxis: EAxisType = EAxisType.primary;
    let activeAxisCount: number = 0;
    if (this.showTemperature) {

      // Find min/max
      let seriesTemp: any[] = [];
      let seriesAmbient: any[] = [];
      let minTemp: number = Math.min(data[0].temperature, data[0].ambientTemperature);
      let maxTemp: number = Math.max(data[0].temperature, data[0].ambientTemperature);
      for (let d of data) {
        // find min/max
        let mn: number = Math.min(d.temperature, d.ambientTemperature);
        let mx: number = Math.max(d.temperature, d.ambientTemperature);
        if (mn < minTemp) minTemp = mn;
        if (mx > maxTemp) maxTemp = mx;

        seriesTemp[seriesTemp.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.temperature };
        seriesAmbient[seriesAmbient.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.ambientTemperature };
      }

      // round down/up to nearest 10
      minTemp = Math.floor(minTemp / 10) * 10;
      maxTemp = Math.ceil(maxTemp / 10) * 10;

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = seriesTemp;
      dataSeries.ymax = maxTemp;
      dataSeries.ymin = minTemp;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      dataSeries.xTickFormat = xTickFmt;
      dataSeries.yAxisType = activeAxis;
      dataSeries.yDataType = "number"; 
      dataSeries.yUnits = "(\xB0C)";
      dataSeries.strokeStyle = "red";
      this.chart.addDataSeries(dataSeries);

      dataSeries = new DataSeries();
      dataSeries.series = seriesAmbient;
      dataSeries.ymax = maxTemp;
      dataSeries.ymin = minTemp;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      dataSeries.xTickFormat = xTickFmt;
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yDataType = "number";
      dataSeries.yUnits = "(\xB0C)";
      dataSeries.strokeStyle = "IndianRed";
      this.chart.addDataSeries(dataSeries);
    }
    if (activeAxisCount > 0) {
      activeAxis++;
      activeAxisCount = 0;
    }

    if (this.showDuty) {
      let series: any[] = [];
      for (let d of data)
      {
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.dutyCycle };
      }

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxDuty;
      dataSeries.ymin = minDuty;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      dataSeries.xTickFormat = xTickFmt;
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yUnits = "(%)";
      dataSeries.yDataType = "number";
      dataSeries.strokeStyle = "GoldenRod";
      this.chart.addDataSeries(dataSeries);
      dataSeriesTemp[dataSeriesTemp.length] = dataSeries;
    }
    if (activeAxisCount > 0) {
      activeAxis++;
      activeAxisCount = 0;
    }

    if (this.showRpm) {
      let series: any[] = [];
      for (let d of data)
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.rpm };

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxRpm;
      dataSeries.ymin = minRpm;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      dataSeries.xTickFormat = xTickFmt;
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yUnits = "(rpm)";
      dataSeries.yDataType = "number";
      dataSeries.strokeStyle = "darkblue";
      this.chart.addDataSeries(dataSeries);
      dataSeriesTemp[dataSeriesTemp.length] = dataSeries;
    }
    if (activeAxisCount > 0) {
      activeAxis++;
      activeAxisCount = 0;
    }

    this.chart.draw();


    if (this.coolingFanConfig != null && true) {
      let ctx: CanvasRenderingContext2D = this.chart.chartContext();
      let x: number = 790;
      let y: number = 490;
      const fontHeight: number = 20;
      const lineSpacing: number = 29;

      ctx.strokeStyle = "black";
      ctx.lineWidth = 4;
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillRect(x, y - 20, 250, 70);
      ctx.strokeRect(x, y - 20, 250, 70);

      ctx.font = fontHeight + "px san serif";
      ctx.fillStyle = "black";
      ctx.textAlign = "left";
      ctx.fillText("Up Time:", x + 10, y + 10 + 0 * lineSpacing);
      ctx.fillText("Set Point:", x + 10, y + 10 + 1 * lineSpacing);

      ctx.textAlign = "right";

      ctx.fillText(this.formatUptime(this.coolingFanConfig.uptime,14), x + 230, y + 10 + 0 * lineSpacing);
      ctx.fillText(this.coolingFanConfig.setpoint.toString() + "\xB0C", x + 230, y + 10 + 1 * lineSpacing); 
    }

  }
}
