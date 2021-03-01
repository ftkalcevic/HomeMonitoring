import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { LiveDataService } from '../live-data-service/live-data-service';
import * as common from '../../data/common';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MY_FORMATS } from '../solar-history/solar-history.component';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import * as AirQuality from '../../data/AirQuality';
import { ChartComponent, DataSeries, EAxisType } from '../chart/chart.component';

@Component({
  selector: 'app-garden-airquality',
  templateUrl: './garden-airquality.component.html',
  providers: [
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
  ]
})
export class GardenAirQualityComponent implements OnDestroy {
  @ViewChild('chart') chart: ChartComponent;

  subs: any[] = [];
  public displayType: string = "day";
  public date: Date;
  public firstDate: Date = new Date(2021, 2, 1);
  public showParticle_0p5: boolean = true;
  public showParticle_1p0: boolean = true;
  public showParticle_2p5: boolean = true;
  public showParticle_4p0: boolean = false;
  public showParticle_10p0: boolean = false;
  public showTypicalParticleSize: boolean = true;
  public showOxygen: boolean = true;
  public showCO2: boolean = false;
  public showCO: boolean = false;
  public showTemperature: boolean = true;
  public showHumidity: boolean = true;

  constructor(private liveDataService: LiveDataService, private route: ActivatedRoute) {
    let now: Date = new Date();
    this.date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    //this.date = new Date(2020, 1, 13, 0, 0, 0);
    this.RequestRead();
  }

  ngOnDestroy() {
    for (let s of this.subs)
      s.unsubscribe();
  }

  RequestRead() {
    this.subs.push(this.liveDataService.ReadAirQuality(this.displayType == "month" ? 2 : this.displayType == "week" ? 1 : 0, this.date).subscribe(result => { this.draw(result); }));
  }

  dateChange(evt: Date) {
    let d: Date = new Date(evt);
    this.date = d;
    this.RequestRead();
  }

