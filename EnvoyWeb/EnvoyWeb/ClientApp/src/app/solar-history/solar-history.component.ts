import { Component, ElementRef, ViewChild, AfterViewInit, OnInit, SimpleChanges } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LiveDataService, CircularBuffer, LivePower, ISonoffDailyData, ISonoffSummaryData, ISonoffHoursData, ISonoffDaysData } from '../live-data-service/live-data-service';
import { GradientStep, Gradient } from "../../data/gradient";
import * as SunCalc from "suncalc";
import { mat4, vec3 } from "gl-matrix";
import * as common from '../../data/common';
import { ExpectedConditions } from 'protractor';
import { PriceBreak, EnergyPlan } from '../../data/energy-plans';
import { Observable } from 'rxjs';
import { timer } from 'rxjs';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { ChartComponent, DataSeries, EAxisType, EChartType, DataSeriesInternal } from '../chart/chart.component';
import { request } from 'http';


export const MY_FORMATS = {
  parse: {
    dateInput: 'LL',
  },
  display: {
    dateInput: 'LL',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-history-chart',
  template: `<canvas #chartCanvas style="width:100%; height:100%;"></canvas>`
})
export class HistoryChartComoponent extends ChartComponent {
  public prices: any[];
  public rates: any[];

  public drawBackground(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, this.width, this.height);

    const colours = ["240, 240, 240",    // off peak
                     "255, 255, 240",   // shoulder
                     "255, 240, 240",  // peak
                     ];

    for (let p of this.prices) {
      let startTime: any = p.StartTime.split(':');
      let endTime: any = p.EndTime.split(':');

      let start: number = startTime[0] * 4 + startTime[1] / 15;
      let end: number = endTime[0] * 4 + endTime[1] / 15;

      ctx.fillStyle = "rgb(" + colours[this.rates[p.Rate]] + ")";
      let pts1: any[] = this.series[0].makePoint(start, this.series[0].yAxis.min);
      let pts2: any[] = this.series[0].makePoint(end, this.series[0].yAxis.max);
      ctx.fillRect(pts1[0], pts2[1], pts2[0] - pts1[0], pts1[1] - pts2[1]);
    }

    ctx.restore();
  }

};

@Component({
  selector: 'app-solar-history',
  templateUrl: './solar-history.component.html',
  providers: [
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
  ],
})
export class SolarHistoryComponent implements OnInit {
  @ViewChild('chart') chart: HistoryChartComoponent;
  @ViewChild('barCanvas') barCanvasRef: ElementRef;
  longitude: number = 145.000516 - 360;
  latitude: number = -37.886778;
  subs: any[] = [];
  date: Date;
  lastUpdate: Date;
  fullUpdate: Boolean = false;
  enphaseData: IEnphaseData[];
  systemId: number;
  private maxPower: number = common.maxProduction * 1.1;
  private maxProduction: number = 0;
  private maxConsumuption: number = 0;
  
  constructor(private liveDataService: LiveDataService, private route: ActivatedRoute, private datePipe: DatePipe) {
    this.subs.push(this.liveDataService.getEnphaseSystem().subscribe(result => { this.processEnphaseSystem(result); }));
    let now: Date = new Date();
    this.date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    this.enphaseData = null;
  }

  processEnphaseSystem(systemId: number) {
    this.systemId = systemId;

    let t = timer(1, 15*60*1000); // 15 minutes
    this.subs.push(t.subscribe(result => { this.requestDayData(); }));

    this.ResetMaximums();
    this.subs.push(this.liveDataService.envoyData.subscribe(result => { this.redrawBar(result); }));
  }

  ResetMaximums() {
    this.maxConsumuption = 0;
    this.maxProduction = 0;
    this.maxPower = common.maxProduction;
  }

  RecalcData() {
    this.liveDataService.ClearDay(this.date).subscribe(success => { if (success) this.requestDayData(); });
  }


