import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { LiveDataService } from '../live-data-service/live-data-service';
import * as common from '../../data/common';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MY_FORMATS } from '../solar-history/solar-history.component';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import * as Weight from '../../data/Weight';
import { ChartComponent, DataSeries } from '../chart/chart.component';

@Component({
  selector: 'app-garden-weight',
  templateUrl: './garden-weight.component.html',
  providers: [
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
  ]
})
export class GardenWeightComponent implements OnDestroy {
  @ViewChild('chart') chart: ChartComponent;

  subs: any[] = [];
  public displayType: string = "month";
  public date: Date;
  public firstDate: Date = new Date(2020, 0, 27);
  public showWeight: boolean = true;
  public showHydration: boolean = false;
  public showBodyFat: boolean = false;
  public showActiveMetabolicRate: boolean = false;
  public showBasalMetabolicRate: boolean = false;
  public showMuscleMass: boolean = false;
  public showBoneMass: boolean = false;

  constructor(private liveDataService: LiveDataService, private route: ActivatedRoute) {
    let now: Date = new Date();
    this.date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    //this.date = new Date(2020, 1, 13, 0, 0, 0);
    this.RequestReadWeight();
  }

  ngOnDestroy() {
    for (let s of this.subs)
      s.unsubscribe();
  }

  RequestReadWeight() {
    this.subs.push(this.liveDataService.ReadWeight(this.displayType == "month", this.date).subscribe(result => { this.draw(result); }));
  }

  dateChange(evt: Date) {
    let d: Date = new Date(evt);
    this.date = d;
    this.RequestReadWeight();
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
    this.RequestReadWeight();
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
    this.RequestReadWeight();
  }

  public displayTypeChanged(newType: string) {
    this.displayType = newType;
    this.RequestReadWeight();
    }

  public plotChanged(x: string) {
  }

  draw(data: Weight.IWeight[]) {

    this.chart.clearDataSeries();

    // Get start/end dates
    let dayStart: number;
    let dayEnd: number;
    if (this.displayType == "month") {
      dayStart = new Date(this.date.getFullYear(), this.date.getMonth(), 1).getTime() / (24 * 60 * 60 * 1000);   // ms -> days
      dayEnd = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 1).getTime() / (24 * 60 * 60 * 1000);   // ms -> days
    }
    else {
      dayStart = new Date(this.date.getFullYear(), 0, 1).getTime() / (24 * 60 * 60 * 1000);   // ms -> days
      dayEnd = new Date(this.date.getFullYear() + 1, 0, 1).getTime() / (24 * 60 * 60 * 1000);   // ms -> days
    }

    // weight, muscle mass, bone mass (kg)
    let minKg: number = 80;
    let maxKg: number = 0;
    let dataSeriesKg: DataSeries [] = [];
    let PrimaryXAxis: boolean = true;
    let PrimaryYAxis: boolean = true;

