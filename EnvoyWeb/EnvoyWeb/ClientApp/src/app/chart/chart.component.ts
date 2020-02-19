import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { cloneDeep } from 'lodash';
import { DatePipe } from '@angular/common';



const fontTickLabel = "16px san serif";
const majorTickWidth = 5;
const majorTickGap = 2;

function getUsersLocale(defaultValue: string): string {
  if (typeof window === 'undefined' || typeof window.navigator === 'undefined') {
    return defaultValue;
  }
  const wn = window.navigator as any;
  let lang = wn.languages ? wn.languages[0] : defaultValue;
  lang = lang || wn.language || wn.browserLanguage || wn.userLanguage;
  return lang;
}

export class DataSet {
  // Display type - bar, stacked bar, line, area
  // 
};

export class DataSeries {
  public series: any[];
  public xmin: number;
  public xmax: number;
  public ymin: number;
  public ymax: number;
  public isPrimaryXAxis: boolean;
  public isPrimaryYAxis: boolean;
  public xType: string;
  public yType: string;
  public xTickFormat: string;
  public yTickFormat: string;

  public constructor() {
    this.series = null;
    this.xmin = null;
    this.xmax = null;
    this.ymin = null;
    this.ymax = null;
    this.isPrimaryXAxis = false;
    this.isPrimaryYAxis = false;
    this.xType = "number";
    this.yType = "number";
    this.xTickFormat = null;
    this.yTickFormat = null;
  }
};

//class Axis {
//  public min: number;
//  public max: number;
//  public scale: number;
//  public offset: number;
//  public size: number;
//  public tickSpacing: number;
//  public isPrimaryAxis: boolean;
//  public Type: string;
//  public tickFormat: string;
//};

class DataSeriesInternal {
  public userSeries: DataSeries;
  public xmin: number;
  public xmax: number;
  public ymin: number;
  public ymax: number;
  public scaleX: number;
  public scaleY: number;
  public offsetX: number;
  public offsetY: number;
  public height: number;
  public width: number;
  public yTickSpacing: number;
  public xTickSpacing: number;

  public constructor(s: DataSeries) {
    this.userSeries = s;
  }

  public calcMinMax() {
    this.xmin = this.userSeries.xmin;
    this.xmax = this.userSeries.xmax;
    this.ymin = this.userSeries.ymin;
    this.ymax = this.userSeries.ymax;
    if (this.userSeries.series.length > 0 && (this.xmin == null || this.xmax == null || this.ymin == null || this.ymax == null)) {
      let ymin: number = this.userSeries.series[0].y;
      let ymax: number = this.userSeries.series[0].y;
      for (let s of this.userSeries.series) {
        if (s.y < ymin) ymin = s.y;
        if (s.y > ymax) ymax = s.y;
      }
      if (this.ymin == null) this.ymin = ymin;
      if (this.ymax == null) this.ymax = ymax;
      if (this.xmin == null) this.xmin = this.userSeries.series[0].x;
      if (this.xmax == null) this.xmax = this.userSeries.series[this.userSeries.series.length-1].x;
    }
  }
  public calcScale(width: number, height: number, xoffset: number, yoffset: number) {
    this.offsetX = xoffset;
    this.offsetY = yoffset;
    this.height = height;
    this.width = width;
    this.scaleX = ((width - this.offsetX*2) / (this.xmax - this.xmin));   // currently we use twice the offset - need left/right offsets, or offset + plot width
    this.scaleY = ((height - this.offsetY*2) / (this.ymax - this.ymin));
  }

  public makePoint(x: number, y: number): number [] {
    return [ this.offsetX + (x - this.xmin) * this.scaleX, this.height - this.offsetY - (y-this.ymin)*this.scaleY];
  }
  
  private tickLabel(t: string, n: number, format?: string): string {
    switch (t) {
      case "number": return n.toString();
      case "date":
        let dt: Date = new Date(n * (24 * 60 * 60 * 1000));
        return new DatePipe(getUsersLocale("en-US")).transform(dt, format);
    }
  }

