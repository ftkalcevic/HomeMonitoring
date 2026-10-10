import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { LiveDataService } from '../live-data-service/live-data-service';
import * as common from '../../data/common';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MY_FORMATS } from '../solar-history/solar-history.component';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ICoolingFanStats } from '../../data/home-sensor-net';
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

  constructor(private liveDataService: LiveDataService, private route: ActivatedRoute) {
    let now: Date = new Date();
    this.date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    //this.date = new Date(2020, 1, 13, 0, 0, 0);
    this.RequestReadCoolingFan();
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
  }
}
