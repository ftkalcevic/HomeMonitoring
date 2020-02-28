import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { LiveDataService } from '../live-data-service/live-data-service';
import * as common from '../../data/common';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MY_FORMATS } from '../solar-history/solar-history.component';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IPotPlantStats } from '../../data/home-sensor-net';
import { ChartComponent, DataSeries, EAxisType } from '../chart/chart.component';

@Component({
  selector: 'app-garden-potplants',
  templateUrl: './garden-potplants.component.html',
  providers: [
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
  ]
})
export class GardenPotPlantsComponent implements OnDestroy {
  @ViewChild('chart') chart: ChartComponent;

  subs: any[] = [];
  public displayType: string = "week";
  public date: Date;
  public firstDate: Date = new Date(2020, 1, 28);
  public showMoisture: boolean = true;
  public showExternalTemp: boolean = true;
  public showInternalTemp: boolean = false;
  public showVBat: boolean = false;

  constructor(private liveDataService: LiveDataService, private route: ActivatedRoute) {
    let now: Date = new Date();
    this.date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    //this.date = new Date(2020, 1, 13, 0, 0, 0);
    this.RequestReadPotPlants();
  }

  ngOnDestroy() {
    for (let s of this.subs)
      s.unsubscribe();
  }

  RequestReadPotPlants() {
    let period: number;
    if (this.displayType == "week")
      period = 0;
    else if (this.displayType == "month")
      period = 1;
    else
      period = 2;
    this.subs.push(this.liveDataService.ReadPotPlantStats("1", period, this.date).subscribe(result => { this.draw(result); }));
  }

  dateChange(evt: Date) {
    let d: Date = new Date(evt);
    this.date = d;
    this.RequestReadPotPlants();
  }

  public incrementDate() {
    let d: Date;
    if (this.displayType == "month")
      d = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 1);
    else
      d = new Date(this.date.getFullYear()+1, this.date.getMonth(), 1);
    if (d.getTime() > Date.now())
      d = new Date(Date.now());
    this.date = d;
    this.RequestReadPotPlants();
  }

  public decrementDate() {
    let d: Date;
    if (this.displayType == "month")
      d = new Date(this.date.getFullYear(), this.date.getMonth() - 1, 1);
    else
      d = new Date(this.date.getFullYear()-1, this.date.getMonth(), 1);
    if (d.getTime() < this.firstDate.getTime())
      d = this.firstDate;
    this.date = d;
    this.RequestReadPotPlants();
  }

  public displayTypeChanged(newType: string) {
    this.displayType = newType;
    this.RequestReadPotPlants();
    }

  public plotChanged(x: string) {
  }

  draw(data: IPotPlantStats[]) {

    this.chart.clearDataSeries();

    // Get start/end dates
    let dayStart: number;
    let dayEnd: number;
    let xTickFmt: string;
    if (this.displayType == "week") {
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

    
    // moisture
    let minMoisture: number = 0;
    let maxMoisture: number = 0;

    // internalTemp, externalTemp (C)
    let minTemp: number = 0;
    let maxTemp: number = 50;
    let dataSeriesTemp: DataSeries[] = [];

    // vbat
    let minV: number = 3;
    let maxV: number = 4.30;

    let activeAxis: EAxisType = EAxisType.primary;
    let activeAxisCount: number = 0;
    if (this.showMoisture) {

      // Find min/max
      let series: any[] = [];
      for (let d of data) {
        // find min/max
        if (d.moisture < minMoisture) minMoisture = d.moisture;
        if (d.moisture > maxMoisture) maxMoisture = d.moisture;
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.moisture };
      }
      // round down/up to nearest 10
      minMoisture = Math.floor(minMoisture / 10) * 10;
      maxMoisture = Math.ceil( maxMoisture / 10) * 10;

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxMoisture;
      dataSeries.ymin = minMoisture;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      dataSeries.xTickFormat = xTickFmt;
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yDataType = "number"; 
      dataSeries.strokeStyle = "aqua";
      this.chart.addDataSeries(dataSeries);
    }
    if (activeAxisCount > 0) {
      activeAxis++;
      activeAxisCount = 0;
    }

    if (this.showInternalTemp) {
      let series: any[] = [];
      for (let d of data) {
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.internalTemperature };
      }
      // round down/up to nearest 10
      minTemp = Math.floor(minTemp / 10) * 10;
      maxTemp = Math.ceil( maxTemp / 10) * 10;

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
      dataSeries.strokeStyle = "IndianRed";
      this.chart.addDataSeries(dataSeries);
      dataSeriesTemp[dataSeriesTemp.length] = dataSeries;
    }

    if (this.showExternalTemp) {
      // Make data series for muscle mass
      // Find min/max
      let series: any[] = [];
      for (let d of data) {
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.externalTemperature };
      }

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
      dataSeries.strokeStyle = "goldenrod";
      this.chart.addDataSeries(dataSeries);
      dataSeriesTemp[dataSeriesTemp.length] = dataSeries;
    }
    // update grouped temp
    let first: boolean = true;
    for (let s of dataSeriesTemp) {
      if (first) {
        minTemp = s.ymin;
        maxTemp = s.ymax;
        first = false;
      } else {
        if (s.ymin < minTemp) minTemp = s.ymin;
        if (s.ymax < maxTemp) maxTemp = s.ymax;
      }
    }
    // round down/up to nearest 10
    minTemp = Math.floor(minTemp / 10) * 10;
    maxTemp = Math.ceil(maxTemp / 10) * 10;

    for (let s of dataSeriesTemp) {
      s.ymin = minTemp;
      s.ymax = maxTemp;
    }
    if (activeAxisCount > 0) {
      activeAxis++;
      activeAxisCount = 0;
    }

    if (this.showVBat) {
      // Find min/max
      let series: any[] = [];
      for (let d of data) {
        // find min/max
        if (d.vBat < minV) minV = d.vBat;
        if (d.vBat > maxV) maxV = d.vBat;
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.vBat };
      }
      // round down/up to nearest .1
      minV = Math.floor(minV * 10) / 10;
      maxV = Math.ceil(maxV * 10) / 10;

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

    this.chart.draw();
  }
}
