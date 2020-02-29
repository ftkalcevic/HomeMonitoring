import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { LiveDataService } from '../live-data-service/live-data-service';
import * as common from '../../data/common';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MY_FORMATS } from '../solar-history/solar-history.component';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import * as SoundRecordings from '../../data/sound-recordings';
import { ChartComponent, DataSeries, EAxisType, EChartType } from '../chart/chart.component';

@Component({
  selector: 'app-garden-noise',
  templateUrl: './garden-noise.component.html',
  providers: [
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
  ]
})
export class GardenNoiseComponent implements OnDestroy {
  @ViewChild('chart') chart: ChartComponent;

  subs: any[] = [];
  public meters: any[];
  public displayType: string = "0";
  public selectedMeter: string;
  public date: Date;
  public firstDate: Date = new Date(2019, 11, 28);


  constructor(private liveDataService: LiveDataService, private route: ActivatedRoute) {
    this.meters = liveDataService.meters;
    this.selectedMeter = this.meters[0].deviceId;
    let now: Date = new Date();
    this.date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    //this.date = new Date(2020, 1, 13, 0, 0, 0);
    this.RequestReadNoiseSamples();
  }

  ngOnDestroy() {
    for (let s of this.subs)
      s.unsubscribe();
  }

  RequestReadNoiseSamples() {
      this.subs.push(this.liveDataService.ReadNoiseSamples(this.selectedMeter, Number(this.displayType), this.date).subscribe(result => { this.draw(result); }));
  }

  dateChange(evt: Date) {
    let d: Date = new Date(evt);
    this.date = d;
    this.RequestReadNoiseSamples();
  }

  public incrementDate() {
    let d: Date;
    if (this.displayType == "0")  // Day
      d = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate() + 1);
    else if (this.displayType == "1")  // Week
      d = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate() + 7);
    else
      d = new Date(this.date.getFullYear(), this.date.getMonth()+1, 1 );
    if (d.getTime() > Date.now())
      d = new Date(Date.now());
    this.date = d;
    this.RequestReadNoiseSamples();
  }

  public decrementDate() {
    let d: Date;
    if (this.displayType == "0")  // Day
      d = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate() - 1);
    else if (this.displayType == "1") //week
      d = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate() - 7);
    else
      d = new Date(this.date.getFullYear(), this.date.getMonth() - 1, 1);
    if (d.getTime() < this.firstDate.getTime())
      d = this.firstDate;
    this.date = d;
    this.RequestReadNoiseSamples();
  }

  public displayTypeChanged(newType: string) {
    this.displayType = newType;
    this.RequestReadNoiseSamples();
    }

  draw(data: SoundRecordings.ISoundRecording[]) {

    this.chart.clearDataSeries();

    let minNoise: number = 40;
    let maxNoise: number = 100;
    let weight: string = "";

    // Find max
    for (let d of data) {
      // find min/max
      if (d.min < minNoise) minNoise = d.min;
      if (d.max > maxNoise) maxNoise = d.max;
      weight = d.weight;
    }
    minNoise = Math.floor(minNoise / 10) * 10;
    maxNoise = Math.ceil(maxNoise / 10) * 10;

    // Get start/end dates
    let windowSize: number;
    let dayStart: number;
    let dayEnd: number;
    if (this.displayType == "0") {
      dayStart = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate()).getTime()/(24*60*60*1000);
      dayEnd = dayStart + 1;
      windowSize = 10;
    }
    else if (this.displayType == "1") { // week

      // Sunday will be the start of the week
      let offset: number = this.date.getDay();
      dayStart = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate() - offset).getTime() / (24 * 60 * 60 * 1000);
      dayEnd = dayStart + 7;
      windowSize = 50;
    }
    else {  // month
      dayStart = new Date(this.date.getFullYear(), this.date.getMonth(), 1).getTime() / (24 * 60 * 60 * 1000);
      dayEnd = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 1).getTime() / (24 * 60 * 60 * 1000);
      windowSize = 250;
    }

    // Max area
    let maxGap: number = 3.0 / (24.0 * 60.0); // 3 minutes (in days)
    let lastDay: number;
    let endPoint: number = data.length;
    for (let start = 0; start < endPoint;) {
      // if there are large gaps in the data, send separate series as the area chart looks ugly spanning the gaps
      let seriesMin: any[] = [];
      let seriesMax: any[] = [];
      let seriesAvg: any[] = [];
      lastDay = data[start].timestamp.getTime() / (24 * 60 * 60 * 1000);
      for (let i = start; i < endPoint; i++) {
        let d: SoundRecordings.ISoundRecording = data[i];
        let day: number = d.timestamp.getTime() / (24 * 60 * 60 * 1000);
        if (day - lastDay > maxGap) {
          endPoint = i;
          break;
        }
        seriesMin[seriesMin.length] = { x: day, y: d.min }
        seriesMax[seriesMax.length] = { x: day, y: d.max }
        seriesAvg[seriesAvg.length] = { x: day, y: d.average }
        lastDay = day;
      }
      start = endPoint;
      endPoint = data.length;

      // Max area
      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = seriesMax;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.ymin = minNoise;
      dataSeries.ymax = maxNoise;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      if (this.displayType == "0")
        dataSeries.xTickFormat = "HH:mm"; //day
      else if (this.displayType == "1")
        dataSeries.xTickFormat = "E d MMM"; //week
      else
        dataSeries.xTickFormat = "dMMMyy"; //month
      dataSeries.yAxisType = EAxisType.primary;
      dataSeries.yUnits = "(dB" + weight + ")";
      dataSeries.yDataType = "number";
      dataSeries.chartType = EChartType.area;
      dataSeries.fillStyle = "CornflowerBlue";
      dataSeries.strokeStyle = "CornflowerBlue";
      this.chart.addDataSeries(dataSeries);

      // Min area
      dataSeries = new DataSeries();
      dataSeries.series = seriesMin;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.ymin = minNoise;
      dataSeries.ymax = maxNoise;
      dataSeries.xAxisType = EAxisType.none;
      dataSeries.yAxisType = EAxisType.none;
      dataSeries.yDataType = "number";
      dataSeries.chartType = EChartType.area;
      dataSeries.fillStyle = this.chart.backgroundColour;
      dataSeries.strokeStyle = this.chart.backgroundColour;
      this.chart.addDataSeries(dataSeries);

      // Average
      // Convert raw average to running average
      let smooth: any[] = [seriesAvg.length];
      for (let i: number = 0; i < seriesAvg.length;i++) {
        let sum: number = 0;
        let start: number = i - windowSize < 0 ? 0 : i - windowSize;
        let end: number = i + windowSize >= seriesAvg.length ? seriesAvg.length - 1 : i + windowSize;
        for (let j: number = start; j < end; j++) {
          sum += seriesAvg[j].y;
        }
        smooth[i] = { x: seriesAvg[i].x, y: sum / (end - start) };
      }

      dataSeries = new DataSeries();
      dataSeries.series = smooth; //seriesAvg;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.ymin = minNoise;
      dataSeries.ymax = maxNoise;
      dataSeries.xAxisType = EAxisType.none;
      dataSeries.yAxisType = EAxisType.none;
      dataSeries.yDataType = "number";
      dataSeries.chartType = EChartType.line;
      dataSeries.strokeStyle = "Chartreuse";
      this.chart.addDataSeries(dataSeries);
    }

    this.chart.draw();
  }
}
