import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { LiveDataService } from '../live-data-service/live-data-service';
import * as common from '../../data/common';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MY_FORMATS } from '../solar-history/solar-history.component';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IRainGaugeStats } from '../../data/home-sensor-net';
import { ChartComponent, DataSeries, EAxisType } from '../chart/chart.component';

@Component({
  selector: 'app-garden-raingauge',
  templateUrl: './garden-raingauge.component.html',
  providers: [
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
  ]
})
export class GardenRainGaugeComponent implements OnDestroy {
  @ViewChild('chart') chart: ChartComponent;

  subs: any[] = [];
  public displayType: string = "day";
  public date: Date;
  public firstDate: Date = new Date(2020, 3, 20);
  public showMillimeters: boolean = true;
  public showTemperature: boolean = true;
  public showHumidity: boolean = true;
  public showVBat: boolean = false;
  public showVSolar: boolean = false;

  constructor(private liveDataService: LiveDataService, private route: ActivatedRoute) {
    let now: Date = new Date();
    this.date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    //this.date = new Date(2020, 1, 13, 0, 0, 0);
    this.RequestReadRainGauge();
  }

  ngOnDestroy() {
    for (let s of this.subs)
      s.unsubscribe();
  }

  RequestReadRainGauge() {
    let period: number;
    if (this.displayType == "day")
      period = 0;
    else if (this.displayType == "week")
      period = 1;
    else if (this.displayType == "month")
      period = 2;
    else // Year
      period = 3;
    this.subs.push(this.liveDataService.ReadRainGaugeStats(period, this.date).subscribe(result => { this.draw(result); }));
  }

  dateChange(evt: Date) {
    let d: Date = new Date(evt);
    this.date = d;
    this.RequestReadRainGauge();
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
    this.RequestReadRainGauge();
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
    this.RequestReadRainGauge();
  }

  public displayTypeChanged(newType: string) {
    this.displayType = newType;
    this.RequestReadRainGauge();
    }

  draw(data: IRainGaugeStats[]) {

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

    
    // millimeters
    let minMillimeters: number = 0;
    let maxMillimeters: number = 0;

    // Temperature (C)
    let minTemp: number = 0;
    let maxTemp: number = 50;
    let dataSeriesTemp: DataSeries[] = [];

    // vbat
    let minV: number = 3;
    let maxV: number = 4.30;

    let activeAxis: EAxisType = EAxisType.primary;
    let activeAxisCount: number = 0;
    if (this.showMillimeters) {

      // Find min/max
      let series: any[] = [];
      let first: number = data[0].millimeters;
      for (let d of data) {
        // find min/max
        let mm: number = d.millimeters - first+0.05;
        if (mm > maxMillimeters) maxMillimeters = mm;
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: mm };
      }
      // round down/up to nearest 10
      if (maxMillimeters == 0)
        maxMillimeters = 10;
      maxMillimeters = Math.ceil(maxMillimeters / 10) * 10;

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxMillimeters;
      dataSeries.ymin = minMillimeters;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      dataSeries.xTickFormat = xTickFmt;
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yDataType = "number"; 
      dataSeries.yUnits = "(mm)";
      dataSeries.strokeStyle = "aqua";
      this.chart.addDataSeries(dataSeries);
    }
    if (activeAxisCount > 0) {
      activeAxis++;
      activeAxisCount = 0;
    }

    if (this.showTemperature) {
      let series: any[] = [];
      for (let d of data) {
        if (d.temperature < minTemp) minTemp = d.temperature;
        if (d.temperature > maxTemp) maxTemp = d.temperature;
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.temperature };
      }
      // round down/up to nearest 10
      minTemp = Math.floor(minTemp / 10) * 10;
      maxTemp = Math.ceil(maxTemp / 10) * 10;

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxTemp;
      dataSeries.ymin = minTemp;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      dataSeries.xTickFormat = xTickFmt;
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yUnits = "(\xB0C)";
      dataSeries.yDataType = "number";
      dataSeries.strokeStyle = "GoldenRod";
      this.chart.addDataSeries(dataSeries);
      dataSeriesTemp[dataSeriesTemp.length] = dataSeries;
    }
    if (activeAxisCount > 0) {
      activeAxis++;
      activeAxisCount = 0;
    }

    if (this.showHumidity) {
      let minHumidity: number = 0, maxHumidity: number = 100;
      let series: any[] = [];
      for (let d of data) {
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.humidity };
      }

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxHumidity;
      dataSeries.ymin = minHumidity;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      dataSeries.xTickFormat = xTickFmt;
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yUnits = "(%)";
      dataSeries.yDataType = "number";
      dataSeries.strokeStyle = "darkblue";
      this.chart.addDataSeries(dataSeries);
      dataSeriesTemp[dataSeriesTemp.length] = dataSeries;
    }
    if (activeAxisCount > 0) {
      activeAxis++;
      activeAxisCount = 0;
    }

    // Find vmin/vmax
    let series: any[] = [];
    for (let d of data) {
      // find min/max
      if (this.showVBat) {
        if (d.vbat < minV) minV = d.vbat;
        if (d.vbat > maxV) maxV = d.vbat;
      }
      if (this.showVSolar) {
        if (d.vsolar < minV) minV = d.vsolar;
        if (d.vsolar > maxV) maxV = d.vsolar;
      }
    }
    // round down/up to nearest .1
    minV = Math.floor(minV * 10) / 10;
    maxV = Math.ceil(maxV * 10) / 10;

    if (this.showVBat) {
      let series: any[] = [];
      for (let d of data) {
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.vbat };
      }
      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxV;
      dataSeries.ymin = minV;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      dataSeries.xTickFormat = xTickFmt;
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yUnits = "(V)";
      dataSeries.yDataType = "number";
      dataSeries.yTickFormat = "1";
      dataSeries.strokeStyle = "red";
      this.chart.addDataSeries(dataSeries);
    }

    if (this.showVSolar) {
      // Find min/max
      let series: any[] = [];
      for (let d of data) {
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.vsolar };
      }

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxV;
      dataSeries.ymin = minV;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      dataSeries.xTickFormat = xTickFmt;
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yUnits = "(V)";
      dataSeries.yDataType = "number";
      dataSeries.yTickFormat = "1";
      dataSeries.strokeStyle = "darkorange";
      this.chart.addDataSeries(dataSeries);
    }

    this.chart.draw();
  }
}
