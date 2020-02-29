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

export enum EAxisType {
  none = 0,
  primary=1,
  secondary,
  secondary2,
  primary2
};

export enum EChartType {
  line,
  column,
  stackedColumn,
  area
};

export class DataSeries {
  public series: any[];
  public xmin: number;
  public xmax: number;
  public ymin: number;
  public ymax: number;
  public xAxisType: EAxisType;
  public yAxisType: EAxisType;
  public xDataType: string;
  public yDataType: string;
  public xTickFormat: string;
  public yTickFormat: string;
  public xUnits: string;
  public yUnits: string;
  public xAxisAtZero: boolean;
  public yAxisAtZero: boolean;
  public chartType: EChartType;
  public fillStyle: any;
  public strokeStyle: string;
  public lineWidth: number;
  public lineDash: number[];

  public constructor() {
    this.series = null;
    this.xmin = null;
    this.xmax = null;
    this.ymin = null;
    this.ymax = null;
    this.xAxisType = EAxisType.none;
    this.yAxisType = EAxisType.none;
    this.xDataType = "number";
    this.yDataType = "number";
    this.xTickFormat = null;
    this.yTickFormat = null;
    this.xUnits = null;
    this.yUnits = null;
    this.xAxisAtZero = false;
    this.yAxisAtZero = false;
    this.chartType = EChartType.line;
    this.strokeStyle = "black";
    this.lineWidth = null;
    this.lineDash = null;
  }
};


class Axis {
  public min: number;
  public max: number;
  public scale: number;
  public offset1: number;
  public offset2: number;
  public size: number;
  public tickSpacing: number;
  public axisType: EAxisType;
  public dataType: string;
  public tickFormat: string;
  public units: string;
  public atZero: boolean;

  public CalcTickSpacing(): number {

    if (this.dataType == "date") {  // date is "days"
      // date type, either day, week, month, year
      if (this.max - this.min > 40)             // year
        return (this.max - this.min) / 5.99;
      else if (this.max - this.min > 20)        // month
        return 7;
      else if (this.max - this.min > 6)         // week
        return 1;
      else                                      // day
        return 1.0/6.0;
    }
    else {
      let maxTicks: number = 10;
      let min: number = this.min;
      let max: number = this.max;
      if (min < 0) {
        max = Math.max(Math.abs(min), Math.abs(max));
        min = 0;
        maxTicks = 5;
      }
      const divisors: number[] = [1, 2, 2.5, 3, 5];
      let power: number = Math.floor(Math.log10(max - min));

      let leastWorst: number = null;
      for (let p = -1; p < 2; p++) {
        for (let n of divisors) {
          let ticks: number = (max - min) / (n * Math.pow(10, power + p));
          if (ticks < maxTicks)
            if (ticks == Math.floor(ticks))
              return (max - min) / ticks;
            else if (leastWorst == null)
              leastWorst = (max - min) / ticks;
        }
      }
      return leastWorst != null ? leastWorst : (max / min) / 5;
    }
  }

  public TickLabel(n: number): string {
    switch (this.dataType) {
      case "number": return this.tickFormat == "" ? n.toString() : n.toFixed(Number(this.tickFormat));
      case "date":
        let dt: Date = new Date(n * (24 * 60 * 60 * 1000));
        return new DatePipe(getUsersLocale("en-US")).transform(dt, this.tickFormat);
    }
  }
};

export class DataSeriesInternal {
  public userSeries: DataSeries;
  public xAxis: Axis;
  public yAxis: Axis;

  public constructor(s: DataSeries) {
    this.userSeries = s;
    this.xAxis = new Axis;
    this.yAxis = new Axis;
  }

  public Init() {
    this.xAxis.dataType = this.userSeries.xDataType;
    this.yAxis.dataType = this.userSeries.yDataType;
    this.xAxis.tickFormat = this.userSeries.xTickFormat;
    this.yAxis.tickFormat = this.userSeries.yTickFormat;
    this.xAxis.axisType = this.userSeries.xAxisType;
    this.yAxis.axisType = this.userSeries.yAxisType;
    this.xAxis.units = this.userSeries.xUnits;
    this.yAxis.units = this.userSeries.yUnits;
    this.xAxis.atZero = this.userSeries.xAxisAtZero;
    this.yAxis.atZero = this.userSeries.yAxisAtZero;
  }