  requestDayData() {
    if (!this.fullUpdate) {
      // Roll to next day automatically
      //let now: Date = new Date();
      //if (this.date.getDate() != now.getDate()) {
      //  this.date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      //}

      this.liveDataService.getEnphaseDayData(this.systemId, this.date).subscribe(result => { this.processDayData(result); });
    }
  }

  processDayData(result: IEnphaseData[]){
    this.enphaseData = result;
    this.redrawChart();
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    for (let s of this.subs)
      s.unsubscribe();
  }

  ngAfterViewInit() {
    this.barCanvasRef.nativeElement.width = this.barCanvasRef.nativeElement.offsetWidth;
    this.barCanvasRef.nativeElement.height = this.barCanvasRef.nativeElement.offsetHeight;
  }

  CalculatePredictedSolar(powerLimit:number): any {
    // Predict the solar output based on panel orientation, position of the sun, and calculated irradiance.

    // todo: if don't have data, or day has changed...

    let predictedData: any = [];

    let predictDate: Date = new Date(this.date);
    let times: any = SunCalc.getTimes(predictDate, this.latitude, this.longitude);

    let start: number = times.sunrise.getHours() + times.sunrise.getMinutes() / 60;
    let end: number = times.sunset.getHours() + times.sunset.getMinutes() / 60;
    for (let i: number = 0; i < 24 * 4; i++) {

      let power: number = 0;
      const t: number = start + (end - start) * i / (24 * 4);
      const time: Date = new Date(predictDate.getFullYear(), predictDate.getMonth(), predictDate.getDate(), Math.floor(t), (t % 1) * 60, 0, 0);
      var sunPos = SunCalc.getPosition(time, this.latitude, this.longitude);

      let sunAltitude: number = sunPos.altitude / Math.PI * 180;
      if (sunAltitude < 0)
        sunAltitude = 0;
      let sunAzimuth: number = this.MakePlusMinus180(180 + sunPos.azimuth / Math.PI * 180);  // 0 north

      let vecToSun: any = vec3.fromValues(0, 1, 0);
      vec3.rotateZ(vecToSun, vecToSun, [0, 0, 0], -1 * Math.PI * sunAzimuth / 180);
      vec3.rotateX(vecToSun, vecToSun, [0, 0, 0], 1 * Math.PI * sunAltitude / 180);

      // https://www.pveducation.org/pvcdrom/properties-of-sunlight/calculation-of-solar-insolation
      let airMass: number = 1.0 / Math.cos((90 - sunAltitude) / 180.0 * Math.PI);
      let irradiance: number = 1.353 * Math.pow(0.7, Math.pow(airMass, 0.678));

      power = 0;
      for (let a: number = 0; a < this.liveDataService.panelInfo.arrays.length; a++) {

        let arr = this.liveDataService.panelInfo.arrays[a];

        let panelAltitude: number = arr.altitude;
        let panelAzimuth: number = this.MakePlusMinus180(arr.azimuth);

        let panelWidth: number = arr.panel_size.width;
        let panelLength: number = arr.panel_size.length;
        let panelArea: number = panelWidth * panelLength;

        let vecPanelNormal: any = vec3.fromValues(0, 0, 1);
        vec3.rotateX(vecPanelNormal, vecPanelNormal, [0, 0, 0], -1 * Math.PI * panelAltitude / 180);
        vec3.rotateZ(vecPanelNormal, vecPanelNormal, [0, 0, 0], -1 * Math.PI * panelAzimuth / 180);

        const angle: number = vec3.angle(vecToSun, vecPanelNormal);

        if (!(angle > Math.PI / 2 || angle < -Math.PI / 2)) {

          let transform: any = mat4.create();
          mat4.rotateX(transform, transform, -1 * Math.PI * sunAltitude / 180);
          mat4.rotateZ(transform, transform, 1 * Math.PI * sunAzimuth / 180);
          mat4.rotateZ(transform, transform, -1 * Math.PI * panelAzimuth / 180);
          mat4.rotateX(transform, transform, -1 * Math.PI * panelAltitude / 180);

          let p1: any = vec3.fromValues(0, 0, 0);
          let p2: any = vec3.fromValues(panelWidth, 0, 0);
          let p3: any = vec3.fromValues(panelWidth, -panelLength, 0);
          let p4: any = vec3.fromValues(0, -panelLength, 0);

          vec3.transformMat4(p1, p1, transform);
          vec3.transformMat4(p2, p2, transform);
          vec3.transformMat4(p3, p3, transform);
          vec3.transformMat4(p4, p4, transform);

          const x1: number = p1[0]; const y1: number = p1[2];
          const x2: number = p2[0]; const y2: number = p2[2];
          const x3: number = p3[0]; const y3: number = p3[2];
          const x4: number = p4[0]; const y4: number = p4[2];

          let presentedArea: number = 0.5 * Math.abs(x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)) +
            0.5 * Math.abs(x1 * (y4 - y3) + x4 * (y3 - y1) + x3 * (y1 - y4));
          let expectedPower: number = Math.abs(arr.power * presentedArea / panelArea);
          expectedPower *= irradiance;

          if (powerLimit > 0 && expectedPower > powerLimit) {
            expectedPower = powerLimit;
          }

          power += expectedPower * arr.modules.length;
        }
      }
      predictedData.push({ time: t, power: power });
    }
    return predictedData;
  }


  CalculateTodaysCost(): any {
    let cost: any = [];
    let t: number;
    let now: Date = new Date(this.date);
    let plan: EnergyPlan = this.liveDataService.getEnergyPlan(now);
    let sum: number = -plan.DailySupplyCharge * 1.1;
    for (t = 0; t < 24 * 4; t++) { 

      if (this.enphaseData[t] != null) {
        let wattsNet: number = 0;
        wattsNet = this.enphaseData[t].whConsumed - this.enphaseData[t].whProduced;

        let time: number = t / 4;
        let price: PriceBreak = this.liveDataService.energyPlans.findTariff(plan, now, time, false);

        let rate: number = 0;
        if (wattsNet > 0)
          rate = -(wattsNet) / 1000.0 * price.Rate * (1 - plan.EnergyDiscount) * 1.1;
        else
          rate = -(wattsNet) / 1000.0 * plan.FiT;

        sum += rate;  // working in quarter hours

        cost.push(sum);
      }
      else {
        cost.push(null);
      }
    }
    return cost;
  }



  redrawChart(): void {

    this.chart.clearDataSeries();

    let predictedSolar: any = this.CalculatePredictedSolar(0);
    let predictedLimitedSolar: any = this.CalculatePredictedSolar(270);

    let dailyCost: any = this.CalculateTodaysCost();
    let dailyCostMin: number = dailyCost.reduce(function (a, b) { return Math.min(a, b); });
    let dailyCostMax: number = dailyCost.reduce(function (a, b) { return Math.max(a, b); });
    let maxCost: number = Math.max(Math.abs(dailyCostMin), Math.abs(dailyCostMax));
    maxCost = (Math.floor(maxCost / 0.25) + 1) * 0.25;

    let max:number = 0;
    this.enphaseData.reduce(function (acc, cur) { if (cur != null) { max = Math.max(max, cur.whConsumed * 4, cur.whProduced * 4); } return acc });
    max = Math.max(max, this.maxConsumuption, this.maxPower, this.maxProduction);
    max = (Math.floor(max / 500) + 1)* 500;
    let min = -max;

    const dayStart = 0;
    const dayEnd = 24*4;  // 15 minute intervals

    // Find rate bands
    let month: number = this.date.getMonth();
    let day: number = this.date.getDate();
    let dow: number = this.date.getDay();

    // find our prices
    let now: Date = new Date(this.date);
    let plan: EnergyPlan = this.liveDataService.getEnergyPlan(now);
    let prices: any = [];
    let rates: any = {};
    for (let ip: number = plan.Pricing.length - 1; ip >= 0; ip--) {
      let pr: any = plan.Pricing[ip];
      if ( 
        this.liveDataService.energyPlans.dateMatch(pr, month, day) &&
        this.liveDataService.energyPlans.dowMatch(pr, dow)) {
        prices.push(pr);
        if (!(pr.Rate in rates))
          rates[pr.Rate] = 1;
      }
    }
    let ratesSorted: any = [];
    for (let key in rates)
      ratesSorted.push(key);
    ratesSorted.sort();

    let idx: number = 0;
    for (let r of ratesSorted)
      rates[r] = idx++;

    this.chart.prices = prices;
    this.chart.rates = rates;

    let t: number;
    let series: any[] = [24*4];
    for (t = 0; t < 24 * 4; t++) {
      if (this.enphaseData[t] != null) {
        series[t] = { x: t, y: this.enphaseData[t].whProduced * 4 };
      } else {
        series[t] = null;
      }
    }

    let dataSeries: DataSeries = new DataSeries();
    dataSeries.chartType = EChartType.column;
    dataSeries.series = series;
    dataSeries.ymax = max;
    dataSeries.ymin = min;
    dataSeries.xmin = dayStart;
    dataSeries.xmax = dayEnd;
    dataSeries.yAxisType = EAxisType.secondary;
    dataSeries.yDataType = "number";
    dataSeries.yUnits = "W";
    dataSeries.xAxisType = EAxisType.primary;
    dataSeries.xTickFormat = "none";
    dataSeries.xAxisAtZero = true;
    dataSeries.strokeStyle = "rgb(190,225,254)";
    dataSeries.fillStyle = "rgb(190,225,254)";
    this.chart.addDataSeries(dataSeries);

    series = [24 * 4];
    for (t = 0; t < 24 * 4; t++) {
      series[t] = null;
      if (this.enphaseData[t] != null) {
        let net: number = this.enphaseData[t].whProduced - this.enphaseData[t].whConsumed;
        if (net > 0) {
          series[t] = { x: t, y: net * 4 };
        }
      }
    }

    dataSeries = new DataSeries();
    dataSeries.chartType = EChartType.column;
    dataSeries.series = series;
    dataSeries.ymax = max;
    dataSeries.ymin = min;
    dataSeries.xmin = dayStart;
    dataSeries.xmax = dayEnd;
    dataSeries.strokeStyle = "rgb(71,169,252)";
    dataSeries.fillStyle = "rgb(71,169,252)";
    this.chart.addDataSeries(dataSeries);


    series = [24 * 4];
    for (t = 0; t < 24 * 4; t++) {
      if (this.enphaseData[t] != null) {
        series[t] = { x: t, y: -this.enphaseData[t].whConsumed * 4 };
      } else {
        series[t] = null;
      }
    }

    dataSeries = new DataSeries();
    dataSeries.chartType = EChartType.column;
    dataSeries.series = series;
    dataSeries.ymax = max;
    dataSeries.ymin = min;
    dataSeries.xmin = dayStart;
    dataSeries.xmax = dayEnd;
    dataSeries.strokeStyle = "rgb(252,213,188)";
    dataSeries.fillStyle = "rgb(252,213,188)";
    this.chart.addDataSeries(dataSeries);

    series = [24 * 4];
    for (t = 0; t < 24 * 4; t++) {
      series[t] = null;
      if (this.enphaseData[t] != null) {
        let net: number = this.enphaseData[t].whProduced - this.enphaseData[t].whConsumed;
        if (net < 0) {
          series[t] = { x: t, y: net * 4 };
        }
      }
    }

    dataSeries = new DataSeries();
    dataSeries.chartType = EChartType.column;
    dataSeries.series = series;
    dataSeries.ymax = max;
    dataSeries.ymin = min;
    dataSeries.xmin = dayStart;
    dataSeries.xmax = dayEnd;
    dataSeries.strokeStyle = "rgb(245,135,64)";
    dataSeries.fillStyle = "rgb(245,135,64)";
    dataSeries.lineWidth = 2;
    this.chart.addDataSeries(dataSeries);


    series = [];
    for (t = 0; t < predictedLimitedSolar.length; t++)
      series[series.length] = { x: predictedLimitedSolar[t].time * 4, y: predictedLimitedSolar[t].power };

    dataSeries = new DataSeries();
    dataSeries.chartType = EChartType.line;
    dataSeries.series = series;
    dataSeries.ymax = max;
    dataSeries.ymin = min;
    dataSeries.xmin = dayStart;
    dataSeries.xmax = dayEnd;
    dataSeries.strokeStyle = "orange";
    dataSeries.lineWidth = 2;
    dataSeries.lineDash = [5, 5];
    this.chart.addDataSeries(dataSeries);

    series = [];
    for (t = 0; t < predictedSolar.length; t++)
      series[series.length] = { x: predictedSolar[t].time * 4, y: predictedSolar[t].power };

    dataSeries = new DataSeries();
    dataSeries.chartType = EChartType.line;
    dataSeries.series = series;
    dataSeries.ymax = max;
    dataSeries.ymin = min;
    dataSeries.xmin = dayStart;
    dataSeries.xmax = dayEnd;
    dataSeries.strokeStyle = "red";
    this.chart.addDataSeries(dataSeries);


    let lastT: number = 0;
    series = [24*4];
    for (t = 0; t < 24 * 4; t++) {
      series[t] = null;
      if (dailyCost[t] != null) {
        series[t] = { x: t, y: dailyCost[t] };
        lastT = t;
      }
    }
    series[lastT] = { x: lastT, y: dailyCost[lastT], note: "$" + common.prettyFloat(-dailyCost[lastT], 100) };
    

    dataSeries = new DataSeries();
    dataSeries.chartType = EChartType.line;
    dataSeries.yAxisType = EAxisType.primary;
    dataSeries.yDataType = "number";
    dataSeries.yTickFormat = "2";
    dataSeries.yUnits = "$";
    dataSeries.series = series;
    dataSeries.ymax = maxCost;
    dataSeries.ymin = -maxCost;
    dataSeries.xmin = dayStart;
    dataSeries.xmax = dayEnd;
    dataSeries.lineWidth = 2;
    dataSeries.strokeStyle = "green";
    this.chart.addDataSeries(dataSeries);


    this.chart.draw();
  }
  
  MakePlusMinus180(n: number): number {
    while (n < -180)
      n += 360;
    while (n > 180)
      n -= 360;
    return n;
  }

  dateChange(evt: Date) {
    let d: Date = new Date(evt);
    this.date = d;
    this.liveDataService.getEnphaseDayData(this.systemId, this.date).subscribe(result => { this.processDayData(result); });
  }

  public incrementDate() {
    let d: Date = new Date(this.date.getTime() + 24 * 60 * 60 * 1000);
    if (d.getTime() > Date.now())
      return;
    this.date = d;
    this.liveDataService.getEnphaseDayData(this.systemId, this.date).subscribe(result => { this.processDayData(result); });
  }

  public decrementDate() {
    this.date = new Date( this.date.getTime() - 24*60*60*1000 );
    this.liveDataService.getEnphaseDayData(this.systemId, this.date).subscribe(result => { this.processDayData(result); });
  }

  public redrawBar(power: LivePower) {
    if (Math.abs(power.wattsConsumed) > this.maxPower)
      this.maxPower = Math.abs(power.wattsConsumed);
    if (Math.abs(power.wattsProduced) > this.maxPower)
      this.maxPower = Math.abs(power.wattsProduced);
    let max: number = (Math.floor(this.maxPower / 500) + 1) * 500;

    if (Math.abs(power.wattsConsumed) > this.maxConsumuption)
      this.maxConsumuption = Math.abs(power.wattsConsumed);
    if (Math.abs(power.wattsProduced) > this.maxProduction)
      this.maxProduction = Math.abs(power.wattsProduced);


    let now: Date = new Date(power.timestamp);
    let plan: EnergyPlan = this.liveDataService.getEnergyPlan(now);
    let time: number = now.getHours() + now.getMinutes() / 60;
    let price: PriceBreak = this.liveDataService.energyPlans.findTariff(plan, now, time, false);
    let rate: number = 0;

    if (power.wattsNet > 0)
      rate = -(power.wattsNet) / 1000.0 * price.Rate * (1 - plan.EnergyDiscount) * 1.1;
    else
      rate = -(power.wattsNet) / 1000.0 * plan.FiT;

    let ctx: CanvasRenderingContext2D = this.barCanvasRef.nativeElement.getContext('2d');

    // Clear any previous content.
    let width: number = this.barCanvasRef.nativeElement.width;
    let height: number = this.barCanvasRef.nativeElement.height;

    if (this.fullUpdate) {
      ctx.clearRect(0, 0, width, height);
      return;
    }
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.translate(0, height / 2);


    ctx.lineWidth = 1;

    let a: number;
    // Production
    a = - (height / 2) * power.wattsProduced / max;
    ctx.strokeStyle = "rgba(41, 155, 251, 0.3)";
    ctx.fillStyle = "rgba(41, 155, 251, 0.3)";
    ctx.beginPath();
    ctx.fillRect(0, 0, width, a );
    ctx.fill();

    // Consumption
    a = (height / 2) * power.wattsConsumed / max;
    ctx.strokeStyle = "rgba(244,115,32,0.3)";
    ctx.fillStyle = "rgba(244,115,32,0.3)";
    ctx.beginPath();
    ctx.fillRect(0, 0, width, a);
    ctx.fill();

    // Net
    let net = (height / 2) * power.wattsNet / max;
    if (power.wattsNet < 0) {  // production
      ctx.strokeStyle = "rgba(41, 155, 251, 0.8)";
      ctx.fillStyle = "rgba(41, 155, 251, 0.8)";
    } else {
      ctx.strokeStyle = "rgba(244,115,32,0.8)";
      ctx.fillStyle = "rgba(244,115,32,0.8)";
    }
    ctx.beginPath();
    ctx.fillRect(0, 0, width, net);
    ctx.fill();

    ctx.save();

    // Max possible production
    a = -(height / 2) * common.maxProduction / max;
    ctx.strokeStyle = "red";
    ctx.setLineDash([15, 20]);
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.moveTo(0, a);
    ctx.lineTo(width, a);
    ctx.stroke();

    // Max production
    a = -(height / 2) * this.maxProduction / max;
    ctx.strokeStyle = "black";
    ctx.setLineDash([15, 20]);
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.moveTo(0, a);
    ctx.lineTo(width, a);
    ctx.stroke();

    // Max consumption
    a = (height / 2) * this.maxConsumuption / max;
    ctx.strokeStyle = "black";
    ctx.setLineDash([15, 20]);
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.moveTo(0, a);
    ctx.lineTo(width, a);
    ctx.stroke();

    ctx.restore();

    // Graph ticks
    ctx.strokeStyle = "black";
    for (let i: number = 0; i < max; i += 500) {
      let y: number = (height / 2) * i / max;
      if ((i % 1000) == 0 && i != 0)
        ctx.lineWidth = 2;
      else
        ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.moveTo(0, -y);
      ctx.lineTo(width, -y);
      ctx.stroke();
    }

    // details
    if (true) {
      const fontHeight: number = 20;
      const spacing: number = 3;

      let x:number = width/2;
      let y: number = net;

      ctx.font = fontHeight + "px san serif";
      ctx.textAlign = "center";
      let text: string = (rate < 0 ? "-" : "") + "$" + Math.abs(rate).toFixed(2) + "/h";
      let dim: any = ctx.measureText(text);

      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillRect(x - dim.width / 2 - spacing, y - fontHeight * 3 / 4 - spacing, dim.width + 2 * spacing, fontHeight + 2 * spacing);
      ctx.fillStyle = "black";
      ctx.strokeStyle = "black";

      //ctx.shadowOffsetX = 4;
      //ctx.shadowOffsetY = 4;
      //ctx.shadowBlur = 5;
      ctx.shadowColor = "rgb(255,255,255)";

      ctx.fillText(text, x, y);
    }

    ctx.restore();
  }

}