  public incrementDate() {
    let d: Date;
    if (this.displayType == "month")
      d = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 1);
    else if (this.displayType == "week")
      d = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate() + 7);
    else
      d = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate() + 1);
    if (d.getTime() > Date.now())
      d = new Date(Date.now());
    this.date = d;
    this.RequestRead();
  }

  public decrementDate() {
    let d: Date;
    if (this.displayType == "month")
      d = new Date(this.date.getFullYear(), this.date.getMonth() - 1, 1);
    else if (this.displayType == "week")
      d = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate() - 7);
    else
      d = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate() - 1);
    if (d.getTime() < this.firstDate.getTime())
      d = this.firstDate;
    this.date = d;
    this.RequestRead();
  }

  public displayTypeChanged(newType: string) {
    this.displayType = newType;
    this.RequestRead();
    }

  public plotChanged(x: string) {
  }

  draw(data: AirQuality.IAirQuality[]) {

    this.chart.clearDataSeries();

    // Get start/end dates
    let dayStart: number;
    let dayEnd: number;
    if (this.displayType == "month") {
      dayStart = new Date(this.date.getFullYear(), this.date.getMonth(), 1).getTime() / (24 * 60 * 60 * 1000);   // ms -> days
      dayEnd = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 1).getTime() / (24 * 60 * 60 * 1000);   // ms -> days
    }
    else if (this.displayType == "week") {
      // Sunday will be the start of the week
      let offset: number = this.date.getDay();
      dayStart = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate() - offset).getTime() / (24 * 60 * 60 * 1000);
      dayEnd = dayStart + 7;
    }
    else {  // day
      dayStart = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate()).getTime() / (24 * 60 * 60 * 1000);
      dayEnd = dayStart + 1;
    }

    
    // 5 particle count
    // 1 particle size um
    // 2 %
    // 2 ppm
    // 1 C

    let minParticleCount: number = 80;
    let maxParticleCount: number = 0;
    let dataSeriesParticleCount: DataSeries [] = [];

    // hydration, body fat (%)
    let minPct: number = 100;
    let maxPct: number = 0;
    let dataSeriesPct: DataSeries[] = [];

    // ParticleSize um
    let minParticleSize: number = 1000;
    let maxParticleSize: number = 0;
    let dataSeriesParticleSize: DataSeries[] = [];

    // ppm
    let minPPM: number = 1000;
    let maxPPM: number = 0;
    let dataSeriesPPM: DataSeries[] = [];

    // C
    let minC: number = 1000;
    let maxC: number = 0;
    let dataSeriesC: DataSeries[] = [];

    let activeAxis: EAxisType = EAxisType.primary;
    let activeAxisCount: number = 0;

    if (this.showParticle_0p5) {

      // Make data series for weigh
      // Find min/max
      let series: any[] = [];
      for (let d of data) {
        // find min/max
        if (d.particle_0p5 < minParticleCount) minParticleCount = d.particle_0p5;
        if (d.particle_0p5 > maxParticleCount) maxParticleCount = d.particle_0p5;
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.particle_0p5 };
      }
      // round down/up to nearest 10
      minParticleCount = Math.floor(minParticleCount / 10) * 10;
      maxParticleCount = Math.ceil(maxParticleCount / 10) * 10;

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxParticleCount;
      dataSeries.ymin = minParticleCount;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      if (this.displayType == "day")
          dataSeries.xTickFormat = "HH:mm"; //day
      else if (this.displayType == "week")
          dataSeries.xTickFormat = "E d MMM"; //week
      else
          dataSeries.xTickFormat = "dMMMyy"; //month
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yUnits = "";
      dataSeries.yDataType = "number";
      dataSeries.strokeStyle = "green";
      this.chart.addDataSeries(dataSeries);
      dataSeriesParticleCount[dataSeriesParticleCount.length] = dataSeries;
    }

    if (this.showParticle_1p0) {

      // Make data series for weigh
      // Find min/max
      let series: any[] = [];
      for (let d of data) {
        // find min/max
        if (d.particle_1p0 < minParticleCount) minParticleCount = d.particle_1p0;
        if (d.particle_1p0 > maxParticleCount) maxParticleCount = d.particle_1p0;
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.particle_1p0 };
      }
      // round down/up to nearest 10
      minParticleCount = Math.floor(minParticleCount / 10) * 10;
      maxParticleCount = Math.ceil(maxParticleCount / 10) * 10;

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxParticleCount;
      dataSeries.ymin = minParticleCount;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      if (this.displayType == "day")
        dataSeries.xTickFormat = "HH:mm"; //day
      else if (this.displayType == "week")
        dataSeries.xTickFormat = "E d MMM"; //week
      else
        dataSeries.xTickFormat = "dMMMyy"; //month
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yUnits = "";
      dataSeries.yDataType = "number";
      dataSeries.strokeStyle = "blueviolet";
      this.chart.addDataSeries(dataSeries);
      dataSeriesParticleCount[dataSeriesParticleCount.length] = dataSeries;
    }

    if (this.showParticle_2p5) {

      // Make data series for weigh
      // Find min/max
      let series: any[] = [];
      for (let d of data) {
        // find min/max
        if (d.particle_2p5 < minParticleCount) minParticleCount = d.particle_2p5;
        if (d.particle_2p5 > maxParticleCount) maxParticleCount = d.particle_2p5;
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.particle_2p5 };
      }
      // round down/up to nearest 10
      minParticleCount = Math.floor(minParticleCount / 10) * 10;
      maxParticleCount = Math.ceil(maxParticleCount / 10) * 10;

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxParticleCount;
      dataSeries.ymin = minParticleCount;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      if (this.displayType == "day")
        dataSeries.xTickFormat = "HH:mm"; //day
      else if (this.displayType == "week")
        dataSeries.xTickFormat = "E d MMM"; //week
      else
        dataSeries.xTickFormat = "dMMMyy"; //month
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yUnits = "";
      dataSeries.yDataType = "number";
      dataSeries.strokeStyle = "cadetblue";
      this.chart.addDataSeries(dataSeries);
      dataSeriesParticleCount[dataSeriesParticleCount.length] = dataSeries;
    }

    if (this.showParticle_4p0) {

      // Make data series for weigh
      // Find min/max
      let series: any[] = [];
      for (let d of data) {
        // find min/max
        if (d.particle_4p0 < minParticleCount) minParticleCount = d.particle_4p0;
        if (d.particle_4p0 > maxParticleCount) maxParticleCount = d.particle_4p0;
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.particle_4p0 };
      }
      // round down/up to nearest 10
      minParticleCount = Math.floor(minParticleCount / 10) * 10;
      maxParticleCount = Math.ceil(maxParticleCount / 10) * 10;

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxParticleCount;
      dataSeries.ymin = minParticleCount;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      if (this.displayType == "day")
        dataSeries.xTickFormat = "HH:mm"; //day
      else if (this.displayType == "week")
        dataSeries.xTickFormat = "E d MMM"; //week
      else
        dataSeries.xTickFormat = "dMMMyy"; //month
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yUnits = "";
      dataSeries.yDataType = "number";
      dataSeries.strokeStyle = "aqua";
      this.chart.addDataSeries(dataSeries);
      dataSeriesParticleCount[dataSeriesParticleCount.length] = dataSeries;
    }

    if (this.showParticle_10p0) {

      // Make data series for weigh
      // Find min/max
      let series: any[] = [];
      for (let d of data) {
        // find min/max
        if (d.particle_10p0 < minParticleCount) minParticleCount = d.particle_10p0;
        if (d.particle_10p0 > maxParticleCount) maxParticleCount = d.particle_10p0;
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.particle_10p0 };
      }
      // round down/up to nearest 10
      minParticleCount = Math.floor(minParticleCount / 10) * 10;
      maxParticleCount = Math.ceil(maxParticleCount / 10) * 10;

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxParticleCount;
      dataSeries.ymin = minParticleCount;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      if (this.displayType == "day")
        dataSeries.xTickFormat = "HH:mm"; //day
      else if (this.displayType == "week")
        dataSeries.xTickFormat = "E d MMM"; //week
      else
        dataSeries.xTickFormat = "dMMMyy"; //month
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yUnits = "";
      dataSeries.yDataType = "number";
      dataSeries.strokeStyle = "rosybrown";
      this.chart.addDataSeries(dataSeries);
      dataSeriesParticleCount[dataSeriesParticleCount.length] = dataSeries;
    }
    if (activeAxisCount > 0) {
      activeAxis++;
      activeAxisCount = 0;
    }

    if (this.showTypicalParticleSize) {

      // Make data series for weigh
      // Find min/max
      let series: any[] = [];
      for (let d of data) {
        // find min/max
        if (d.typicalParticleSize < minParticleSize) minParticleSize = d.typicalParticleSize;
        if (d.typicalParticleSize > maxParticleSize) maxParticleSize = d.typicalParticleSize;
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.typicalParticleSize };
      }
      // round down/up to nearest 10
      minParticleSize = Math.floor(minParticleSize / 10) * 10;
      maxParticleSize = Math.ceil(maxParticleSize / 10) * 10;

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxParticleSize;
      dataSeries.ymin = minParticleSize;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      if (this.displayType == "day")
        dataSeries.xTickFormat = "HH:mm"; //day
      else if (this.displayType == "week")
        dataSeries.xTickFormat = "E d MMM"; //week
      else
        dataSeries.xTickFormat = "dMMMyy"; //month
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yUnits = "um";
      dataSeries.yDataType = "number";
      dataSeries.strokeStyle = "orange";
      this.chart.addDataSeries(dataSeries);
      dataSeriesParticleSize[dataSeriesParticleSize.length] = dataSeries;
    }
    if (activeAxisCount > 0) {
      activeAxis++;
      activeAxisCount = 0;
    }

    if (this.showOxygen) {

      // Make data series for weigh
      // Find min/max
      let series: any[] = [];
      for (let d of data) {
        // find min/max
        if (d.oxygen < minPct) minPct = d.oxygen;
        if (d.oxygen > maxPct) maxPct = d.oxygen;
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.oxygen };
      }
      // round down/up to nearest 10
      minPct = Math.floor(minPct / 10) * 10;
      maxPct = Math.ceil(maxPct / 10) * 10;

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxPct;
      dataSeries.ymin = minPct;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      if (this.displayType == "day")
        dataSeries.xTickFormat = "HH:mm"; //day
      else if (this.displayType == "week")
        dataSeries.xTickFormat = "E d MMM"; //week
      else
        dataSeries.xTickFormat = "dMMMyy"; //month
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yUnits = "%";
      dataSeries.yDataType = "number";
      dataSeries.strokeStyle = "orangered";
      this.chart.addDataSeries(dataSeries);
      dataSeriesPct[dataSeriesPct.length] = dataSeries;
    }

    if (this.showHumidity) {

      // Make data series for weigh
      // Find min/max
      let series: any[] = [];
      for (let d of data) {
        // find min/max
        if (d.humidity < minPct) minPct = d.humidity;
        if (d.humidity > maxPct) maxPct = d.humidity;
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.humidity };
      }
      // round down/up to nearest 10
      minPct = Math.floor(minPct / 10) * 10;
      maxPct = Math.ceil(maxPct / 10) * 10;

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxPct;
      dataSeries.ymin = minPct;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      if (this.displayType == "day")
        dataSeries.xTickFormat = "HH:mm"; //day
      else if (this.displayType == "week")
        dataSeries.xTickFormat = "E d MMM"; //week
      else
        dataSeries.xTickFormat = "dMMMyy"; //month
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yUnits = "%";
      dataSeries.yDataType = "number";
      dataSeries.strokeStyle = "black";
      this.chart.addDataSeries(dataSeries);
      dataSeriesPct[dataSeriesPct.length] = dataSeries;
    }
    if (activeAxisCount > 0) {
      activeAxis++;
      activeAxisCount = 0;
    }

    if (this.showCO2) {

      // Make data series for weigh
      // Find min/max
      let series: any[] = [];
      for (let d of data) {
        // find min/max
        if (d.cO2 < minPPM) minPPM = d.cO2;
        if (d.cO2 > maxPPM) maxPPM = d.cO2;
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.cO2 };
      }
      // round down/up to nearest 10
      minPPM = Math.floor(minPPM / 10) * 10;
      maxPPM = Math.ceil(maxPPM / 10) * 10;

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxPPM;
      dataSeries.ymin = minPPM;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      if (this.displayType == "day")
        dataSeries.xTickFormat = "HH:mm"; //day
      else if (this.displayType == "week")
        dataSeries.xTickFormat = "E d MMM"; //week
      else
        dataSeries.xTickFormat = "dMMMyy"; //month
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yUnits = "ppm";
      dataSeries.yDataType = "number";
      dataSeries.strokeStyle = "darkblue";
      this.chart.addDataSeries(dataSeries);
      dataSeriesPPM[dataSeriesPPM.length] = dataSeries;
    }
    if (this.showCO) {

      // Make data series for weigh
      // Find min/max
      let series: any[] = [];
      for (let d of data) {
        // find min/max
        if (d.cO < minPPM) minPPM = d.cO;
        if (d.cO > maxPPM) maxPPM = d.cO;
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.cO };
      }
      // round down/up to nearest 10
      minPPM = Math.floor(minPPM / 10) * 10;
      maxPPM = Math.ceil(maxPPM / 10) * 10;

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxPPM;
      dataSeries.ymin = minPPM;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      if (this.displayType == "day")
        dataSeries.xTickFormat = "HH:mm"; //day
      else if (this.displayType == "week")
        dataSeries.xTickFormat = "E d MMM"; //week
      else
        dataSeries.xTickFormat = "dMMMyy"; //month
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yUnits = "ppm";
      dataSeries.yDataType = "number";
      dataSeries.strokeStyle = "pink";
      this.chart.addDataSeries(dataSeries);
      dataSeriesPPM[dataSeriesPPM.length] = dataSeries;
    }
    if (activeAxisCount > 0) {
      activeAxis++;
      activeAxisCount = 0;
    }

    if (this.showTemperature) {

      // Make data series for weigh
      // Find min/max
      let series: any[] = [];
      for (let d of data) {
        // find min/max
        if (d.temperature < minC) minC = d.temperature;
        if (d.temperature > maxC) maxC = d.temperature;
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.temperature };
      }
      // round down/up to nearest 10
      minC = Math.floor(minC / 10) * 10;
      maxC = Math.ceil(maxC / 10) * 10;

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxC;
      dataSeries.ymin = minC;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      if (this.displayType == "day")
        dataSeries.xTickFormat = "HH:mm"; //day
      else if (this.displayType == "week")
        dataSeries.xTickFormat = "E d MMM"; //week
      else
        dataSeries.xTickFormat = "dMMMyy"; //month
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yUnits = "C";
      dataSeries.yDataType = "number";
      dataSeries.strokeStyle = "hotpink";
      this.chart.addDataSeries(dataSeries);
      dataSeriesC[dataSeriesC.length] = dataSeries;
    }
    if (activeAxisCount > 0) {
      activeAxis++;
      activeAxisCount = 0;
    }

    this.chart.draw();
  }
}
