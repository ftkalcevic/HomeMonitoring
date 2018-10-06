import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { LiveDataService } from '../live-data-service/live-data-service';

@Component({
  selector: 'app-historic-data',
  templateUrl: './historic-data.component.html'
})
export class HistoricDataComponent {
  @ViewChild('historyCanvas') canvasRef: ElementRef;
  private maxPower: number = 3500;
  public samples: ILivePower[];
  public first: number = 0;
  public last: number = 0;
  public POINTS: number;
  private maxProduction: number = 270 * 12;

  constructor(private liveDataService: LiveDataService) {
    this.liveDataService.envoyData.subscribe(result => { this.newSample(result); })
  }

  ngAfterViewInit() {
    this.canvasRef.nativeElement.width = this.canvasRef.nativeElement.offsetWidth;
    this.canvasRef.nativeElement.height = this.canvasRef.nativeElement.offsetHeight;
  }

  private AddSample(power: ILivePower) {
    this.samples[this.last] = power;
    this.last++;
    if (this.last >= this.POINTS)
      this.last = 0;
    if (this.first == this.last) {
      this.first++;
      if (this.first >= this.POINTS)
        this.first = 0;
    }
  }

  public newSample(power: ILivePower) {
    if (this.samples == null) {
      this.POINTS = this.canvasRef.nativeElement.width;
      this.samples = new Array(this.POINTS);
    }

    if (Math.abs(power.wattsConsumed) > this.maxPower)
      this.maxPower = Math.abs(power.wattsConsumed);
    if (Math.abs(power.wattsProduced) > this.maxPower)
      this.maxPower = Math.abs(power.wattsProduced);

    this.AddSample(power);

    let ctx: CanvasRenderingContext2D = this.canvasRef.nativeElement.getContext('2d');

    // Clear any previous content.
    let width: number = this.canvasRef.nativeElement.width;
    let height: number = this.canvasRef.nativeElement.height;
   
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    ctx.translate(0, height/2);
    ctx.scale(width/1000, -(height/2) / this.maxPower);

    // Grid
    ctx.strokeStyle = "#808080";
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(1000, 0);
    ctx.moveTo(5,-this.maxPower);
    ctx.lineTo(5,this.maxPower);

    let i: number;
    for (i = 0; i < this.maxPower; i += 1000) {
      ctx.moveTo(5, i);
      ctx.lineTo(15, i);
      ctx.moveTo(5, -i);
      ctx.lineTo(15, -i);
    }
    ctx.stroke();

    // production
    ctx.fillStyle = "rgba(41, 155, 251, 0.3)";
    ctx.beginPath();
    ctx.moveTo(5, 0);
    i = this.first;
    let x: number, y: number, j: number;
    for (j=0; ;j++) {
      if (i == this.last)
        break;
      x = 5 + j/this.POINTS * (1000-10);
      y = this.samples[i].wattsProduced;
      ctx.lineTo(x, y);
      i++;
      if (i == this.POINTS)
        i = 0;
    }
    ctx.lineTo(x, 0);
    ctx.fill();

    // production net
    ctx.fillStyle = "rgba(41, 155, 251, 0.8)";
    ctx.beginPath();
    ctx.moveTo(5, 0);
    i = this.first;
    for (j = 0; ; j++) {
      if (i == this.last)
        break;
      x = 5 + j / this.POINTS * (1000 - 10);
      y = Math.abs(this.samples[i].wattsNet < 0 ? this.samples[i].wattsNet : 0);
      ctx.lineTo(x, y);
      i++;
      if (i == this.POINTS)
        i = 0;
    }
    ctx.lineTo(x, 0);
    ctx.fill();

    // consumption
    ctx.fillStyle = "rgba(244,115,32,0.3)";
    ctx.beginPath();
    ctx.moveTo(5, 0);
    i = this.first;
    for (j = 0; ; j++) {
      if (i == this.last)
        break;
      x = 5 + j / this.POINTS * (1000 - 10);
      y = -this.samples[i].wattsConsumed;
      ctx.lineTo(x, y);
      i++;
      if (i == this.POINTS)
        i = 0;
    }
    ctx.lineTo(x, 0);
    ctx.fill();

    // consumption net
    ctx.fillStyle = "rgba(244,115,32,0.8)";
    ctx.beginPath();
    ctx.moveTo(5, 0);
    i = this.first;
    for (j = 0; ; j++) {
      if (i == this.last)
        break;
      x = 5 + j / this.POINTS * (1000 - 10);
      y = -Math.abs(this.samples[i].wattsNet > 0 ? this.samples[i].wattsNet : 0);
      ctx.lineTo(x, y);
      i++;
      if (i == this.POINTS)
        i = 0;
    }
    ctx.lineTo(x, 0);
    ctx.fill();


    ctx.strokeStyle = "red";
    ctx.setLineDash([15, 20]);
    ctx.beginPath();
    ctx.moveTo(5, this.maxProduction);
    ctx.lineTo(1000, this.maxProduction);
    ctx.stroke();

    ctx.restore();
  }
}