  public calcMinMax() {
    this.xAxis.min = this.userSeries.xmin;
    this.xAxis.max = this.userSeries.xmax;
    this.yAxis.min = this.userSeries.ymin;
    this.yAxis.max = this.userSeries.ymax;

    if (this.userSeries.series.length > 0 && (this.xAxis.min == null || this.xAxis.max == null || this.yAxis.min == null || this.yAxis.max == null)) {
      let ymin: number = this.userSeries.series[0].y;
      let ymax: number = this.userSeries.series[0].y;
      for (let s of this.userSeries.series) {
        if (s.y < ymin) ymin = s.y;
        if (s.y > ymax) ymax = s.y;
      }
      if (this.yAxis.min == null) this.yAxis.min = ymin;
      if (this.yAxis.max == null) this.yAxis.max = ymax;
      if (this.xAxis.min == null) this.xAxis.min = this.userSeries.series[0].x;
      if (this.xAxis.max == null) this.xAxis.max = this.userSeries.series[this.userSeries.series.length-1].x;
    }
  }
  public calcScale(width: number, height: number, xoffset1: number, xoffset2: number, yoffset1: number, yoffset2: number) {
    this.xAxis.offset1 = xoffset1;
    this.xAxis.offset2 = xoffset2;
    this.yAxis.offset1 = yoffset1;
    this.yAxis.offset2 = yoffset2;
    this.yAxis.size = height;
    this.xAxis.size = width;
    this.xAxis.scale = (((width-this.xAxis.offset2) - this.xAxis.offset1) / (this.xAxis.max - this.xAxis.min));
    this.yAxis.scale = (((height-this.yAxis.offset2) - this.yAxis.offset1) / (this.yAxis.max - this.yAxis.min));
  }

  public makePoint(x: number, y: number): number [] {
    return [ this.xAxis.offset1 + (x - this.xAxis.min) * this.xAxis.scale, this.yAxis.size - this.yAxis.offset1 - (y-this.yAxis.min)*this.yAxis.scale];
  }
  
  public draw(ctx: CanvasRenderingContext2D) {
    throw new Error("pure virtual method.");
  }
};


class LineDataSeries extends DataSeriesInternal {
  public constructor(s: DataSeries) {
    super(s);
  }

  public draw(ctx: CanvasRenderingContext2D) {
    if (this.userSeries.lineWidth != null) ctx.lineWidth = this.userSeries.lineWidth;
    if (this.userSeries.lineDash != null) ctx.setLineDash( this.userSeries.lineDash );
    if (this.userSeries.strokeStyle != null) ctx.strokeStyle = this.userSeries.strokeStyle;
    ctx.beginPath();

    let hasNotes: boolean = false;
    let first: boolean = true;;
    for (let d of this.userSeries.series)
      if (d != null) {
        hasNotes = hasNotes || (d.note != null);
        let pts: number[] = this.makePoint(d.x, d.y);
        if (first) {
          ctx.moveTo(pts[0], pts[1]);
          first = false;
        }
        else
          ctx.lineTo(pts[0], pts[1]);
      }
    ctx.stroke();

    if (hasNotes) {
      for (let d of this.userSeries.series)
        if (d != null && d.note) {
          let pts: number[] = this.makePoint(d.x, d.y);

          ctx.lineWidth = 1;
          ctx.strokeStyle = "black";
          ctx.beginPath();
          ctx.ellipse(pts[0], pts[1], 5, 5, 0, 0, 2 * Math.PI, false);
          ctx.stroke();
          ctx.font = "24px san serif";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "black";
          let metrics: TextMetrics = ctx.measureText(d.note);
          if (pts[0] + 7 + metrics.width < this.xAxis.size) {
            ctx.textAlign = "left";
            ctx.fillText(d.note, pts[0] + 7, pts[1]);
          } else {
            ctx.textAlign = "right";
            ctx.fillText(d.note, pts[0] - 7, pts[1]);
          }
        }
    }
  }
}


class StackedColumnDataSeries extends DataSeriesInternal {
  public constructor(s: DataSeries) {
    super(s);
  }

