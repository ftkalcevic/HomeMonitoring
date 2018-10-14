import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { LiveDataService, LivePower } from '../live-data-service/live-data-service';

@Component({
  selector: 'app-live-data',
  templateUrl: './live-data.component.html'
})
export class LiveDataComponent {
  @ViewChild('indicatorCanvas') canvasRef: ElementRef;
  private maxPower: number = 3500;
  private maxProduction: number = 270 * 12;

  constructor(private liveDataService: LiveDataService) {
    this.liveDataService.envoyData.subscribe(result => { this.redrawSpeedo(result); })
    this.liveDataService.getEnphaseSystem().subscribe(result => { this.processEnphaseSystem(result); })
  }

  processEnphaseSystem(systemId: number) {

    this.liveDataService.getEnphaseSummaryData(systemId).subscribe(result => { return; })
  }


  ngAfterViewInit() {
    this.canvasRef.nativeElement.width = this.canvasRef.nativeElement.offsetWidth;
    this.canvasRef.nativeElement.height = this.canvasRef.nativeElement.offsetHeight;

    if (this.liveDataService.envoyLive.data.length > 0) {
      this.redrawSpeedo(this.liveDataService.envoyLive.data.item(this.liveDataService.envoyLive.data.length-1));
    }
  }

  public redrawSpeedo(power: LivePower) {
    if (Math.abs(power.wattsConsumed) > this.maxPower)
      this.maxPower = Math.abs(power.wattsConsumed);
    if (Math.abs(power.wattsProduced) > this.maxPower)
      this.maxPower = Math.abs(power.wattsProduced);

    let ctx: CanvasRenderingContext2D = this.canvasRef.nativeElement.getContext('2d');

    // Clear any previous content.
    let width: number = this.canvasRef.nativeElement.width;
    let height: number = this.canvasRef.nativeElement.height;

    ctx.save(); 
    ctx.clearRect(0, 0, width, height);

    let size: number = width/2 > height ? height : width/2;
    ctx.translate(width / 2, height);
    ctx.scale(size / 1000, -size / 1000); 

    // Grid
    let i: number;
    ctx.beginPath();
    ctx.moveTo(990, 0)
    ctx.ellipse(0, 0, 990, 990, 0, 0, Math.PI, false);
    ctx.stroke();
    ctx.fillStyle = "#F0F0F0";
    ctx.beginPath();
    ctx.moveTo(990, 0)
    ctx.ellipse(0, 0, 990, 990, 0, 0, Math.PI, false);
    ctx.fill();

    ctx.strokeStyle = "black";
    for (i = 0; i < this.maxPower; i += 500) {
      let x1: number = 990 * Math.sin(Math.PI/2 * i / this.maxPower);
      let y1: number = 990 * Math.cos(Math.PI/2 * i / this.maxPower);
      let x2: number = 950 * Math.sin(Math.PI/2 * i / this.maxPower);
      let y2: number = 950 * Math.cos(Math.PI / 2 * i / this.maxPower);
      if ( (i % 1000) == 0 )
        ctx.lineWidth = 8;
      else
        ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.moveTo(-x1, y1);
      ctx.lineTo(-x2, y2);
      ctx.stroke();
      //debugger;
    }
    ctx.lineWidth = 1;

    let x: number, y: number, a:number;
    // Production
    a = Math.PI/2 - Math.PI / 2 * power.wattsProduced / this.maxPower;
    ctx.strokeStyle = "rgba(41, 155, 251, 0.3)";
    ctx.fillStyle = "rgba(41, 155, 251, 0.3)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 940);
    ctx.ellipse(0, 0, 940, 940, 0, Math.PI / 2, a, true);
    ctx.fill();

    // Consumption
    a = Math.PI / 2 + Math.PI / 2 * power.wattsConsumed / this.maxPower;
    ctx.strokeStyle = "rgba(244,115,32,0.3)";
    ctx.fillStyle = "rgba(244,115,32,0.3)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 940);
    ctx.ellipse(0, 0, 940, 940, 0, Math.PI / 2, a, false);
    ctx.fill();

    // Net
    a = Math.PI/2 + Math.PI / 2 * power.wattsNet / this.maxPower;
    x = 940 * Math.cos(a);
    y = 940 * Math.sin(a);
    let anticlockwise: boolean;
    if (power.wattsNet < 0) {  // production
      ctx.strokeStyle = "rgba(41, 155, 251, 0.8)";
      ctx.fillStyle = "rgba(41, 155, 251, 0.8)";
      anticlockwise = true;
    } else {
      ctx.strokeStyle = "rgba(244,115,32,0.8)";
      ctx.fillStyle = "rgba(244,115,32,0.8)";
      anticlockwise = false;
    }
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 940);
    ctx.ellipse(0, 0, 940, 940, 0, Math.PI / 2, a, anticlockwise);
    ctx.fill();

    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.lineWidth = 10;
    ctx.moveTo(0, 0);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Max production
    a = Math.PI / 2 - Math.PI / 2 * this.maxProduction / this.maxPower;
    x = 940 * Math.cos(a);
    y = 940 * Math.sin(a);
    ctx.strokeStyle = "red";
    ctx.setLineDash([15, 20]);
    ctx.beginPath();
    ctx.lineWidth = 5;
    ctx.moveTo(0, 0);
    ctx.lineTo(x, y);
    ctx.stroke();

    // details
    if (false) {
      x = width / 2 - 80; y = height - 90;
      //x = width - 5 - 160; y = 5;

      ctx.strokeStyle = "black";
      ctx.lineWidth = 4;
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillRect(x, y, 160, 88);
      ctx.strokeRect(x, y, 160, 88);

      ctx.font = "20px san serif";
      ctx.fillStyle = "black";
      ctx.textAlign = "left";
      ctx.fillText("Produced:", x + 10, y + 25);
      ctx.fillText("Consumed:", x + 10, y + 50);
      ctx.fillText("Net:", x + 10, y + 75);

      ctx.textAlign = "right";
      ctx.fillText(power.wattsProduced.toFixed(0), x + 140, y + 25);
      ctx.fillText(power.wattsConsumed.toFixed(0), x + 140, y + 50);
      ctx.fillText((power.wattsNet < 0 ? "+" : "-") + Math.abs(power.wattsNet).toFixed(0), x + 140, y + 75);
    }
    ctx.restore();
  }
}