  public yTickLabel(n: number, format?: string): string {
    return this.tickLabel(this.userSeries.yType, n, this.userSeries.yTickFormat);
  }

  public xTickLabel(n: number, format?: string): string {
    return this.tickLabel(this.userSeries.xType, n, this.userSeries.xTickFormat);
  }
};

// Chart - type + grouping of series (share same axis)
//    type - bar, stacked bar, line, area
//    series[] - data sets
//    axis x, y
//    legend


//Series
//Axis
//PlotArea
//Legend
//LegendEntry

// Weight
//   'n' line graphs
//      - weight kg
//      - hydration %
//      - body fat %
//      - active metabolic rate kcal
//      - basal metabolic rate kcal
//      - muscle mass kg
//      - bone mass kg
//  axis for kg, %, kcal
//  axis for time
//  legend
//  line styles

// Noise
//  line - average (smoothed)
//  area - set a to b
//  x/y - x - datetime

// Water tanks
//  line - tank water level (litres), moisture1, moisture2, temperature (C)
//  stacked bar (litres - different scale)

@Component({
  selector: 'app-chart',
  template: `<canvas #chartCanvas style="width:100%; height:100%;"></canvas>`
})
export class ChartComponent implements OnDestroy {
  @ViewChild('chartCanvas') canvasRef: ElementRef;
  private series: DataSeriesInternal[] = [];

  constructor() {
  }

  ngOnDestroy() {
  }

  ngAfterViewInit() {
    this.canvasRef.nativeElement.width = this.canvasRef.nativeElement.offsetWidth;
    this.canvasRef.nativeElement.height = this.canvasRef.nativeElement.offsetHeight;

    this.draw();
  }
  
  public addDataSeries(s: DataSeries) {
    this.series[this.series.length] = new DataSeriesInternal(s);
  }

  public clearDataSeries() {
    this.series = [];
  }

  public draw() {

    let ctx: CanvasRenderingContext2D = this.canvasRef.nativeElement.getContext('2d');
    ctx.save();

    let width: number = this.canvasRef.nativeElement.width;
    let height: number = this.canvasRef.nativeElement.height;

    ctx.fillStyle = "rgb(240,240,240)";
    ctx.fillRect(0, 0, width, height);

    if (this.series.length == 0) {
      ctx.restore();
      return;
    }

    let offsetX: number = 0;
    let offsetY: number = 0;

    // Compute...
    // for each series, calculate min/max
    for (let s of this.series)
      s.calcMinMax();

    // space for legend

    // space for y axis (and labels)
    ctx.font = fontTickLabel;
    ctx.fillStyle = "black";
    ctx.textBaseline = "middle";
    for (let s of this.series)
      if (s.userSeries.isPrimaryYAxis) {
        // Primary axis are the first ones we come across
        // the number of major ticks will be dependent on the height of the chart, font height, after removing space for y-axis and legend
        s.yTickSpacing = this.CalcTickSpacing(s.ymin, s.ymax);

        // Find widest text
        let textWidth: number = 0;
        let textHeight: number = 0;
        for (let i: number = s.ymin; i <= s.ymax; i += s.yTickSpacing) {
          let metrics: TextMetrics = ctx.measureText(s.yTickLabel(i));
          if (metrics.width > textWidth)
            textWidth = metrics.width;
          if (metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent > textHeight)
            textHeight = metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent;
        }

        offsetX = Math.max(offsetX, textWidth + majorTickWidth + majorTickGap);
        offsetY = Math.max(offsetY, textHeight );
        break;
      }
    // space for x axis 1, x axis 2, x secondary axis 1, x secondary axis 2 (and labels)
    for (let s of this.series)
      if (s.userSeries.isPrimaryXAxis) {
        // Primary axis are the first ones we come across
        // the number of major ticks will be dependent on the height of the chart, font height, after removing space for y-axis and legend
        s.xTickSpacing = this.CalcTickSpacing(s.xmin, s.xmax);

        // Find widest text
        let textWidth: number = 0;
        let textHeight: number = 0;
        for (let i: number = s.xmin; i <= s.xmax; i += s.xTickSpacing) {
          let metrics: TextMetrics = ctx.measureText(s.xTickLabel(i));
          if (metrics.width > textWidth)
            textWidth = metrics.width;
          if (metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent > textHeight)
            textHeight = metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent;
        }

        offsetX = Math.max(offsetX, textWidth/2);
        offsetY = Math.max(offsetY, textHeight + majorTickWidth + 2*majorTickGap);
        break;
      }

    // for each series, calculate min/max, scale, offset, etc
    for (let s of this.series) {
      s.calcScale(width,height,offsetX,offsetY);
    }

    // draw background
    // draw bands
    //ctx.fillStyle = "rgb(220,220,220)";
    //for (let range = minNoise; range < maxNoise; range += 20) {
    //  ctx.fillRect(offsetX, height - offsetY - (range+10) * scaleY, width - 2 * offsetX, 10 * scaleY);
    //}

    // draw grid
    // draw series
    let first: boolean;
    for (let s of this.series) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = "black";
      ctx.beginPath();
      first = true;
      for (let d of s.userSeries.series) {
        let pts: number[] = s.makePoint(d.x, d.y);
        if (first) {
          ctx.moveTo(pts[0],pts[1]);
          first = false;
        }
        else
          ctx.lineTo(pts[0], pts[1]);
      }
      ctx.stroke();
    }