  public calcMinMax() {
    this.xAxis.min = this.userSeries.xmin;
    this.xAxis.max = this.userSeries.xmax;
    this.yAxis.min = this.userSeries.ymin;
    this.yAxis.max = this.userSeries.ymax;

    if (this.userSeries.series.length > 0 && (this.xAxis.min == null || this.xAxis.max == null || this.yAxis.min == null || this.yAxis.max == null)) {
      let ymin: number;
      let ymax: number;
      let first: boolean = true;
      for (let s of this.userSeries.series) {
        if (s) {
          let sum: number = 0;
          for (let y of s.y)  // sum stacked y's
            sum += y;
          if (first) {
            ymin = sum;
            ymax = sum;
            first = false;
          }
          else {
            if (sum < ymin) ymin = sum;
            if (sum > ymax) ymax = sum;
          }
        }
      }
      if (this.yAxis.min == null) this.yAxis.min = ymin;
      if (this.yAxis.max == null) this.yAxis.max = ymax;
      if (this.xAxis.min == null) this.xAxis.min = this.userSeries.series[0].x;
      if (this.xAxis.max == null) this.xAxis.max = this.userSeries.series[this.userSeries.series.length - 1].x;
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {

    for (let f of this.userSeries.series)
      if ( f ) {
        let x: number = f.x;

        let sum: number = 0;
        for (let i in f.y) {
          let y: number = f.y[i];
          if (y > 0) {
            ctx.fillStyle = this.userSeries.fillStyle[i];
            let pts1: number[] = this.makePoint(x, sum);
            sum += y;
            let pts2: number[] = this.makePoint(x + 1, sum);
            ctx.fillRect(pts1[0], pts1[1], pts2[0] - pts1[0], pts2[1] - pts1[1]);
          }
        }
      }
  }
}


class ColumnDataSeries extends DataSeriesInternal {
  public constructor(s: DataSeries) {
    super(s);
  }


  public draw(ctx: CanvasRenderingContext2D) {

    const columnWidth: number = (this.xAxis.size - this.xAxis.offset1 - this.xAxis.offset2) / this.userSeries.series.length;

    for (let f of this.userSeries.series)
      if (f) {
        let x: number = f.x;
        let y: number = f.y;
        ctx.fillStyle = this.userSeries.fillStyle;
        let pts1: number[] = this.makePoint(x, y);
        let pts2: number[] = this.makePoint(x, 0);
        ctx.fillRect(pts1[0], pts1[1], columnWidth, pts2[1] - pts1[1]);
      }
  }
}


class AreaDataSeries extends DataSeriesInternal {
  public constructor(s: DataSeries) {
    super(s);
  }

  public draw(ctx: CanvasRenderingContext2D) {

    ctx.beginPath();
    ctx.fillStyle = this.userSeries.fillStyle;
    let first: boolean = true;
    let pts: number[];
    for (let f of this.userSeries.series)
      if (f) {
        pts = this.makePoint(f.x, f.y);

        if (first) {
          ctx.moveTo(Math.round(pts[0]), Math.round(pts[1]));
          first = false;
        } else {
          ctx.lineTo(Math.round(pts[0]), Math.round(pts[1]));
        }
      }
    pts = this.makePoint(this.userSeries.series[this.userSeries.series.length - 1].x, this.yAxis.min); ctx.lineTo(Math.round(pts[0]), Math.round(pts[1]));
    pts = this.makePoint(this.userSeries.series[0].x, this.yAxis.min); ctx.lineTo(Math.round(pts[0]), Math.round(pts[1]));
    ctx.fill();
  }
}


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
  protected series: DataSeriesInternal[] = [];
  public backgroundColour: string = "rgb(240,240,240)";
  public width: number;
  public height: number;

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
    let newSeries: DataSeriesInternal;
    switch (s.chartType) {
      case EChartType.line:
        newSeries = this.series[this.series.length] = new LineDataSeries(s);
        break;
      case EChartType.stackedColumn:
        newSeries = this.series[this.series.length] = new StackedColumnDataSeries(s);
        break;
      case EChartType.column:
        newSeries = this.series[this.series.length] = new ColumnDataSeries(s);
        break;
      case EChartType.area:
        newSeries = this.series[this.series.length] = new AreaDataSeries(s);
        break;
    }
    newSeries.Init();
  }

  public clearDataSeries() {
    this.series = [];
  }

