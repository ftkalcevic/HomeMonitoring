import { Component, Inject, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-live-data',
  templateUrl: './live-data.component.html'
})
export class LiveDataComponent {
  @ViewChild('indicatorCanvas') canvasRef: ElementRef;
  public power: LivePower;
  private baseUrl: string;
  private http: HttpClient;
  private maxPower: number = 3500;

  constructor(http: HttpClient, @Inject('BASE_URL') baseUrl: string) {
    this.baseUrl = baseUrl;
    this.http = http;
    setInterval(() => this.ReadData(), 1000);
  }

  public ReadData() {
    this.http.get<LivePower>(this.baseUrl + 'api/Envoy/LiveData').subscribe(result => {
      this.power = result;
      if (Math.abs(result.wattsConsumed) > this.maxPower)
        this.maxPower = Math.abs(result.wattsConsumed);
      if (Math.abs(result.wattsProduced) > this.maxPower)
        this.maxPower = Math.abs(result.wattsProduced);
      this.redrawSpeedo();
    }, error => console.error(error));
  }

  private redrawSpeedo() {
    let ctx: CanvasRenderingContext2D = this.canvasRef.nativeElement.getContext('2d');

    // Clear any previous content.
    let width: number = this.canvasRef.nativeElement.width;
    let height: number = this.canvasRef.nativeElement.height;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    ctx.translate(width / 2, height);
    ctx.scale((width / 2) / 1000, -height / 1000);

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
    a = Math.PI/2 - Math.PI / 2 * this.power.wattsProduced / this.maxPower;
    ctx.strokeStyle = "rgba(41, 155, 251, 0.3)";
    ctx.fillStyle = "rgba(41, 155, 251, 0.3)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 940);
    ctx.ellipse(0, 0, 940, 940, 0, Math.PI / 2, a, true);
    ctx.fill();

    // Consumption
    a = Math.PI / 2 + Math.PI / 2 * this.power.wattsConsumed / this.maxPower;
    ctx.strokeStyle = "rgba(244,115,32,0.3)";
    ctx.fillStyle = "rgba(244,115,32,0.3)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 940);
    ctx.ellipse(0, 0, 940, 940, 0, Math.PI / 2, a, false);
    ctx.fill();

    // Net
    a = Math.PI/2 + Math.PI / 2 * this.power.wattsNet / this.maxPower;
    x = 940 * Math.cos(a);
    y = 940 * Math.sin(a);
    let anticlockwise: boolean;
    if (this.power.wattsNet < 0) {  // production
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

    // details
    x = width / 2 - 80; y = height - 90;
    //x = width - 5 - 160; y = 5;

    ctx.restore();

    ctx.strokeStyle = "black";
    ctx.lineWidth = 4;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(x, y, 160, 88);
    ctx.strokeRect(x, y, 160, 88);

    ctx.font = "20px san serif";
    ctx.fillStyle = "black";
    ctx.textAlign = "left";
    ctx.fillText("Produced:", x+10, y + 25);
    ctx.fillText("Consumed:", x+10, y+50);
    ctx.fillText("Net:", x+10, y+75);

    ctx.textAlign = "right";
    ctx.fillText(this.power.wattsProduced.toFixed(0), x + 140, y+25);
    ctx.fillText(this.power.wattsConsumed.toFixed(0), x + 140, y+50);
    ctx.fillText(this.power.wattsNet.toFixed(0), x + 140, y+75);

    ctx.restore();
  }
}

interface LivePower {
  timestamp: Date;
  wattsProduced: number;
  wattsConsumed: number;
  wattsNet: number;
};

