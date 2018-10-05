import { Component, Inject, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LiveDataService, ISonoffSensorData, ISonoffSample } from '../live-data-service/live-data-service';




class LivePowerData {
  name: string;
  total: boolean;
  id: number;
  power: number;
  centerX: number;
  centerY: number;
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
  templateUrl: './live-power.component.html'
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
                                  "51, 255, 189"];
  private historicData: HistoricData[] = [];
  public first: number = 0;
  public last: number = 0;
  public POINTS: number=500;


  constructor( private liveDataService: LiveDataService ) {
    this.ReadDevices();
    this.liveDataService.envoyData.subscribe(result => { this.newSample(result); })
    this.liveDataService.sonoffData.subscribe(result => { this.newSonoffSample(result);})
  }

  public ReadDevices() {
    for (let d of this.liveDataService.sonoffDevices) {
      this.data[this.data.length] = new LivePowerData( { name: d.description, total: false, id: d.id, power: 0 } );
    }
    this.data[this.data.length] = new LivePowerData( { name: "Total", total: true, id: -1, power: 0 } );
  }

  public newSonoffSample(s: ISonoffSample) {

    for (let d of this.data)
      if (d.id == s.device.id) {
        d.power = s.data.StatusSNS.ENERGY.Power;
        break;
      }
    this.sampleUpdate(s.data.StatusSNS.Time);
    this.redraw();
  }

  public newSample(result: ILivePower) {
    if (this.data.length > 0) {
      this.data[this.data.length-1].power = result.wattsConsumed;
      this.redraw();
    }
    this.sampleUpdate(result.timestamp);
  }

  private sampleUpdate(t: Date) {
    let lastSample = this.getLast();
    if (this.first == this.last) {
      // no data
    } else if (this.historicData[lastSample].time == t) {
      // same time. just update values.
      for (let d of this.data)
        for (let s of this.historicData[lastSample].data)
          if (d.id == s.id) {
            s.power = d.power;
            break;
          }
      this.historicData[lastSample].max = this.CalcHistoricMax(this.historicData[lastSample].data);
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
    }
    h.max = this.CalcHistoricMax(h.data);
    this.AddHistoric(h);
  }

  private CalcHistoricMax(data: LivePowerData[]): number {
    let sum: number = data.slice(0, this.data.length - 1).reduce((ty, d) => ty + d.power, 0);
    return Math.max(sum, data[this.data.length-1].power);
  }

  private getLast(): number {
    if (this.last > 0)
      return this.last-1;
    else
      return this.POINTS - 1;
  }

  private AddHistoric(h: HistoricData) {
    this.historicData[this.last] = h;
    this.last++;
    if (this.last >= this.POINTS)
      this.last = 0;
    if (this.first == this.last) {
      this.first++;
      if (this.first >= this.POINTS)
        this.first = 0;
    }
  }


  public redraw() {

    let maxPower: number = this.data[this.data.length-1].power;

    // check if component power exceeds maxPower.  This can happen because we don't
    // receive data at the same time
    let sumPower: number = this.data.slice(0,this.data.length-1).reduce((ty, d) => ty + d.power, 0);
    if (sumPower > maxPower)
      maxPower = sumPower;

    let maxHistoric: number = this.historicData.reduce((m, hd) => Math.max(m,hd.max), 0);
    if (maxHistoric > maxPower)
      maxPower = maxHistoric;

    let ctx: CanvasRenderingContext2D = this.canvasRef.nativeElement.getContext('2d');
    let width: number = this.canvasRef.nativeElement.width;
    let height: number = this.canvasRef.nativeElement.height;

    let barWidth: number = 80;
    let labelWidth: number = 120;
    let barX: number = width - barWidth - labelWidth - 10;
    let labelX: number = width - labelWidth;
    this.POINTS = barX;
    ctx.clearRect(0, 0, width, height);

    let scale: number = height / maxPower;

    // live data
    sumPower = 0;
    for (let i: number = 0; i < this.data.length; i++) {
      let d = this.data[i];
      if (d.total) {
        ctx.fillStyle = "rgb("+this.colourList[i]+")";
        ctx.fillRect(barX, height - d.power * scale, barWidth, (d.power-sumPower) * scale);
        d.centerX = barX + barWidth / 2;
        // d.centerY = height - (d.power - (d.power-sumPower)/2) * scale;   // mid over
        d.centerY = height - d.power * scale;
      } else {
        ctx.fillStyle = "rgb("+this.colourList[i]+")";
        ctx.fillRect(barX, height - (sumPower + d.power)*scale, barWidth, d.power*scale);
        d.centerX = barX + barWidth / 2;
        d.centerY = height - (sumPower + d.power) * scale + d.power / 2 * scale;
        sumPower += d.power;
      }
    }
    // historic data
    let s: number = this.getLast();
    for (let si: number = 0; si < this.POINTS; si++) {
      let hd = this.historicData[s];
      let x: number = barX - si;
      let a: string = "," + (0.15+0.7*(this.POINTS - si) / this.POINTS).toFixed(3) + ")";
      sumPower = 0;
      for (let i: number = 0; i< hd.data.length; i++) {
        let d: LivePowerData = hd.data[i];

        if (d.total) {
          ctx.fillStyle = "rgba(" + this.colourList[i] + a;
          ctx.fillRect(x, height - d.power * scale, 1, d.power * scale);
        } else {
          ctx.fillStyle = "rgb(" + this.colourList[i] + a;
          ctx.fillRect(x, height - (sumPower + d.power) * scale, 1, d.power * scale);
          sumPower += d.power;
        }
      }
      if (s == this.first) break;
      if (s == 0)
        s = this.POINTS - 1;
      else
        s--;
    }

    ctx.strokeStyle = "black";
    ctx.textAlign = "center";
    for (let i: number = 0; i < this.data.length; i++) {
      let y: number = i;

      ctx.fillStyle = "rgb(" + this.colourList[i] + ")";
      ctx.fillRect(labelX, height - (y * 35 + 25), labelWidth, 25);

      ctx.fillStyle = "black";
      ctx.fillText(this.data[i].name, labelX + labelWidth / 2, height - (y * 35 + 16));
      ctx.fillText(this.data[i].power.toFixed(0) + "W", labelX + labelWidth / 2, height - (y * 35 + 4));

      ctx.beginPath();
      ctx.moveTo(this.data[i].centerX, this.data[i].centerY); 
      ctx.lineTo(labelX, height-(y * 35 + 12));
      ctx.stroke();
    }
  }
}


/*
 * Devices list - show live data - now, today, yesterday, etc
 * Individual device - historic data graphs, etc.
 * Live Power - bar/pie.  Different colours for each device.  Callout to show each device details (name, W)
 */