    // Draw axis Y1
    let pts: any;
    ctx.textBaseline = "middle";
    for (let s of this.series)
      if (s.userSeries.isPrimaryYAxis) {

        ctx.beginPath();
        pts = s.makePoint(s.xmin, s.ymin);
        ctx.moveTo(pts[0], pts[1]);
        pts = s.makePoint(s.xmin, s.ymax);
        ctx.lineTo(pts[0], pts[1]);
        ctx.stroke();

        for (let y: number = s.ymin; y <= s.ymax; y += s.yTickSpacing) {
          let pts: any = s.makePoint(0, y);
          ctx.beginPath();
          ctx.moveTo(s.offsetX - majorTickWidth, pts[1]);
          ctx.lineTo(s.offsetX, pts[1]);
          ctx.stroke();
          let metrics: TextMetrics = ctx.measureText(s.yTickLabel(y));
          ctx.fillText(y.toString(), s.offsetX - majorTickWidth - majorTickGap - metrics.width, pts[1]);
        }
        break;
      }
    // Draw axis X1
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    for (let s of this.series)
      if (s.userSeries.isPrimaryXAxis) {

        ctx.beginPath();
        pts = s.makePoint(s.xmin, s.ymin);
        ctx.moveTo(pts[0], pts[1]);
        pts = s.makePoint(s.xmax, s.ymin);
        ctx.lineTo(pts[0], pts[1]);
        ctx.stroke();

        for (let x: number = s.xmin; x <= s.xmax; x += s.xTickSpacing) {
          ctx.beginPath();
          let pts: any = s.makePoint(x, s.ymin);
          ctx.moveTo(pts[0], pts[1]);
          ctx.lineTo(pts[0], pts[1] + majorTickWidth);
          ctx.stroke();
          let text: string = s.xTickLabel(x);
          let metrics: TextMetrics = ctx.measureText(text);
          ctx.fillText(text, pts[0], pts[1] + majorTickWidth + majorTickGap);
        }
        break;
      }

    ctx.restore();

  }

  private CalcTickSpacing(min: number, max: number): number {
    const divisors: number[] = [1, 2, 2.5, 3, 5 ];
    let power: number = Math.floor(Math.log10(max - min));

    let leastWorst: number = null;
    for (let p = -1; p < 2; p++) {
      for (let n of divisors) {
        let ticks: number = (max - min) / (n * Math.pow(10, power + p));
        if (ticks < 10)
          if (ticks == Math.floor(ticks))
            return (max - min) / ticks;
          else if (leastWorst == null)
            leastWorst = (max - min) / ticks;
      }
    }
    return leastWorst != null ? leastWorst : (max / min) / 5;
  }
}
