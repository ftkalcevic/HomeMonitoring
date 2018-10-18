import { Component, Inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from "@angular/router";
import { LiveDataService, ISonoffSensorData, ISonoffSample, CircularBuffer, LivePower } from '../live-data-service/live-data-service';

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
  time: Date;
  max: number;
  data: LivePowerData[];
};

@Component({
  selector: 'app-live-power',
  templateUrl: './live-power.component.html',
  host: {
    '(click)': 'onMouseClick($event)'
  },

})

export class LivePowerComponent {
  @ViewChild('livePowerCanvas') canvasRef: ElementRef;
  private data: LivePowerData[] = [];
  private colourList: string[] = ["244, 115, 32",
                                  "255, 87, 51",
                                  "255, 189, 51",
                                  "219, 255, 51",
                                  "117, 255, 51",
                                  "51, 255, 87",
                                  "51, 255, 189",
                                  "0, 225, 255",
                                  "255, 255, 255"];
  private historicData: CircularBuffer<HistoricData>;
  public POINTS: number=500;


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
    for (let d of this.liveDataService.sonoffDevices) {
      this.data[this.data.length] = new LivePowerData({ name: d.description, total: false, other: false, id: d.id, power: 0 } );
    }
    this.data[this.data.length] = new LivePowerData({ name: "Other", total: false, other: true, id: -1, power: 0 });
    this.data[this.data.length] = new LivePowerData({ name: "Total", total: true, other: false, id: -1, power: 0 });

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

    for (let d of this.data)
      if (d.id == s.device.id) {
        d.power = s.data.StatusSNS.ENERGY.Power;
        break;
      }
    this.sampleUpdate(s.data.StatusSNS.Time);
    if ( dontRedraw === undefined) this.redraw();
  }

  public newSample(result: LivePower, dontRedraw?: boolean) {

    if (this.data.length > 0) {
      this.data[this.data.length-1].power = result.wattsConsumed;
      if (dontRedraw === undefined) this.redraw();
    }
    this.sampleUpdate(result.timestamp);
  }

  private sampleUpdate(t: Date) {
    this.UpdateOther(this.data);
    let lastSample:number = this.historicData.length-1;
    if (this.historicData.length === 0 ) {
      // no data
    } else if (this.historicData.item(lastSample).time == t) {
      // same time. just update values.
      for (let d of this.data)
        for (let s of this.historicData.item(lastSample).data)
          if (d.id == s.id) {
            s.power = d.power;
            break;
          }
      this.historicData.item(lastSample).max = this.CalcHistoricMax(this.historicData.item(lastSample).data);
      this.UpdateOther(this.historicData.item(lastSample).data);
      return;
    }
    // add new
    let h: HistoricData = new HistoricData();
    h.time = t;
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
      else
        sumPower += h[i].power;
    }
    if ( otherIndex>=0 && actualPower > sumPower)
      h[otherIndex].power = actualPower - sumPower;
  }

  private CalcHistoricMax(data: LivePowerData[]): number {
    let sum: number = data.slice(0, this.data.length - 2).reduce((ty, d) => ty + d.power, 0);
    return Math.max(sum, data[this.data.length-1].power);
  }

  public redraw() {

    let maxPower: number = this.data[this.data.length-1].power;

    let sumPower: number = this.data.slice(0,this.data.length-1).reduce((ty, d) => ty + d.power, 0);

    let maxHistoric: number = 0;
    for (let i: number = 0; i < this.historicData.length; i++) maxHistoric = Math.max(maxHistoric, this.historicData.item(i).max);
    if (maxHistoric > maxPower)
      maxPower = maxHistoric;

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

    let scale: number = height / maxPower;

    let arrowHead: any = [];

    // live data
    sumPower = 0;
    for (let i: number = 0; i < this.data.length-1; i++) {
      let d = this.data[i];
      ctx.fillStyle = "rgb("+this.colourList[i]+")";
      ctx.fillRect(barX, height - (sumPower + d.power) * scale, barWidth, d.power * scale);
      if (d.power > 0) {
        arrowHead[i] = { X: barX + barWidth, Y1: height - (sumPower + d.power) * scale, Y2: height - (sumPower + d.power) * scale + d.power * scale };
      }
      sumPower += d.power;
    }

    // historic data
    for (let si: number = this.historicData.length - 1; si >= 0; si--) {
      
      let hd = this.historicData.item(si);
      let x: number = si + (this.POINTS - this.historicData.length);
      let a: string = "," + (0.15 + 0.7 * (si + (this.POINTS - this.historicData.length)) / this.POINTS).toFixed(3) + ")";
      sumPower = 0;
      for (let i: number = 0; i< hd.data.length-1; i++) {
        let d: LivePowerData = hd.data[i];

        ctx.fillStyle = "rgb(" + this.colourList[i] + a;
        ctx.fillRect(x, height - (sumPower + d.power) * scale, 1, d.power * scale);

        if (arrowHead[i] === undefined && d.power > 0 ) {
          arrowHead[i] = { centerX: x, centerY: height - (sumPower + d.power) * scale + d.power / 2 * scale };
        }

        sumPower += d.power;
      }
    }

    ctx.strokeStyle = "black";
    ctx.textAlign = "center";
    for (let i: number = 0; i < this.data.length; i++) {
      let y: number = i;

      ctx.fillStyle = "rgb(" + this.colourList[i] + ")";
      ctx.fillRect(labelX, height - y * (labelHeight + labelSpacing) - labelHeight, labelWidth, labelHeight);
      if ( this.data[i].total )
        ctx.strokeRect(labelX, height - y * (labelHeight + labelSpacing) - labelHeight, labelWidth, labelHeight);
      if (this.data[i].buttonRect === undefined)
        this.data[i].buttonRect = { x1: labelX, x2: labelX + labelWidth, y1: height - y * (labelHeight + labelSpacing) - labelHeight, y2: height - y * (labelHeight + labelSpacing) };

      ctx.fillStyle = "black";
      ctx.fillText(this.data[i].name, labelX + labelWidth / 2, height - y * (labelHeight + labelSpacing) - labelHeight+9);
      ctx.fillText(this.data[i].power.toFixed(0) + "W", labelX + labelWidth / 2, height - y * (labelHeight + labelSpacing) - labelHeight + 20);

      if (arrowHead[i] !== undefined) {
        if (arrowHead[i].centerX !== undefined) {
          ctx.beginPath();
          ctx.moveTo(arrowHead[i].centerX, arrowHead[i].centerY);
          ctx.lineTo(labelX, height - y * (labelHeight + labelSpacing) - labelHeight / 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(" + this.colourList[i] + ",0.5)";
          ctx.beginPath();
          ctx.moveTo(arrowHead[i].X, arrowHead[i].Y1);
          ctx.lineTo(arrowHead[i].X, arrowHead[i].Y2);
          ctx.lineTo(labelX, height - y * (labelHeight + labelSpacing));
          ctx.lineTo(labelX, height - y * (labelHeight + labelSpacing) - labelHeight);
          ctx.fill();
        }
      }
    }
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
