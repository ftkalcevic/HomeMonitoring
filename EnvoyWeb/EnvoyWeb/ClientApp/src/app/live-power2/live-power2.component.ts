import { Component, Inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from "@angular/router";
import { LiveDataService, ISonoffSensorData, ISonoffSample, CircularBuffer, LivePower } from '../live-data-service/live-data-service';
import { PriceBreak, EnergyPlan } from '../../data/energy-plans';
import * as common from '../../data/common';
import {
  MatButtonModule,
  MatButtonToggleModule,
  MatIconModule,
} from '@angular/material';

class LivePowerData {
  name: string;
  id: number;
  power: number;
  buttonRect: { x1, y1, x2, y2: number };
  public constructor(init?: Partial<LivePowerData>) {
    Object.assign(this, init);
  }
};

class HistoricData {
  time: number; // seconds
  max: number;
  min: number;
  data: LivePowerData[];
};

@Component({
  selector: 'app-live-power',
  templateUrl: './live-power2.component.html',
  host: {
    '(click)': 'onMouseClick($event)'
  },

})

export class LivePower2Component {
  @ViewChild('livePowerCanvas') canvasRef: ElementRef;
  private data: LivePowerData[] = [];     
  private historicData: CircularBuffer<HistoricData>;
  public POINTS: number=1200;
  public displayType: string = "detailed";
  envoyDataEm: any;
  sonoffDataEm: any;

  constructor(private liveDataService: LiveDataService, private router: Router ) {
    this.historicData = new CircularBuffer<HistoricData>(this.POINTS);
    this.ReadDevices();
    this.envoyDataEm = this.liveDataService.envoyData.subscribe(result => { this.newSample(result); })
    this.sonoffDataEm = this.liveDataService.sonoffData.subscribe(result => { this.newSonoffSample(result);})
  }

  ngOnDestroy() {
    this.envoyDataEm.unsubscribe();
    this.sonoffDataEm.unsubscribe();
  }

  ngAfterViewInit() {
    this.canvasRef.nativeElement.width = this.canvasRef.nativeElement.offsetWidth;
    this.canvasRef.nativeElement.height = this.canvasRef.nativeElement.offsetHeight;
  }

  public ReadDevices() {
    this.data[this.data.length] = new LivePowerData({ name: "Generation", id: common.GENERATED_ID, power: 0 });
    this.data[this.data.length] = new LivePowerData({ name: "Net", id: common.NET_ID, power: 0 });
    for (let d of this.liveDataService.sonoffDevices) {
      this.data[this.data.length] = new LivePowerData({ name: d.description, id: d.id, power: 0 } );
    }
    this.data[this.data.length] = new LivePowerData({ name: "Other", id: common.OTHER_ID, power: 0 });
    this.data[this.data.length] = new LivePowerData({ name: "Consumption", id: common.CONSUMED_ID, power: 0 });

    // Read existing data
    let e: number = 0, s: number = 0;
    while (e < this.liveDataService.envoyLive.data.length ||
           s < this.liveDataService.sonoffLive.length) {
      if (e < this.liveDataService.envoyLive.data.length && s < this.liveDataService.sonoffLive.length) {
        if (this.liveDataService.envoyLive.data.item(e).receivedTime <= this.liveDataService.sonoffLive.item(s).receivedTime) {
          this.newSample(this.liveDataService.envoyLive.data.item(e),true);
          e++;
        } else {
          this.newSonoffSample(this.liveDataService.sonoffLive.item(s),true);
          s++;
        }
      } else if (e < this.liveDataService.envoyLive.data.length) {
        this.newSample(this.liveDataService.envoyLive.data.item(e),true);
        e++;
      } else {
        this.newSonoffSample(this.liveDataService.sonoffLive.item(s),true);
        s++;
      }
    }
  }

  public newSonoffSample(s: ISonoffSample, dontRedraw?: boolean) {

    let d: LivePowerData = this.data.filter(d => d.id === s.device.id)[0];
    d.power = s.data.StatusSNS.ENERGY.Power;
    this.sampleUpdate(s.receivedTime);

    if ( dontRedraw === undefined) this.redraw();
  }

  public newSample(result: LivePower, dontRedraw?: boolean) {

    if (this.data.length > 0) {
      let total: LivePowerData = this.data.filter(d => d.id === common.CONSUMED_ID)[0];
      total.power = result.wattsConsumed;
      let generated: LivePowerData = this.data.filter(d => d.id === common.GENERATED_ID)[0];
      generated.power = -result.wattsProduced;
      let net: LivePowerData = this.data.filter(d => d.id === common.NET_ID)[0];
      net.power = result.wattsNet;
      if (dontRedraw === undefined) this.redraw();
    }
    this.sampleUpdate(result.receivedTime);
  }

  private sampleUpdate(time: number) {
    this.UpdateOther(this.data);
    let lastSample:number = this.historicData.length-1;
    if (this.historicData.length === 0 ) {
      // no data
    } else if (this.historicData.item(lastSample).time == time) {
      // same time. just update values.
      for (let d of this.data)
        for (let s of this.historicData.item(lastSample).data)
          if (d.id == s.id) {
            s.power = d.power;
            break;
          }
      this.historicData.item(lastSample).max = this.CalcHistoricMax(this.historicData.item(lastSample).data);
      this.historicData.item(lastSample).min = this.CalcHistoricMin(this.historicData.item(lastSample).data);
      this.UpdateOther(this.historicData.item(lastSample).data);
      return;
    }
    // add new
    let h: HistoricData = new HistoricData();
    h.time = time;
    h.data = [];
    for (let i: number = 0; i < this.data.length; i++) {
      h.data[i] = new LivePowerData();
      h.data[i].id = this.data[i].id;
      h.data[i].name = this.data[i].name;
      h.data[i].power = this.data[i].power;
    }
    h.max = this.CalcHistoricMax(h.data);
    h.min = this.CalcHistoricMin(h.data);
    this.UpdateOther(h.data);
    this.historicData.append(h);
  }

  private UpdateOther(h: LivePowerData[]) {
    let sumPower: number = 0;
    let actualPower: number = 0;
    let otherIndex: number = -1;
    for (let i: number = 0; i < h.length; i++) {
      if (h[i].id === common.OTHER_ID)
        otherIndex = i;
      else if (h[i].id === common.CONSUMED_ID)
        actualPower = h[i].power;
      else if (h[i].id>0)
        sumPower += h[i].power;
    }
    if ( otherIndex>=0 && actualPower > sumPower)
      h[otherIndex].power = actualPower - sumPower;
  }

  private CalcHistoricMax(data: LivePowerData[]): number {
    let sum: number = data.slice(0, this.data.length-1).reduce((ty, d) => (d.id >= 0 ?  ty + d.power : ty), 0);
    return Math.max(sum, data[this.data.length-1].power);
  }

  private CalcHistoricMin(data: LivePowerData[]): number {
    let min: number = data.slice(0, this.data.length - 1).reduce((ty, d) => Math.min(ty,d.power), 0);
    return min;
  }

  public redraw(displayType?: string) {
    if (displayType !== undefined) this.displayType = displayType;

//    console.log("redraw - " + this.displayType);
    switch (this.displayType) {
      case "detailed": this.drawDetailed(); break;
      case "simple": this.drawSimple(); break;
      case "consumption": this.drawConsumption(); break;
    }
  }


  private drawDetailed() {
    let now: Date = new Date();
    let time: number = now.getHours() + now.getMinutes() / 60;
    let plan: EnergyPlan = this.liveDataService.getEnergyPlan(now);
    let price: PriceBreak = this.liveDataService.energyPlans.findTariff(plan, now, time, false);
    let rate: number = 0;

    let maxPower: number = this.data.filter(d => d.id === common.CONSUMED_ID)[0].power;
    let minPower: number = this.data.filter(d => d.id === common.GENERATED_ID)[0].power;
    if (maxPower > -minPower)
      rate = -(maxPower + minPower) / 1000.0 * price.Rate * (1-plan.EnergyDiscount)*1.1;
    else
      rate = -(maxPower + minPower) / 1000.0 * plan.FiT;

    let sumPower: number = this.data.slice(0,this.data.length-1).reduce((ty, d) => ty + (d.id >0?d.power:0), 0);

    let maxHistoric: number = 0;
    for (let i: number = 0; i < this.historicData.length; i++) maxHistoric = Math.max(maxHistoric, this.historicData.item(i).max);
    if (maxHistoric > maxPower)
      maxPower = maxHistoric;

    let minHistoric: number = 0;
    for (let i: number = 0; i < this.historicData.length; i++) minHistoric = Math.min(minHistoric, this.historicData.item(i).min);
    if (minHistoric < minPower)
      minPower = minHistoric;

    //minPower = -3500;
    minPower *= 1.1;
    maxPower *= 1.1;

    let ctx: CanvasRenderingContext2D = this.canvasRef.nativeElement.getContext('2d');
    let width: number = this.canvasRef.nativeElement.width;
    let height: number = this.canvasRef.nativeElement.height;

    let barWidth: number = width * 80 / 800;
    let barGap: number = width * 50 / 800;
    let labelWidth: number = width * 120 / 800;
    let labelSpacing: number = width * 10 / 800;
    let labelHeight: number = height / this.data.length - labelSpacing;
    let barX: number = width - barWidth - labelWidth - barGap;
    let labelX: number = width - labelWidth;
    this.POINTS = barX;
    ctx.clearRect(0, 0, width, height);
    ctx.save();

    let scale: number = height / (maxPower-minPower);

    let arrowHead: any = [];

    // live data
    sumPower = 0;
    for (let i: number = 0; i < this.data.length-1; i++) {
      let d = this.data[i];

      ctx.fillStyle = "rgba(" + common.colourList[d.id]+",0.85)";
      if (d.id === common.GENERATED_ID || d.id == common.NET_ID) {
        if (d.power !== 0) {
          ctx.fillRect(barX, (-minPower+d.power) * scale, barWidth, -d.power * scale);
          arrowHead[i] = { X: barX + barWidth, Y1: (-minPower) * scale, Y2: (d.power - minPower) * scale };
        }
      }
      else {
        ctx.fillRect(barX, (sumPower - minPower) * scale, barWidth, d.power * scale);
        if (d.power > 0) {
            arrowHead[i] = { X: barX + barWidth, Y1: (sumPower - minPower) * scale, Y2: (sumPower + d.power - minPower) * scale };
        }
        sumPower += d.power;
      }
    }

    // historic data
    for (let si: number = this.historicData.length - 1; si >= 0; si--) {
      
      let hd = this.historicData.item(si);
      let x: number = si + (this.POINTS - this.historicData.length);
      if (x < 0)
        break;
      let a: string = "," + (0.15 + 0.6 * (si + (this.POINTS - this.historicData.length)) / this.POINTS).toFixed(3) + ")";
      sumPower = 0;
      for (let i: number = 0; i< hd.data.length-1; i++) {
        let d: LivePowerData = hd.data[i];

        ctx.fillStyle = "rgba(" + common.colourList[d.id] + a;
        if (d.id === common.GENERATED_ID || d.id == common.NET_ID) {
          if (d.power !== 0) {
            ctx.fillRect(x, (d.power - minPower) * scale, 1, -d.power * scale);

            if (arrowHead[i] === undefined && d.power > 0) {
              arrowHead[i] = { centerX: x, centerY: (d.power - minPower) * scale + d.power / 2 * scale };
            }
          }
        }
        else {
          ctx.fillRect(x, (sumPower + d.power - minPower) * scale, 1, -d.power * scale);

          if (arrowHead[i] === undefined && d.power > 0) {
            arrowHead[i] = { centerX: x, centerY: (sumPower + d.power - minPower) * scale + d.power / 2 * scale };
          }

          sumPower += d.power;
        }
      }
    }

    ctx.shadowColor = "White";
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "black";
    ctx.textAlign = "center";
    ctx.font = (labelHeight * 3.5 / 10).toFixed(2) + "px Arial";
    for (let i: number = 0; i < this.data.length; i++) {
      let y: number = i * (labelHeight + labelSpacing) + labelSpacing/2 ;

      ctx.fillStyle = "rgb(" + common.colourList[this.data[i].id] + ")";
      ctx.fillRect(labelX, y, labelWidth, labelHeight);
      //if ( this.data[i].id == common.CONSUMED_ID )
      //  ctx.strokeRect(labelX, y, labelWidth, labelHeight);
      if (this.data[i].buttonRect === undefined)
        this.data[i].buttonRect = { x1: labelX, x2: labelX + labelWidth, y1: y, y2: y + labelHeight };

      ctx.fillStyle = "black";
      ctx.fillText(this.data[i].name, labelX + labelWidth / 2, y + labelHeight*4/10);
      let power: number = this.data[i].power;
      if (this.data[i].id == common.GENERATED_ID || this.data[i].id == common.NET_ID)
        power = -power;
      let value: string = power.toFixed(0) + "W";
      if (this.data[i].id === common.NET_ID)
        value += "  "+(rate<0?"-":"")+"$" + Math.abs(rate).toFixed(2) + "/h";
      ctx.fillText(value, labelX + labelWidth / 2, y + labelHeight*9/10);
      //if (this.data[i].id === common.CONSUMED_ID) {
      //  arrowHead[i] = { centerX: barX + barWidth, centerY: (this.data[i].power - minPower) * scale };
      //}

      if (arrowHead[i] !== undefined) {
        if (arrowHead[i].centerX !== undefined) {
          ctx.beginPath();
          ctx.moveTo(arrowHead[i].centerX, arrowHead[i].centerY);
          ctx.lineTo(labelX, y + labelHeight / 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(" + common.colourList[this.data[i].id] + ",0.5)";
          ctx.beginPath();
          let Y1: number = arrowHead[i].Y1;
          let Y2: number = arrowHead[i].Y2;
          if (Y1 < Y2) {
            let n: number = Y1;
            Y1 = Y2;
            Y2 = n;
          }

          ctx.moveTo(arrowHead[i].X, Y1);
          ctx.lineTo(arrowHead[i].X, Y2);
          ctx.lineTo(labelX, y );
          ctx.lineTo(labelX, y + labelHeight);
          ctx.fill();
        }
      }
    }
    // axis
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, (-minPower) * scale);
    ctx.lineTo(barX+barWidth, (-minPower) * scale);
    ctx.stroke();
    // max
    ctx.strokeStyle = "red";
    ctx.setLineDash([15, 20]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, (-common.maxProduction-minPower) * scale);
    ctx.lineTo(barX + barWidth, (-common.maxProduction-minPower) * scale);
    ctx.stroke();
    ctx.restore();
  }


  private drawSimple() {
    let now: Date = new Date();
    let time: number = now.getHours() + now.getMinutes() / 60;
    let plan: EnergyPlan = this.liveDataService.getEnergyPlan(now);
    let price: PriceBreak = this.liveDataService.energyPlans.findTariff(plan, now, time, false);
    let rate: number = 0;

    let maxPower: number = this.data.filter(d => d.id === common.CONSUMED_ID)[0].power;
    let minPower: number = this.data.filter(d => d.id === common.GENERATED_ID)[0].power;
    if (maxPower > -minPower)
      rate = -(maxPower + minPower) / 1000.0 * price.Rate * (1 - plan.EnergyDiscount) * 1.1;
    else
      rate = -(maxPower + minPower) / 1000.0 * plan.FiT;

    let maxHistoric: number = 0;
    for (let i: number = 0; i < this.historicData.length; i++) maxHistoric = Math.max(maxHistoric, this.historicData.item(i).max);
    if (maxHistoric > maxPower)
      maxPower = maxHistoric;

    let minHistoric: number = 0;
    for (let i: number = 0; i < this.historicData.length; i++) minHistoric = Math.min(minHistoric, this.historicData.item(i).min);
    if (minHistoric < minPower)
      minPower = minHistoric;

    minPower *= 1.1;
    maxPower *= 1.1;

    let ctx: CanvasRenderingContext2D = this.canvasRef.nativeElement.getContext('2d');
    let width: number = this.canvasRef.nativeElement.width;
    let height: number = this.canvasRef.nativeElement.height;

    let barWidth: number = width*80/800;
    let barGap: number = width*50/800;
    let labelWidth: number = width *120/800;
    let labelSpacing: number = width*10/800;
    let labelHeight: number = height / this.data.length - labelSpacing;
    let barX: number = width - barWidth - labelWidth - barGap;
    let labelX: number = width - labelWidth;
    this.POINTS = barX;
    ctx.clearRect(0, 0, width, height);
    ctx.save();

    let scale: number = height / (maxPower - minPower);

    let arrowHead: any = [];

    // live data
    for (let i: number = 0; i < this.data.length; i++) {
      let d = this.data[i];

      if (d.id === common.CONSUMED_ID || d.id === common.GENERATED_ID || d.id === common.NET_ID) {
        if (d.power !== 0) {
          ctx.fillStyle = "rgba(" + common.colourList[d.id] + ",0.85)";
          this.fillRect( ctx, barX, (-minPower + d.power) * scale, barWidth, -d.power * scale);
          arrowHead[i] = { X: barX + barWidth, Y1: (-minPower) * scale, Y2: (d.power - minPower) * scale };
        }
      }
    }

    // historic data
    for (let si: number = this.historicData.length - 1; si >= 0; si--) {

      let hd = this.historicData.item(si);
      let x: number = si + (this.POINTS - this.historicData.length);
      if (x < 0)
        break;
      let a: string = "," + (0.15 + 0.6 * (si + (this.POINTS - this.historicData.length)) / this.POINTS).toFixed(3) + ")";

      for (let i: number = 0; i < hd.data.length; i++) {
        let d: LivePowerData = hd.data[i];

        ctx.fillStyle = "rgba(" + common.colourList[d.id] + a;
        if (d.id === common.CONSUMED_ID || d.id === common.GENERATED_ID || d.id === common.NET_ID) {
          if (d.power !== 0) {
            ctx.fillRect(x, (d.power - minPower) * scale, 1, -d.power * scale);

            if (arrowHead[i] === undefined && d.power > 0) {
              arrowHead[i] = { centerX: x, centerY: (d.power - minPower) * scale + d.power / 2 * scale };
            }
          }
        }
      }
    }

    ctx.shadowColor = "White";
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "black";
    ctx.textAlign = "center";
    ctx.font = (labelHeight * 3.5 / 10).toFixed(2) + "px Arial";
    for (let i: number = 0; i < this.data.length; i++) {
      let d: LivePowerData = this.data[i];
      if (d.id === common.CONSUMED_ID || d.id === common.GENERATED_ID || d.id === common.NET_ID ) {

        let y: number = i * (labelHeight + labelSpacing) + labelSpacing / 2;

        ctx.fillStyle = "rgb(" + common.colourList[this.data[i].id] + ")";
        ctx.fillRect(labelX, y, labelWidth, labelHeight);
        //if (this.data[i].id == common.CONSUMED_ID)
        //  ctx.strokeRect(labelX, y, labelWidth, labelHeight);
        if (this.data[i].buttonRect === undefined)
          this.data[i].buttonRect = { x1: labelX, x2: labelX + labelWidth, y1: y, y2: y + labelHeight };

        ctx.fillStyle = "black";
        ctx.fillText(this.data[i].name, labelX + labelWidth / 2, y + labelHeight * 4 / 10);
        let power: number = this.data[i].power;
        if (this.data[i].id == common.GENERATED_ID || this.data[i].id == common.NET_ID)
          power = -power;
        let value: string = power.toFixed(0) + "W";
        if (this.data[i].id === common.NET_ID)
          value += "  " + (rate < 0 ? "-" : "") + "$" + Math.abs(rate).toFixed(2) + "/h";
        ctx.fillText(value, labelX + labelWidth / 2, y + labelHeight * 9 / 10);
        //if (this.data[i].id === common.CONSUMED_ID) {
        //  arrowHead[i] = { centerX: barX + barWidth, centerY: (this.data[i].power - minPower) * scale };
        //}

        if (arrowHead[i] !== undefined) {
          if (arrowHead[i].centerX !== undefined) {
            ctx.beginPath();
            ctx.moveTo(arrowHead[i].centerX, arrowHead[i].centerY);
            ctx.lineTo(labelX, y + labelHeight / 2);
            ctx.stroke();
          } else {
            ctx.fillStyle = "rgba(" + common.colourList[this.data[i].id] + ",0.5)";
            ctx.beginPath();
            let Y1: number = arrowHead[i].Y1;
            let Y2: number = arrowHead[i].Y2;
            if (Y1 < Y2) {
              let n: number = Y1;
              Y1 = Y2;
              Y2 = n;
            }

            ctx.moveTo(arrowHead[i].X, Y1);
            ctx.lineTo(arrowHead[i].X, Y2);
            ctx.lineTo(labelX, y);
            ctx.lineTo(labelX, y + labelHeight);
            ctx.fill();
          }
        }
      }
    }
    // axis
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, (-minPower) * scale);
    ctx.lineTo(barX + barWidth, (-minPower) * scale);
    ctx.stroke();
    // max
    ctx.strokeStyle = "red";
    ctx.setLineDash([15, 20]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, (-common.maxProduction - minPower) * scale);
    ctx.lineTo(barX + barWidth, (-common.maxProduction - minPower) * scale);
    ctx.stroke();
    ctx.restore();
  }

  private drawConsumption() {
    let now: Date = new Date();
    let time: number = now.getHours() + now.getMinutes() / 60;
    let plan: EnergyPlan = this.liveDataService.getEnergyPlan(now);
    let price: PriceBreak = this.liveDataService.energyPlans.findTariff(plan, now, time, false);
    let rate: number = 0;

    let maxPower: number = this.data.filter(d => d.id === common.CONSUMED_ID)[0].power;
    let minPower: number = this.data.filter(d => d.id === common.GENERATED_ID)[0].power;
    if (maxPower > -minPower)
      rate = -(maxPower + minPower) / 1000.0 * price.Rate * (1 - plan.EnergyDiscount) * 1.1;
    else
      rate = -(maxPower + minPower) / 1000.0 * plan.FiT;
    minPower = 0;

    let sumPower: number = this.data.slice(0, this.data.length - 1).reduce((ty, d) => ty + (d.id > 0 ? d.power : 0), 0);

    let maxHistoric: number = 0;
    for (let i: number = 0; i < this.historicData.length; i++) maxHistoric = Math.max(maxHistoric, this.historicData.item(i).max);
    if (maxHistoric > maxPower)
      maxPower = maxHistoric;

    minPower *= 1.1;
    maxPower *= 1.1;

    let ctx: CanvasRenderingContext2D = this.canvasRef.nativeElement.getContext('2d');
    let width: number = this.canvasRef.nativeElement.width;
    let height: number = this.canvasRef.nativeElement.height;

    let barWidth: number = width * 80 / 800;
    let barGap: number = width * 50 / 800;
    let labelWidth: number = width * 120 / 800;
    let labelSpacing: number = width * 10 / 800;
    let labelHeight: number = height / this.data.length - labelSpacing;
    let barX: number = width - barWidth - labelWidth - barGap;
    let labelX: number = width - labelWidth;
    this.POINTS = barX;
    ctx.clearRect(0, 0, width, height);
    ctx.save();

    let scale: number = height / (maxPower - minPower);

    let arrowHead: any = [];

    // live data
    sumPower = 0;
    for (let i: number = 0; i < this.data.length - 1; i++) {
      let d = this.data[i];

      ctx.fillStyle = "rgba(" + common.colourList[d.id] + ",0.85)";
      if (d.id === common.GENERATED_ID || d.id == common.NET_ID) {
      }
      else {
        ctx.fillRect(barX, (sumPower - minPower) * scale, barWidth, d.power * scale);
        if (d.power > 0) {
          arrowHead[i] = { X: barX + barWidth, Y1: (sumPower - minPower) * scale, Y2: (sumPower + d.power - minPower) * scale };
        }
        sumPower += d.power;
      }
    }

    // historic data
    for (let si: number = this.historicData.length - 1; si >= 0; si--) {

      let hd = this.historicData.item(si);
      let x: number = si + (this.POINTS - this.historicData.length);
      if (x < 0)
        break;
      let a: string = "," + (0.15 + 0.6 * (si + (this.POINTS - this.historicData.length)) / this.POINTS).toFixed(3) + ")";
      sumPower = 0;
      for (let i: number = 0; i < hd.data.length - 1; i++) {
        let d: LivePowerData = hd.data[i];

        ctx.fillStyle = "rgba(" + common.colourList[d.id] + a;
        if (d.id === common.GENERATED_ID || d.id == common.NET_ID) {
        }
        else {
          ctx.fillRect(x, (sumPower + d.power - minPower) * scale, 1, -d.power * scale);

          if (arrowHead[i] === undefined && d.power > 0) {
            arrowHead[i] = { centerX: x, centerY: (sumPower + d.power - minPower) * scale + d.power / 2 * scale };
          }

          sumPower += d.power;
        }
      }
    }

    ctx.shadowColor = "White";
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "black";
    ctx.textAlign = "center";
    ctx.font = (labelHeight * 3.5 / 10).toFixed(2) + "px Arial";
    for (let i: number = 0; i < this.data.length; i++) {
      let d: LivePowerData = this.data[i];
      if (d.id !== common.GENERATED_ID) {
        let y: number = i * (labelHeight + labelSpacing) + labelSpacing / 2;

        ctx.fillStyle = "rgb(" + common.colourList[this.data[i].id] + ")";
        ctx.fillRect(labelX, y, labelWidth, labelHeight);
        //if (this.data[i].id == common.CONSUMED_ID)
        //  ctx.strokeRect(labelX, y, labelWidth, labelHeight);
        if (this.data[i].buttonRect === undefined)
          this.data[i].buttonRect = { x1: labelX, x2: labelX + labelWidth, y1: y, y2: y + labelHeight };

        ctx.fillStyle = "black";
        ctx.fillText(this.data[i].name, labelX + labelWidth / 2, y + labelHeight * 4 / 10);
        let power: number = this.data[i].power;
        if (this.data[i].id == common.GENERATED_ID || this.data[i].id == common.NET_ID)
          power = -power;
        let value: string = power.toFixed(0) + "W";
        if (this.data[i].id === common.NET_ID)
          value += "  " + (rate < 0 ? "-" : "") + "$" + Math.abs(rate).toFixed(2) + "/h";
        ctx.fillText(value, labelX + labelWidth / 2, y + labelHeight * 9 / 10);
        //if (this.data[i].id === common.CONSUMED_ID) {
        //  arrowHead[i] = { centerX: barX + barWidth, centerY: (this.data[i].power - minPower) * scale };
        //}

        if (arrowHead[i] !== undefined) {
          if (arrowHead[i].centerX !== undefined) {
            ctx.beginPath();
            ctx.moveTo(arrowHead[i].centerX, arrowHead[i].centerY);
            ctx.lineTo(labelX, y + labelHeight / 2);
            ctx.stroke();
          } else {
            ctx.fillStyle = "rgba(" + common.colourList[this.data[i].id] + ",0.5)";
            ctx.beginPath();
            let Y1: number = arrowHead[i].Y1;
            let Y2: number = arrowHead[i].Y2;
            if (Y1 < Y2) {
              let n: number = Y1;
              Y1 = Y2;
              Y2 = n;
            }

            ctx.moveTo(arrowHead[i].X, Y1);
            ctx.lineTo(arrowHead[i].X, Y2);
            ctx.lineTo(labelX, y);
            ctx.lineTo(labelX, y + labelHeight);
            ctx.fill();
          }
        }
      }
    }
    // axis
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, (-minPower) * scale);
    ctx.lineTo(barX + barWidth, (-minPower) * scale);
    ctx.stroke();
    // max
    ctx.strokeStyle = "red";
    ctx.setLineDash([15, 20]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, (-common.maxProduction - minPower) * scale);
    ctx.lineTo(barX + barWidth, (-common.maxProduction - minPower) * scale);
    ctx.stroke();
    ctx.restore();
  }



  onMouseClick(e: MouseEvent) {

    for (let i: number = 0; i < this.data.length; i++) {
      let d: LivePowerData = this.data[i];
      if (d.buttonRect.x1 <= e.offsetX && e.offsetX <= d.buttonRect.x2 &&
        d.buttonRect.y1 <= e.offsetY && e.offsetY <= d.buttonRect.y2) {
        if (d.id>0)
          this.router.navigate(["/live-power-stats", d.id]);
      }
    }
  }

  private fillRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    if (height < 0) {
      y += height;
      height = -height;
    }
    ctx.fillRect(x, y, width, height);
  }

}


/*
 * Devices list - show live data - now, today, yesterday, etc
 * Individual device - historic data graphs, etc.
 * Live Power - bar/pie.  Different colours for each device.  Callout to show each device details (name, W)
 */
