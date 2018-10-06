import { Component, Inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { LiveDataService, ISonoffSensorData, ISonoffSample, CircularBuffer, LivePower } from '../live-data-service/live-data-service';

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
  private historicData: CircularBuffer<HistoricData>;
  public first: number = 0;
  public last: number = 0;
  public POINTS: number=500;


  constructor( private liveDataService: LiveDataService ) {
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
      this.data[this.data.length] = new LivePowerData( { name: d.description, total: false, id: d.id, power: 0 } );
    }
    this.data[this.data.length] = new LivePowerData({ name: "Total", total: true, id: -1, power: 0 });

    this.liveDataService.envoyLive;
    this.liveDataService.sonoffData;

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
        this.newSample(this.liveDataService.envoyLive.data[e],true);
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
    this.historicData.append(h);
  }

  private CalcHistoricMax(data: LivePowerData[]): number {
    let sum: number = data.slice(0, this.data.length - 1).reduce((ty, d) => ty + d.power, 0);
    return Math.max(sum, data[this.data.length-1].power);
  }

  public redraw() {

    let maxPower: number = this.data[this.data.length-1].power;

    // check if component power exceeds maxPower.  This can happen because we don't
    // receive data at the same time
    let sumPower: number = this.data.slice(0,this.data.length-1).reduce((ty, d) => ty + d.power, 0);
    if (sumPower > maxPower)
      maxPower = sumPower;

    let maxHistoric: number = 0;
    for (let i: number = 0; i < this.historicData.length; i++) maxHistoric = Math.max(maxHistoric, this.historicData.item(i).max);
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
    for (let si: number = this.historicData.length - 1; si >= 0; si--) {
      
      let hd = this.historicData.item(si);
      let x: number = si + (this.POINTS - this.historicData.length);
      let a: string = "," + (0.15 + 0.7 * (si + (this.POINTS - this.historicData.length)) / this.POINTS).toFixed(3) + ")";
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