    // hydration, body fat (%)
    // active metabolic rate, basal metabolic rate (kcal)
    if (this.showWeight) {

      // Make data series for weigh
      // Find min/max
      let series: any[] = [];
      for (let d of data) {
        // find min/max
        if (d.weight < minKg) minKg = d.weight;
        if (d.weight > maxKg) maxKg = d.weight;
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.weight };
      }
      // round down/up to nearest 10
      minKg = Math.floor(minKg / 10) * 10;
      maxKg = Math.ceil(maxKg / 10) * 10;

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxKg;
      dataSeries.ymin = minKg;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.isPrimaryXAxis = PrimaryXAxis;
      dataSeries.xType = "date";
      dataSeries.xTickFormat = this.displayType == "month" ? "dMMMyy" : "MMMyy";
      dataSeries.isPrimaryYAxis = PrimaryYAxis;
      dataSeries.yType = "number";
      this.chart.addDataSeries(dataSeries);
      dataSeriesKg[dataSeriesKg.length] = dataSeries;
      PrimaryXAxis = false;
      PrimaryYAxis = false;
    }

    if (this.showMuscleMass) {
      // Make data series for muscle mass
      // Find min/max
      let series: any[] = [];
      for (let d of data) {
        // find min/max
        if (d.muscleMass < minKg) minKg = d.muscleMass;
        if (d.muscleMass > maxKg) maxKg = d.muscleMass;
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.muscleMass };
      }
      // round down/up to nearest 10
      minKg = Math.floor(minKg / 10) * 10;
      maxKg = Math.ceil(maxKg / 10) * 10;

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxKg;
      dataSeries.ymin = minKg;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.isPrimaryXAxis = PrimaryXAxis;
      dataSeries.xType = "date";
      dataSeries.xTickFormat = this.displayType == "month" ? "dMMMyy" : "MMMyy";
      dataSeries.isPrimaryYAxis = PrimaryYAxis;
      dataSeries.yType = "number";
      this.chart.addDataSeries(dataSeries);
      dataSeriesKg[dataSeriesKg.length] = dataSeries;
      PrimaryXAxis = false;
      PrimaryYAxis = false;
    }

    //showBoneMass
    if (this.showBoneMass) {
      // Make data series for muscle mass
      // Find min/max
      let series: any[] = [];
      for (let d of data) {
        // find min/max
        if (d.boneMass < minKg) minKg = d.boneMass;
        if (d.boneMass > maxKg) maxKg = d.boneMass;
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.boneMass };
      }
      // round down/up to nearest 10
      minKg = Math.floor(minKg / 10) * 10;
      maxKg = Math.ceil(maxKg / 10) * 10;

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.ymax = maxKg;
      dataSeries.ymin = minKg;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.isPrimaryXAxis = PrimaryXAxis;
      dataSeries.xType = "date";
      dataSeries.xTickFormat = this.displayType == "month" ? "dMMMyy" : "MMMyy";
      dataSeries.isPrimaryYAxis = PrimaryYAxis;
      dataSeries.yType = "number";
      this.chart.addDataSeries(dataSeries);
      dataSeriesKg[dataSeriesKg.length] = dataSeries;
      PrimaryXAxis = false;
      PrimaryYAxis = false;
    }
    //showHydration
    //showBodyFat
    //showActiveMetabolicRate
    //showBasalMetabolicRate

    // update grouped min/max
    let first: boolean = true;
    for (let s of dataSeriesKg) {
      if (first) {
        minKg = s.ymin;
        maxKg = s.ymax;
        first = false;
      } else {
        if (s.ymin < minKg) minKg = s.ymin;
        if (s.ymax < maxKg) maxKg = s.ymax;
      }
    }
    for (let s of dataSeriesKg) {
      s.ymin = minKg;
      s.ymax = maxKg;
    }

    this.chart.draw();

    //dataSet.loadf

    //let ctx: CanvasRenderingContext2D = this.canvasRef.nativeElement.getContext('2d');
    //ctx.save();

    //let width: number = this.canvasRef.nativeElement.width;
    //let height: number = this.canvasRef.nativeElement.height;

    //ctx.fillStyle = "rgb(240,240,240)";
    //ctx.fillRect(0, 0, width, height);

    //if (data.length == 0) {
    //  ctx.restore();
    //  return;
    //}

    //let minWeight: number = 80;
    //let maxWeight: number = 0;

    //// Find min/max
    //for (let d of data) {
    //  // find min/max
    //  if (d.weight < minWeight) minWeight = d.weight;
    //  if (d.weight > maxWeight) maxWeight = d.weight;
    //}
    //// round down/up to nearest 10
    //minWeight = Math.floor(minWeight / 10) * 10;
    //maxWeight = Math.ceil(maxWeight / 10) * 10;

    //// Get start/end dates
    //let dateStart: Date;
    //let dateEnd: Date;
    //let days: number;
    //if (this.displayType == "month") {
    //  dateStart = new Date(this.date.getFullYear(), this.date.getMonth(), 1);
    //  dateEnd = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 1);
    //  days = new Date(dateEnd.getFullYear(), dateEnd.getMonth(), 0).getDate();
    //}
    //else {
    //  dateStart = new Date(this.date.getFullYear(), 0, 1);
    //  dateEnd = new Date(this.date.getFullYear()+1, 0 , 1);
    //  days = (dateEnd.getTime() - dateStart.getTime()) / (24 * 60 * 60 * 1000);   // ms -> days
    //}

    //// Draw Chart
    //let scaleX: number = 0.9 * (width / (days));
    //let scaleY: number = 0.9 * (height / (maxWeight - minWeight));
    //let offsetX: number = width * 0.1 / 2;
    //let offsetY: number = height * 0.1 / 2 - minWeight * scaleY;

    //// Draw sound bands
    //ctx.fillStyle = "rgb(220,220,220)";
    //for (let range = minWeight; range < maxWeight; range += 20) {
    //  ctx.fillRect(offsetX, height - offsetY - (range + 10) * scaleY, width - 2 * offsetX, 10 * scaleY);
    //}

    //// weight
    //ctx.lineWidth = 2;
    //ctx.strokeStyle = "black";
    //ctx.beginPath();
    //let first: boolean = true;
    //for (let d of data) {
    //  let dt: number = (d.timestamp.getTime() - dateStart.getTime()) / (24 * 60 * 60 * 1000); // floating point days since startDate
    //  let ptX: number = offsetX + dt * scaleX;
    //  let ptY: number = height - offsetY - d.weight * scaleY;
    //  if (first) {
    //    ctx.moveTo(ptX, ptY);
    //    first = false;
    //  }
    //  else
    //    ctx.lineTo(ptX,ptY);
    //}
    //ctx.stroke();

    //ctx.restore();

  }
}