  public drawBackground(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.backgroundColour;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  public draw() {

    let ctx: CanvasRenderingContext2D = this.canvasRef.nativeElement.getContext('2d');
    ctx.save();

    this.width = this.canvasRef.nativeElement.width;
    this.height = this.canvasRef.nativeElement.height;

    if (this.series.length == 0) {
      ctx.restore();
      return;
    }

    let offsetX1: number = 0;   // left
    let offsetX2: number = 0;   // right
    let offsetY1: number = 0;   // bottom
    let offsetY2: number = 0;   // top

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
      if (s.yAxis.axisType == EAxisType.primary) {
        // We only use the first series we find.
        // the number of major ticks will be dependent on the height of the chart, font height, after removing space for y-axis and legend
        s.yAxis.tickSpacing = s.yAxis.CalcTickSpacing();

        // Find widest text
        let textWidth: number = 0;
        let textHeight: number = 0;
        for (let i: number = s.yAxis.min; i <= s.yAxis.max; i += s.yAxis.tickSpacing) {
          let metrics: TextMetrics = ctx.measureText(s.yAxis.TickLabel(i));
          if (metrics.width > textWidth)
            textWidth = metrics.width;
          if (metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent > textHeight)
            textHeight = metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent;
        }
        if (s.yAxis.units != null) {
          let metrics: TextMetrics = ctx.measureText(s.yAxis.units);
          if (metrics.width > textWidth)
            textWidth = metrics.width;
          if (metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent > textHeight)
            textHeight = 3*(metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent)/2;
        }

        offsetX1 = Math.max(offsetX1, textWidth + majorTickWidth + majorTickGap);
        offsetY1 = Math.max(offsetY1, textHeight + 1);
        offsetY2 = Math.max(offsetY1, textHeight + 1);
        break;
      }
    // space for x axis 1, x axis 2, x secondary axis 1, x secondary axis 2 (and labels)
    for (let s of this.series)
      if (s.xAxis.axisType == EAxisType.primary)
        if (!(s.xAxis.tickFormat != null && s.xAxis.tickFormat == "none" )) {
          // We only use the first series we find.
          // the number of major ticks will be dependent on the height of the chart, font height, after removing space for y-axis and legend
          s.xAxis.tickSpacing = s.xAxis.CalcTickSpacing();

          // Find widest text
          let textWidth: number = 0;
          let textHeight: number = 0;
          for (let i: number = s.xAxis.min; i <= s.xAxis.max; i += s.xAxis.tickSpacing) {
            let metrics: TextMetrics = ctx.measureText(s.xAxis.TickLabel(i));
            if (metrics.width > textWidth)
              textWidth = metrics.width;
            if (metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent > textHeight)
              textHeight = metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent;
          }

          offsetX1 = Math.max(offsetX1, textWidth / 2);
          offsetX2 = Math.max(offsetX2, textWidth / 2);
          offsetY1 = Math.max(offsetY1, textHeight + majorTickWidth + 2*majorTickGap);
          break;
        }

    for (let s of this.series)
      if (s.yAxis.axisType == EAxisType.secondary) {
        // We only use the first series we find.
        // the number of major ticks will be dependent on the height of the chart, font height, after removing space for y-axis and legend
        s.yAxis.tickSpacing = s.yAxis.CalcTickSpacing();

        // Find widest text
        let textWidth: number = 0;
        let textHeight: number = 0;
        for (let i: number = s.yAxis.min; i <= s.yAxis.max; i += s.yAxis.tickSpacing) {
          let metrics: TextMetrics = ctx.measureText(s.yAxis.TickLabel(i));
          if (metrics.width > textWidth)
            textWidth = metrics.width;
          if (metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent > textHeight)
            textHeight = metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent;
        }
        if (s.yAxis.units != null) {
          let metrics: TextMetrics = ctx.measureText(s.yAxis.units);
          if (metrics.width > textWidth)
            textWidth = metrics.width;
          if (metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent > textHeight)
            textHeight = metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent;
        }

        offsetX2 = Math.max(offsetX2, textWidth + majorTickWidth + majorTickGap);
        offsetY1 = Math.max(offsetY1, textHeight / 2 + 1);
        offsetY2 = Math.max(offsetY1, textHeight / 2 + 1);
        if (s.yAxis.units != null)
          offsetY2 = Math.max(offsetY2, textHeight + textHeight / 2 + 1);
        break;
      }

    for (let s of this.series)
      if (s.yAxis.axisType == EAxisType.primary2) {
        s.yAxis.tickSpacing = s.yAxis.CalcTickSpacing();

        if (s.yAxis.units != null) {
          let metrics: TextMetrics = ctx.measureText(s.yAxis.units);
          let textHeight: number = metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent;
          offsetY2 = Math.max(offsetY2, textHeight + textHeight / 2 + 1);
        }
        break;
      }
    for (let s of this.series)
      if (s.yAxis.axisType == EAxisType.secondary2) {
        // secondary 2 is inside the chart area so we don't need to calculate offsets.
        s.yAxis.tickSpacing = s.yAxis.CalcTickSpacing();
        if (s.yAxis.units != null) {
          let metrics: TextMetrics = ctx.measureText(s.yAxis.units);
          let textHeight: number = metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent;
          offsetY2 = Math.max(offsetY2, textHeight + textHeight / 2 + 1);
        }
        break;
      }

    // for each series, calculate min/max, scale, offset, etc
    for (let s of this.series) {
      s.calcScale(this.width, this.height, offsetX1, offsetX2, offsetY1, offsetY2);
    }

    // draw background
    this.drawBackground(ctx);

    // draw bands
    //ctx.fillStyle = "rgb(220,220,220)";
    //for (let range = minNoise; range < maxNoise; range += 20) {
    //  ctx.fillRect(offsetX, height - offsetY - (range+10) * scaleY, width - 2 * offsetX, 10 * scaleY);
    //}

    // draw grid

    // draw each series
    for (let s of this.series) {
      ctx.save();
      s.draw(ctx);
      ctx.restore();
    }
    ctx.fillStyle = "black";

    // Draw axis Y primary
    let pts: any;
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "black";
    for (let s of this.series)
      if (s.yAxis.axisType == EAxisType.primary) {

        ctx.beginPath();
        pts = s.makePoint(s.xAxis.min, s.yAxis.min);
        ctx.moveTo(pts[0], pts[1]);
        pts = s.makePoint(s.xAxis.min, s.yAxis.max);
        ctx.lineTo(pts[0], pts[1]);
        ctx.stroke();

        for (let y: number = s.yAxis.min; y <= s.yAxis.max; y += s.yAxis.tickSpacing) {
          let pts: any = s.makePoint(s.xAxis.min, y);
          ctx.beginPath();
          ctx.moveTo(pts[0] - majorTickWidth, pts[1]);
          ctx.lineTo(pts[0], pts[1]);
          ctx.stroke();
          let metrics: TextMetrics = ctx.measureText(s.yAxis.TickLabel(y));
          ctx.fillText(s.yAxis.TickLabel(y), pts[0] - majorTickWidth - majorTickGap - metrics.width, pts[1]);
        }
        if (s.yAxis.units) {
          let pts: any = s.makePoint(s.xAxis.min, s.yAxis.max);
          let metrics: TextMetrics = ctx.measureText(s.yAxis.units);
          let textHeight: number = metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent;
          ctx.textBaseline = "bottom";
          ctx.fillText(s.yAxis.units, pts[0] - majorTickWidth - majorTickGap - metrics.width, pts[1] - textHeight/2);
        }
        break;
      }
    // Draw axis Y secondary
    ctx.textBaseline = "middle";
    for (let s of this.series)
      if (s.yAxis.axisType == EAxisType.secondary) {

        ctx.beginPath();
        pts = s.makePoint(s.xAxis.max, s.yAxis.min);
        ctx.moveTo(pts[0], pts[1]);
        pts = s.makePoint(s.xAxis.max, s.yAxis.max);
        ctx.lineTo(pts[0], pts[1]);
        ctx.stroke();

        for (let y: number = s.yAxis.min; y <= s.yAxis.max; y += s.yAxis.tickSpacing) {
          let pts: any = s.makePoint(s.xAxis.max, y);
          ctx.beginPath();
          ctx.moveTo(pts[0] + majorTickWidth, pts[1]);
          ctx.lineTo(pts[0], pts[1]);
          ctx.stroke();
          ctx.fillText(s.yAxis.TickLabel(y), pts[0] + majorTickWidth + majorTickGap, pts[1]);
        }
        if (s.yAxis.units) {
          let pts: any = s.makePoint(s.xAxis.max, s.yAxis.max);
          let metrics: TextMetrics = ctx.measureText(s.yAxis.units);
          let textHeight: number = metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent;
          ctx.textBaseline = "bottom";
          ctx.fillText(s.yAxis.units, pts[0] + majorTickWidth + majorTickGap, pts[1] - textHeight / 2);
        }

        break;
      }

    // Draw axis Y primary2
    ctx.textBaseline = "middle";
    for (let s of this.series)
      if (s.yAxis.axisType == EAxisType.primary2) {

        ctx.beginPath();
        pts = s.makePoint(s.xAxis.min, s.yAxis.min);
        ctx.moveTo(pts[0], pts[1]);
        pts = s.makePoint(s.xAxis.min, s.yAxis.max);
        ctx.lineTo(pts[0], pts[1]);
        ctx.stroke();

        for (let y: number = s.yAxis.min; y <= s.yAxis.max; y += s.yAxis.tickSpacing) {
          let pts: any = s.makePoint(s.xAxis.min, y);
          ctx.beginPath();
          ctx.moveTo(pts[0] + majorTickWidth, pts[1]);
          ctx.lineTo(pts[0], pts[1]);
          ctx.stroke();
          ctx.fillText(s.yAxis.TickLabel(y), pts[0] + majorTickWidth + majorTickGap, pts[1]);
        }

        if (s.yAxis.units) {
          let pts: any = s.makePoint(s.xAxis.min, s.yAxis.max);
          let metrics: TextMetrics = ctx.measureText(s.yAxis.units);
          let textHeight: number = metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent;
          ctx.textBaseline = "bottom";
          ctx.fillText(s.yAxis.units, pts[0] + majorTickWidth + majorTickGap, pts[1] - textHeight / 2);
        }
        break;
      }
    // Draw axis Y secondary2
    ctx.textBaseline = "middle";
    for (let s of this.series)
      if (s.yAxis.axisType == EAxisType.secondary2) {

        ctx.beginPath();
        pts = s.makePoint(s.xAxis.max, s.yAxis.min);
        ctx.moveTo(pts[0], pts[1]);
        pts = s.makePoint(s.xAxis.max, s.yAxis.max);
        ctx.lineTo(pts[0], pts[1]);
        ctx.stroke();

        for (let y: number = s.yAxis.min; y <= s.yAxis.max; y += s.yAxis.tickSpacing) {
          let pts: any = s.makePoint(s.xAxis.max, y);
          ctx.beginPath();
          ctx.moveTo(pts[0] - majorTickWidth, pts[1]);
          ctx.lineTo(pts[0], pts[1]);
          ctx.stroke();
          let metrics: TextMetrics = ctx.measureText(s.yAxis.TickLabel(y));
          ctx.fillText(s.yAxis.TickLabel(y), pts[0] - majorTickWidth - majorTickGap - metrics.width, pts[1]);
        }
        if (s.yAxis.units) {
          let pts: any = s.makePoint(s.xAxis.max, s.yAxis.max);
          let metrics: TextMetrics = ctx.measureText(s.yAxis.units);
          let textHeight: number = metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent;
          ctx.textBaseline = "bottom";
          ctx.fillText(s.yAxis.units, pts[0] - majorTickWidth - majorTickGap - metrics.width, pts[1] - textHeight / 2);
        }
        break;
      }

    // Draw axis X1
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    for (let s of this.series)
      if (s.xAxis.axisType == EAxisType.primary) {

        let y: number;
        if (s.xAxis.atZero)
          y = 0;
        else
          y = s.yAxis.min;
        ctx.beginPath();
        pts = s.makePoint(s.xAxis.min, y);
        ctx.moveTo(pts[0], pts[1]);
        pts = s.makePoint(s.xAxis.max, y);
        ctx.lineTo(pts[0], pts[1]);
        ctx.stroke();

        if (!(s.xAxis.tickFormat != null && s.xAxis.tickFormat == "none")) {
          for (let x: number = s.xAxis.min; x <= s.xAxis.max; x += s.xAxis.tickSpacing) {
            ctx.beginPath();
            let pts: any = s.makePoint(x, s.yAxis.min);
            ctx.moveTo(pts[0], pts[1]);
            ctx.lineTo(pts[0], pts[1] + majorTickWidth);
            ctx.stroke();
            let text: string = s.xAxis.TickLabel(x);
            let metrics: TextMetrics = ctx.measureText(text);
            ctx.fillText(text, pts[0], pts[1] + majorTickWidth + majorTickGap);
          }
        }
        break;
      }

    ctx.restore();
  }

}
