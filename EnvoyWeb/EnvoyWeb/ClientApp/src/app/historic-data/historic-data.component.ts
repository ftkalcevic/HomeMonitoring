import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { LiveDataService, CircularBuffer, LivePower } from '../live-data-service/live-data-service';

@Component({
  selector: 'app-historic-data',
  templateUrl: './historic-data.component.html'
})
export class HistoricDataComponent {
  @ViewChild('historyCanvas') canvasRef: ElementRef;
  private maxPower: number = 3500;
  private maxProduction: number = 270 * 12;

  constructor(private liveDataService: LiveDataService) {
    this.liveDataService.envoyData.subscribe(result => { this.newSample(result); })
  }

  ngAfterViewInit() {
    this.canvasRef.nativeElement.width = this.canvasRef.nativeElement.offsetWidth;
    this.canvasRef.nativeElement.height = this.canvasRef.nativeElement.offsetHeight;
    this.newSample(null);
  }

  public newSample(power: LivePower) {

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

    const POINTS: number = this.liveDataService.envoyLive.data.size;
    const data: CircularBuffer<LivePower> = this.liveDataService.envoyLive.data;

    // production
    ctx.fillStyle = "rgba(41, 155, 251, 0.3)";
    ctx.beginPath();
    ctx.moveTo(995, 0);

    let x: number, y: number;
    for (let i = this.liveDataService.envoyLive.data.length - 1; i > 0; i--) {
      x = 5 + (i + POINTS-this.liveDataService.envoyLive.data.length)/POINTS * (1000-10);
      y = data.item(i).wattsProduced;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(x, 0);
    ctx.fill();

    // production net
    ctx.fillStyle = "rgba(41, 155, 251, 0.8)";
    ctx.beginPath();
    ctx.moveTo(995, 0);
    for (let i = this.liveDataService.envoyLive.data.length - 1; i > 0; i--) {
      x = 5 + (i + POINTS-this.liveDataService.envoyLive.data.length)/POINTS * (1000-10);
      y = Math.abs(data.item(i).wattsNet < 0 ? data.item(i).wattsNet : 0);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(x, 0);
    ctx.fill();
    
    // consumption
    ctx.fillStyle = "rgba(244,115,32,0.3)";
    ctx.beginPath();
    ctx.moveTo(995, 0);
    for (let i = this.liveDataService.envoyLive.data.length - 1; i > 0; i--) {
      x = 5 + (i + POINTS-this.liveDataService.envoyLive.data.length)/POINTS * (1000-10);
      y = -data.item(i).wattsConsumed;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(x, 0);
    ctx.fill();

    // consumption net
    ctx.fillStyle = "rgba(244,115,32,0.8)";
    ctx.beginPath();
    ctx.moveTo(995, 0);
    for (let i = this.liveDataService.envoyLive.data.length - 1; i > 0; i--) {
      x = 5 + (i + POINTS - this.liveDataService.envoyLive.data.length) / POINTS * (1000 - 10);
      y = -Math.abs(data.item(i).wattsNet > 0 ? data.item(i).wattsNet : 0);
      ctx.lineTo(x, y);
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
