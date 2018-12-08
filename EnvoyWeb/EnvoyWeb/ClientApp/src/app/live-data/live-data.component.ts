import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { LiveDataService, LivePower } from '../live-data-service/live-data-service';
import { PriceBreak } from '../../data/energy-plans';
import { Router } from "@angular/router";
import * as common from '../../data/common';

@Component({
  selector: 'app-live-data',
  templateUrl: './live-data.component.html'
})
export class LiveDataComponent {
  @ViewChild('indicatorCanvas') canvasRef: ElementRef;
  private maxPower: number = common.maxProduction * 1.1;
  subs: any[] = [];

  constructor(private liveDataService: LiveDataService, private router: Router) {
    this.subs.push(this.liveDataService.envoyData.subscribe(result => { this.redrawSpeedo(result); }));
    this.subs.push(this.liveDataService.getEnphaseSystem().subscribe(result => { this.processEnphaseSystem(result); }));
  }

  processEnphaseSystem(systemId: number) {
  }

  ngOnDestroy() {
    for (let s of this.subs)
      s.unsubscribe();
  }

  ngAfterViewInit() {
    this.canvasRef.nativeElement.width = this.canvasRef.nativeElement.offsetWidth;
    this.canvasRef.nativeElement.height = this.canvasRef.nativeElement.offsetHeight;

    //if (this.liveDataService.envoyLive.data.length > 0) {
    //  this.redrawSpeedo(this.liveDataService.envoyLive.data.item(this.liveDataService.envoyLive.data.length-1));
    //}
  }

  public redrawSpeedo(power: LivePower) {
    if (Math.abs(power.wattsConsumed) > this.maxPower)
      this.maxPower = Math.abs(power.wattsConsumed);
    if (Math.abs(power.wattsProduced) > this.maxPower)
      this.maxPower = Math.abs(power.wattsProduced);

    let now: Date = new Date(power.timestamp);
    let time: number = now.getHours() + now.getMinutes() / 60;
    let price: PriceBreak = this.liveDataService.energyPlans.findTariff(this.liveDataService.energyPlan, now, time, false);
    let rate: number = 0;

    if (power.wattsNet > 0 )
      rate = -(power.wattsNet) / 1000.0 * price.Rate * (1 - this.liveDataService.energyPlan.EnergyDiscount) * 1.1;
    else
      rate = -(power.wattsNet) / 1000.0 * this.liveDataService.energyPlan.FiT;

    let ctx: CanvasRenderingContext2D = this.canvasRef.nativeElement.getContext('2d');

    // Clear any previous content.
    let width: number = this.canvasRef.nativeElement.width;
    let height: number = this.canvasRef.nativeElement.height;

    ctx.save(); 
    ctx.clearRect(0, 0, width, height);

    let size: number = width/2 > height ? height : width/2;
    ctx.translate(width / 2, height*0.95);
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
    a = Math.PI / 2 - Math.PI / 2 * common.maxProduction / this.maxPower;
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
    if (true) {
      const fontHeight: number = 40;
      const lineSpacing: number = 50;
      const y0: number = 1000 + (height - size) * 1000 / size;

      a = Math.PI / 2 * power.wattsNet / this.maxPower;
      //a = 75 / 180 * Math.PI;
      if (Math.abs(a) > Math.PI * 75 / 180)
        a = Math.sign(a) * Math.PI * 75 / 180;
      a = Math.PI / 2 + a;

      x = 540 * Math.cos(a);
      y = y0 - 540 * Math.sin(a);

      //x = width / 2 - 80; y = height - 90;
      //x = width - 5 - 160; y = 5;

      x -= 150;
      y -= 100;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(width / 2, 0);
      ctx.scale(size / 1000, size / 1000); 

      ctx.strokeStyle = "black";
      ctx.lineWidth = 4;
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillRect(x, y-20, 370, 210);
      ctx.strokeRect(x, y-20, 370, 210);

      ctx.font = fontHeight+"px san serif";
      ctx.fillStyle = "black";
      ctx.textAlign = "left";
      ctx.fillText("Produced:", x + 10, y + 25 + 0 * lineSpacing);
      ctx.fillText("Consumed:", x + 10, y + 25 + 1 * lineSpacing);
      ctx.fillText("Net:", x + 10, y + 25 + 2 * lineSpacing);
      ctx.fillText("Rate:", x + 10, y + 25 + 3 * lineSpacing);

      ctx.textAlign = "right";
      ctx.fillText(power.wattsProduced.toFixed(0) + "W", x + 350, y + 25 + 0*lineSpacing);
      ctx.fillText(power.wattsConsumed.toFixed(0) + "W", x + 350, y + 25 + 1*lineSpacing);
      ctx.fillText((-power.wattsNet).toFixed(0)+"W", x + 350, y + 25 + 2*lineSpacing);
      ctx.fillText((rate < 0 ? "-" : "") + "$" + Math.abs(rate).toFixed(2) + "/h", x + 350, y + 25 + 3 * lineSpacing);
    }
    //ctx.fillText("width "+screen.width.toString()+"px", 0, 50);
    //ctx.fillText("height "+screen.height.toString()+"px", 0, 150);
    ctx.restore();
  }

  onClick() {
    this.router.navigate(["/live-power2"]);
  }
}
