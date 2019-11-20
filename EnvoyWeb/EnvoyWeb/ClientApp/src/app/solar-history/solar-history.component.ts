import { Component, ElementRef, ViewChild, AfterViewInit, OnInit, SimpleChanges } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LiveDataService, CircularBuffer, LivePower, ISonoffDailyData, ISonoffSummaryData, ISonoffHoursData, ISonoffDaysData } from '../live-data-service/live-data-service';
import { GradientStep, Gradient } from "../../data/gradient";
import * as SunCalc from "suncalc";
import { mat4, vec3 } from "gl-matrix";
import * as common from '../../data/common';
import { ExpectedConditions } from 'protractor';
import { PriceBreak } from '../../data/energy-plans';
import { Observable } from 'rxjs';
import { timer } from 'rxjs';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';


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
  selector: 'app-solar-history',
  templateUrl: './solar-history.component.html',
  providers: [
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
  ],
})
export class SolarHistoryComponent implements OnInit {
  @ViewChild('chartCanvas') canvasRef: ElementRef;
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
    this.maxPower = common.maxProduction * 1.1;
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
    this.canvasRef.nativeElement.width = this.canvasRef.nativeElement.offsetWidth;
    this.canvasRef.nativeElement.height = this.canvasRef.nativeElement.offsetHeight;

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
    let sum: number = -this.liveDataService.energyPlan.DailySupplyCharge * 1.1;
    for (t = 0; t < 24 * 4; t++) { 

      if (this.enphaseData[t] != null) {
        let wattsNet: number = 0;
        wattsNet = this.enphaseData[t].whConsumed - this.enphaseData[t].whProduced;

        let time: number = t / 4;
        let price: PriceBreak = this.liveDataService.energyPlans.findTariff(this.liveDataService.energyPlan, now, time, false);

        let rate: number = 0;
        if (wattsNet > 0)
          rate = -(wattsNet) / 1000.0 * price.Rate * (1 - this.liveDataService.energyPlan.EnergyDiscount) * 1.1;
        else
          rate = -(wattsNet) / 1000.0 * this.liveDataService.energyPlan.FiT;

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

    let predictedSolar: any = this.CalculatePredictedSolar(0);
    let predictedLimitedSolar: any = this.CalculatePredictedSolar(270);

    let dailyCost: any = this.CalculateTodaysCost();
    let dailyCostMin: number = dailyCost.reduce(function (a, b) { return Math.min(a, b); });
    let dailyCostMax: number = dailyCost.reduce(function (a, b) { return Math.max(a, b); });

    let ctx: CanvasRenderingContext2D = this.canvasRef.nativeElement.getContext('2d');
    ctx.save();

    let width: number = this.canvasRef.nativeElement.width;
    let height: number = this.canvasRef.nativeElement.height;

    let scaleX: number = 0.9 * (width / (24 * 4));
    let scaleY: number = 0.9 * (height / (common.maxProduction / 4 * 2));
    let scaleDailyY: number = 0.9 * (height / 2 / (Math.max(Math.abs(dailyCostMin), Math.abs(dailyCostMax))));

    ctx.clearRect(0, 0, width, height);
    ctx.translate(0, height / 2);

    // Shade background to match pricing
    let month: number = this.date.getMonth();
    let day: number = this.date.getDate();
    let dow: number = this.date.getDay();

    // find our prices
    let prices: any = [];
    let rates: any = {};
    for (let ip: number = this.liveDataService.energyPlan.Pricing.length - 1; ip >= 0; ip--) {
      let pr: any = this.liveDataService.energyPlan.Pricing[ip];
      if ( //this.liveDataService.energyPlans.controlledLoadMatch(pricing, controlledLoad) &&
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

    const colours = [ "240, 240, 240",    // off peak
      "255, 255, 240",   // shoulder
      "255, 240, 240",  // peak
      ];
       

    for (let p of prices) {
      let startTime: any = p.StartTime.split(':');
      let endTime: any = p.EndTime.split(':');

      let start: number = startTime[0] * 4 + startTime[1] / 15;
      let end: number = endTime[0] * 4 + endTime[1] / 15;

      //ctx.strokeStyle = "rgba(41, 155, 251, 0.3)";
      ctx.fillStyle = "rgb(" + colours[rates[p.Rate]] + ")";
      ctx.fillRect(start * scaleX, -height/2, end * scaleX - start * scaleX, height);
    }

    let t: number;
    // white bar background
    ctx.strokeStyle = "rgb(255, 255, 255)";
    ctx.fillStyle = "rgb(255, 255, 255)";
    for (t = 0; t < 24 * 4; t++)
      if (this.enphaseData[t] != null) {
        ctx.fillRect(t * scaleX, 0, 1 * scaleX, -this.enphaseData[t].whProduced * scaleY);
        ctx.fillRect(t * scaleX, 0, 1 * scaleX, this.enphaseData[t].whConsumed * scaleY);
      }

  
    ctx.strokeStyle = "rgba(41, 155, 251, 0.3)";
    ctx.fillStyle = "rgba(41, 155, 251, 0.3)";
    for (t = 0; t < 24 * 4; t++)
      if (this.enphaseData[t] != null) {
        ctx.fillRect(t * scaleX, 0, 1 * scaleX, -this.enphaseData[t].whProduced * scaleY);
      }
    ctx.strokeStyle = "rgba(244,115,32,0.3)";
    ctx.fillStyle = "rgba(244,115,32,0.3)";
    for (t = 0; t < 24 * 4; t++)
      if (this.enphaseData[t] != null) {
        ctx.fillRect(t * scaleX, 0, 1 * scaleX, this.enphaseData[t].whConsumed * scaleY);
      }
    for (t = 0; t < 24 * 4; t++)
      if ( this.enphaseData[t] != null ) {
        let net: number = this.enphaseData[t].whProduced - this.enphaseData[t].whConsumed;
        if (net < 0) {
          ctx.strokeStyle = "rgba(244,115,32,0.8)";
          ctx.fillStyle = "rgba(244,115,32,0.8)";
        }
        else {
          ctx.strokeStyle = "rgba(41, 155, 251, 0.8)";
          ctx.fillStyle = "rgba(41, 155, 251, 0.8)";
        }

      ctx.fillRect(t * scaleX, 0, 1 * scaleX, -net * scaleY);
    }

    ctx.save(); // save context to restore line dash style
    ctx.lineWidth = 2;
    ctx.strokeStyle = "orange";
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(scaleX * (predictedLimitedSolar[0].time) * 4, -scaleY * predictedLimitedSolar[0].power / 4);
    for (let i: number = 1; i < predictedLimitedSolar.length; i++) {
      ctx.lineTo(scaleX * (predictedLimitedSolar[i].time) * 4, -scaleY * predictedLimitedSolar[i].power / 4);
    }
    ctx.stroke();
    ctx.restore();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "red";
    ctx.beginPath();
    ctx.moveTo(scaleX * (predictedSolar[0].time) * 4, -scaleY * predictedSolar[0].power / 4);
    for (let i: number = 1; i < predictedSolar.length; i++) {
      ctx.lineTo(scaleX * (predictedSolar[i].time) * 4, -scaleY * predictedSolar[i].power / 4);
    }
    ctx.stroke();

   
    // Cost
    ctx.lineWidth = 2;
    ctx.strokeStyle = "green"; 
    ctx.beginPath();
    ctx.moveTo(0, -dailyCost[0] * scaleDailyY);
    let lastT: number = 0;
    for (t = 1; t < 24 * 4; t++)
      if (dailyCost[t] != null) {
        ctx.lineTo(t * scaleX, -dailyCost[t] * scaleDailyY);
        lastT = t;
      }
    ctx.stroke();

    // Cost $
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black"; 
    ctx.beginPath();
    ctx.ellipse(lastT * scaleX, -dailyCost[lastT] * scaleDailyY, 5, 5, 0, 0, 2*Math.PI, false);
    ctx.stroke();
    ctx.font = "24px san serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "black";
    ctx.fillText("$" + common.prettyFloat(-dailyCost[lastT],100), lastT * scaleX + 7, -dailyCost[lastT] * scaleDailyY + 10);

    this.fullUpdate = lastT == 24 * 4 - 1;
    this.lastUpdate = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate(), Math.floor((lastT+1) / 4), ((lastT+1) % 4) * 15);

    // X Axis 
    ctx.strokeStyle = "black"
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1200, 0);
    ctx.stroke();

    ctx.restore();
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

    if (Math.abs(power.wattsConsumed) > this.maxConsumuption)
      this.maxConsumuption = Math.abs(power.wattsConsumed);
    if (Math.abs(power.wattsProduced) > this.maxProduction)
      this.maxProduction = Math.abs(power.wattsProduced);


    let now: Date = new Date(power.timestamp);
    let time: number = now.getHours() + now.getMinutes() / 60;
    let price: PriceBreak = this.liveDataService.energyPlans.findTariff(this.liveDataService.energyPlan, now, time, false);
    let rate: number = 0;

    if (power.wattsNet > 0)
      rate = -(power.wattsNet) / 1000.0 * price.Rate * (1 - this.liveDataService.energyPlan.EnergyDiscount) * 1.1;
    else
      rate = -(power.wattsNet) / 1000.0 * this.liveDataService.energyPlan.FiT;

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
    a = - (height/2) * power.wattsProduced / this.maxPower;
    ctx.strokeStyle = "rgba(41, 155, 251, 0.3)";
    ctx.fillStyle = "rgba(41, 155, 251, 0.3)";
    ctx.beginPath();
    ctx.fillRect(0, 0, width, a );
    ctx.fill();

    // Consumption
    a = (height / 2) * power.wattsConsumed / this.maxPower;
    ctx.strokeStyle = "rgba(244,115,32,0.3)";
    ctx.fillStyle = "rgba(244,115,32,0.3)";
    ctx.beginPath();
    ctx.fillRect(0, 0, width, a);
    ctx.fill();

    // Net
    let net = (height / 2) * power.wattsNet / this.maxPower;
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
    a = -(height / 2) * common.maxProduction / this.maxPower;
    ctx.strokeStyle = "red";
    ctx.setLineDash([15, 20]);
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.moveTo(0, a);
    ctx.lineTo(width, a);
    ctx.stroke();

    // Max production
    a = -(height / 2) * this.maxProduction / this.maxPower;
    ctx.strokeStyle = "black";
    ctx.setLineDash([15, 20]);
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.moveTo(0, a);
    ctx.lineTo(width, a);
    ctx.stroke();

    // Max consumption
    a = (height / 2) * this.maxConsumuption / this.maxPower;
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
    for (let i: number = 0; i < this.maxPower; i += 500) {
      let y: number = (height / 2) * i / this.maxPower;
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

