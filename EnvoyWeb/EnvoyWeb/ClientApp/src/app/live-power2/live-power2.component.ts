import { Component, Inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from "@angular/router";
import { LiveDataService, ISonoffSensorData, ISonoffSample, CircularBuffer, LivePower } from '../live-data-service/live-data-service';
import { PriceBreak } from '../../data/energy-plans';

class LivePowerData {
  name: string;
  total: boolean;
  other: boolean;
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
  private colourList: { [id: string]: string; } = { "-3": "0, 225, 255",
                                                    "-4": "41, 155, 251",
                                                     "1": "244, 115, 32",
                                                     "2": "255, 87, 51",
                                                     "3": "255, 189, 51",
                                                     "4": "219, 255, 51",
                                                     "5": "117, 255, 51",
                                                     "6": "51, 255, 87",
                                                     "7": "117, 255, 189",
                                                     "-2": "51, 255, 189",
                                                     "-1": "255, 255, 255" };
  private historicData: CircularBuffer<HistoricData>;
  public POINTS: number=1200;
  private readonly CONSUMED_ID: number = -1;
  private readonly OTHER_ID: number = -2;
  private readonly GENERATED_ID: number = -3;
  private readonly NET_ID: number = -4;
  private maxProduction: number = 270 * 12;

  constructor(private liveDataService: LiveDataService, private router: Router ) {
    this.historicData = new CircularBuffer<HistoricData>(this.POINTS);
    this.ReadDevices();
    this.liveDataService.envoyData.subscribe(result => { this.newSample(result); })
    this.liveDataService.sonoffData.subscribe(result => { this.newSonoffSample(result);})
  }

  ngAfterViewInit() {
    this.canvasRef.nativeElement.width = this.canvasRef.nativeElement.offsetWidth;
    this.canvasRef.nativeElement.height = this.canvasRef.nativeElement.offsetHeight;
  }

  public ReadDevices() {
    this.data[this.data.length] = new LivePowerData({ name: "Generation", total: false, other: false, id: this.GENERATED_ID, power: 0 });
    this.data[this.data.length] = new LivePowerData({ name: "Net", total: false, other: false, id: this.NET_ID, power: 0 });
    for (let d of this.liveDataService.sonoffDevices) {
      this.data[this.data.length] = new LivePowerData({ name: d.description, total: false, other: false, id: d.id, power: 0 } );
    }
    this.data[this.data.length] = new LivePowerData({ name: "Other", total: false, other: true, id: this.OTHER_ID, power: 0 });
    this.data[this.data.length] = new LivePowerData({ name: "Consumption", total: true, other: false, id: this.CONSUMED_ID, power: 0 });

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
      let total: LivePowerData = this.data.filter(d => d.id === this.CONSUMED_ID)[0];
      total.power = result.wattsConsumed;
      let generated: LivePowerData = this.data.filter(d => d.id === this.GENERATED_ID)[0];
      generated.power = -result.wattsProduced;
      let net: LivePowerData = this.data.filter(d => d.id === this.NET_ID)[0];
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
      h.data[i].total = this.data[i].total;
      h.data[i].other = this.data[i].other;
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
      if (h[i].other)
        otherIndex = i;
      else if (h[i].total)
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

  public redraw() {

    let now: Date = new Date();
    let time: number = now.getHours() + now.getMinutes() / 60;
    let price: PriceBreak = this.liveDataService.energyPlans.findTariff(this.liveDataService.energyPlan, now, time, false);
    let rate: number = 0;

    let maxPower: number = this.data.filter(d => d.id === this.CONSUMED_ID)[0].power;
    let minPower: number = this.data.filter(d => d.id === this.GENERATED_ID)[0].power;
    if (maxPower > -minPower)
      rate = -(maxPower + minPower) / 1000.0 * price.Rate * (1-this.liveDataService.energyPlan.EnergyDiscount)*1.1;
    else
      rate = -(maxPower + minPower) / 1000.0 * this.liveDataService.energyPlan.FiT;

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

    let barWidth: number = 80;
    let barGap:number = 50;
    let labelWidth: number = 120;
    let labelSpacing: number = 10;
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

      ctx.fillStyle = "rgba("+this.colourList[d.id]+",0.85)";
      if (d.id === this.GENERATED_ID || d.id == this.NET_ID) {
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
      let a: string = "," + (0.15 + 0.7 * (si + (this.POINTS - this.historicData.length)) / this.POINTS).toFixed(3) + ")";
      sumPower = 0;
      for (let i: number = 0; i< hd.data.length-1; i++) {
        let d: LivePowerData = hd.data[i];

        ctx.fillStyle = "rgb(" + this.colourList[d.id] + a;
        if (d.id === this.GENERATED_ID || d.id == this.NET_ID) {
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
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "black";
    ctx.textAlign = "center";
    ctx.font = (labelHeight * 3.5 / 10).toFixed(2) + "px Arial";
    for (let i: number = 0; i < this.data.length; i++) {
      let y: number = i * (labelHeight + labelSpacing) + labelSpacing/2 ;

      ctx.fillStyle = "rgb(" + this.colourList[this.data[i].id] + ")";
      ctx.fillRect(labelX, y, labelWidth, labelHeight);
      if ( this.data[i].total )
        ctx.strokeRect(labelX, y, labelWidth, labelHeight);
      if (this.data[i].buttonRect === undefined)
        this.data[i].buttonRect = { x1: labelX, x2: labelX + labelWidth, y1: y, y2: y + labelHeight };

      ctx.fillStyle = "black";
      ctx.fillText(this.data[i].name, labelX + labelWidth / 2, y + labelHeight*4/10);
      let power: number = this.data[i].power;
      if (this.data[i].id == this.GENERATED_ID || this.data[i].id == this.NET_ID)
        power = -power;
      let value: string = power.toFixed(0) + "W";
      if (this.data[i].id === this.NET_ID)
        value += "  "+(rate<0?"-":"")+"$" + Math.abs(rate).toFixed(2) + "/h";
      ctx.fillText(value, labelX + labelWidth / 2, y + labelHeight*9/10);
      if (this.data[i].id === this.CONSUMED_ID) {
        arrowHead[i] = { centerX: barX + barWidth, centerY: (this.data[i].power - minPower) * scale };
      }

      if (arrowHead[i] !== undefined) {
        if (arrowHead[i].centerX !== undefined) {
          ctx.beginPath();
          ctx.moveTo(arrowHead[i].centerX, arrowHead[i].centerY);
          ctx.lineTo(labelX, y + labelHeight / 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(" + this.colourList[this.data[i].id] + ",0.5)";
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
    ctx.moveTo(0, (-this.maxProduction-minPower) * scale);
    ctx.lineTo(barX + barWidth, (-this.maxProduction-minPower) * scale);
    ctx.stroke();
    ctx.restore();
  }

  onMouseClick(e: MouseEvent) {
    console.info("Mouse click ");

    for (let i: number = 0; i < this.data.length; i++) {
      let d: LivePowerData = this.data[i];
      if (d.buttonRect.x1 <= e.offsetX && e.offsetX <= d.buttonRect.x2 &&
        d.buttonRect.y1 <= e.offsetY && e.offsetY <= d.buttonRect.y2) {
        if (!d.other && !d.total)
          this.router.navigate(["/sonoff-device", d.id]);
      }
    }
  }

}


/*
 * Devices list - show live data - now, today, yesterday, etc
 * Individual device - historic data graphs, etc.
 * Live Power - bar/pie.  Different colours for each device.  Callout to show each device details (name, W)
 */
