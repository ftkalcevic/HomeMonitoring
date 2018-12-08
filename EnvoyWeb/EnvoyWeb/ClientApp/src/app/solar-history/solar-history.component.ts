import { Component, ElementRef, ViewChild, AfterViewInit, OnInit, SimpleChanges } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LiveDataService, CircularBuffer, LivePower, ISonoffDailyData, ISonoffSummaryData, ISonoffHoursData, ISonoffDaysData } from '../live-data-service/live-data-service';
import { GradientStep, Gradient } from "../../data/gradient";
import * as SunCalc from "suncalc";
import { mat4, vec3 } from "gl-matrix";
import * as common from '../../data/common';

@Component({
  selector: 'app-solar-history',
  templateUrl: './solar-history.component.html'
})
export class SolarHistoryComponent {
  @ViewChild('chartCanvas') canvasRef: ElementRef;
  longitude: number = 145.000516 - 360;
  latitude: number = -37.886778;
  subs: any[] = [];
  date: Date;
  enphaseData: IEnphaseData [];

  constructor(private liveDataService: LiveDataService, private route: ActivatedRoute, private datePipe: DatePipe) {
    this.subs.push(this.liveDataService.getEnphaseSystem().subscribe(result => { this.processEnphaseSystem(result); }));
    let now: Date = new Date();
    //now.setDate(now.getDate() - 1);
    this.date = new Date(now.getFullYear(), now.getMonth(), now.getDate()-2,0,0,0);
    this.enphaseData = null;
  }

  processEnphaseSystem(systemId: number) {
    this.subs.push(
      this.liveDataService.getEnphaseDayData(systemId,this.date).subscribe(result=>{this.processDayData(result);})
    );
  }

  processDayData(result: IEnphaseData[]){
    this.enphaseData = result;
    this.redrawChart();
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    for (let s of this.subs)
      s.unsubscribe();
  }

  ngAfterViewInit() {
    this.canvasRef.nativeElement.width = this.canvasRef.nativeElement.offsetWidth;
    this.canvasRef.nativeElement.height = this.canvasRef.nativeElement.offsetHeight;
  }

  redrawChart(): void {

  
    let data: any = [];

    //let now: Date = new Date();
    let times: any = SunCalc.getTimes(new Date(), this.latitude, this.longitude);

    let start: number = times.sunrise.getHours() + times.sunrise.getMinutes() / 60;
    let end: number = times.sunset.getHours() + times.sunset.getMinutes() / 60;
    for (let i: number = 0; i < 24*4; i++) {

      let power: number = 0;
      const t: number = start + (end - start) * i/(24*4);
      const time: Date = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate(),Math.floor(t), (t % 1)*60,0,0);
      var sunPos = SunCalc.getPosition(time, this.latitude, this.longitude);

      //console.info(time.toString() + " " + (sunPos.altitude / Math.PI * 180).toFixed(2) + " " + (sunPos.azimuth / Math.PI * 180).toFixed(2));

//let altitude: number = 0;
//let azimuth: number = 0;

      //let ps: any = [0,0];
      let sunAltitude: number = sunPos.altitude / Math.PI * 180;
      let sunAzimuth: number = this.MakePlusMinus180(180 + sunPos.azimuth / Math.PI * 180);  // 0 north

      let vecToSun: any = vec3.fromValues(0, 1, 0);
      vec3.rotateZ(vecToSun, vecToSun, [0, 0, 0], -1 * Math.PI * sunAzimuth / 180);
      vec3.rotateX(vecToSun, vecToSun, [0, 0, 0], 1 * Math.PI * sunAltitude / 180);

      for (let a: number = 1; a < this.liveDataService.panelInfo.arrays.length; a++) {

        let arr = this.liveDataService.panelInfo.arrays[a];

        let panelAltitude: number = arr.altitude;
        let panelAzimuth: number = this.MakePlusMinus180(arr.azimuth);

        //altitude = sunAltitude + panelAltitude;
        ////altitude = 90;
        //azimuth = sunAzimuth - panelAzimuth;
        //while (azimuth < 0) {
        //  azimuth += 360;
        //}
        //azimuth = this.MakePlusMinus180(azimuth);

        let panelWidth: number = arr.panel_size.width;
        let panelLength: number = arr.panel_size.length;
        let panelArea: number = panelWidth * panelLength;

        let vecPanelNormal: any = vec3.fromValues(0, 0, 1);
        vec3.rotateX(vecPanelNormal, vecPanelNormal, [0, 0, 0], -1 * Math.PI * panelAltitude / 180);
        vec3.rotateZ(vecPanelNormal, vecPanelNormal, [0, 0, 0], -1 * Math.PI * panelAzimuth / 180);

        const angle: number = vec3.angle(vecToSun, vecPanelNormal);
        console.log("t=" + time.toString() + " a=" + (angle * 180 / Math.PI).toString());
        //ps[a] = angle*180/Math.PI;
    //    if (angle > Math.PI / 2 || angle < -Math.PI / 2)
    //      continue;

        //let presentedWidth: number = panelWidth * Math.sin(azimuth / 180 * Math.PI);
        //let presentedLength: number = panelLength * Math.sin(altitude / 180 * Math.PI);
        //let presentedArea: number = presentedWidth * presentedLength;

        //let expectedPower: number = Math.abs(arr.power * presentedArea / panelArea) * arr.modules.length;

        let transform: any = mat4.create();
        //altitude = 90;
        mat4.rotateX(transform, transform, -1 * Math.PI * sunAltitude / 180);
        mat4.rotateZ(transform, transform, 1 * Math.PI * sunAzimuth / 180);
        mat4.rotateZ(transform, transform, -1 * Math.PI * panelAzimuth / 180);
        mat4.rotateX(transform, transform, -1 * Math.PI * panelAltitude / 180);


        let p1: any = vec3.fromValues(0, 0, 0);
        let p2: any = vec3.fromValues(panelWidth, 0, 0);
        let p3: any = vec3.fromValues(panelWidth, -panelLength, 0);
        let p4: any = vec3.fromValues(0, -panelLength, 0);

        vec3.transformMat4(p1, p1, transform);
        vec3.transformMat4(p2, p2, transform);
        vec3.transformMat4(p3, p3, transform);
        vec3.transformMat4(p4, p4, transform);

        const x1: number = p1[0]; const y1: number = p1[2];
        const x2: number = p2[0]; const y2: number = p2[2];
        const x3: number = p3[0]; const y3: number = p3[2];
        const x4: number = p4[0]; const y4: number = p4[2];
        
        let presentedArea: number = 0.5*Math.abs( x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2) ) +
                                    0.5*Math.abs( x1 * (y4 - y3) + x4 * (y3 - y1) + x3 * (y1 - y4) );
        let expectedPower: number = Math.abs(arr.power * presentedArea / panelArea) * arr.modules.length;

        //console.info("" + a + "," + sunAzimuth + "," + sunAltitude);
        //azimuth = sunAzimuth;
        power += expectedPower;
        power = angle * 400;
        //ps[a] = expectedPower/10;
        break;
      }
      data.push({ time: t, power: power });
    }
    let ctx: CanvasRenderingContext2D = this.canvasRef.nativeElement.getContext('2d');
    ctx.save();

    let width: number = this.canvasRef.nativeElement.width;
    let height: number = this.canvasRef.nativeElement.height;

    let scaleX: number = 0.9 * (width / (24 * 4));
    let scaleY: number = 0.9 * (height / (common.maxProduction/4 * 2));

    ctx.clearRect(0, 0, width, height);
    ctx.translate(0, height / 2);

    let t: number;
    ctx.strokeStyle = "blue";
    ctx.fillStyle = "lightblue";
    for (t = 0; t < 24 * 4; t++) {
      ctx.fillRect(t * scaleX, 0, 1 * scaleX, -this.enphaseData[t].whProduced * scaleY);
    }
    ctx.strokeStyle = "orange";
    ctx.fillStyle = "orange";
    for (t = 0; t < 24 * 4; t++) {
      ctx.fillRect(t * scaleX, 0, 1 * scaleX, this.enphaseData[t].whConsumed * scaleY);
    }

    ctx.lineWidth = 2;
    ctx.strokeStyle = "red"
    ctx.beginPath();
    ctx.moveTo(scaleX * (data[0].time)*4, -scaleY*data[0].power / 4);
    for (let i: number = 1; i < data.length; i++ ) {
      ctx.lineTo(scaleX * (data[i].time)*4, -scaleY*data[i].power / 4);
    }
    ctx.stroke();

    //ctx.strokeStyle = "red"
    //ctx.beginPath();
    //ctx.moveTo(200 + 0, data[0].sunAltitude);
    //for (let i: number = 1; i < data.length; i++) {
    //  ctx.lineTo(200 + i * 5, data[i].sunAltitude);
    //}
    //ctx.stroke();

    //ctx.strokeStyle = "red"
    //ctx.beginPath();
    //ctx.moveTo(200 + 0, data[0].sunAzimuth);
    //for (let i: number = 1; i < data.length; i++) {
    //  ctx.lineTo(200 + i * 5, data[i].sunAzimuth);
    //}
    //ctx.stroke();


    //ctx.strokeStyle = "blue"
    //ctx.beginPath();
    //ctx.moveTo(200 + 0, data[0].altitude);
    //for (let i: number = 1; i < data.length; i++) {
    //  ctx.lineTo(200 + i * 5, data[i].altitude);
    //}
    //ctx.stroke();

    //ctx.strokeStyle = "blue"
    //ctx.beginPath();
    //ctx.moveTo(200 + 0, data[0].azimuth);
    //for (let i: number = 1; i < data.length; i++) {
    //  ctx.lineTo(200 + i * 5, data[i].azimuth);
    //}
    //ctx.stroke();

    //ctx.strokeStyle = "gray"
    //ctx.beginPath();
    //ctx.moveTo(200 + 0, 90);
    //ctx.lineTo(200 + 48 * 5, 90);
    //ctx.stroke();

    //ctx.strokeStyle = "lightgray"
    //ctx.beginPath();
    //ctx.moveTo(200 + 0, 180);
    //ctx.lineTo(200 + 48 * 5, 180);
    //ctx.stroke();

    //ctx.strokeStyle = "gray"
    //ctx.beginPath();
    //ctx.moveTo(200 + 0, 270);
    //ctx.lineTo(200 + 48 * 5, 270);
    //ctx.stroke();

    ctx.strokeStyle = "gray"
    ctx.beginPath();
    ctx.moveTo(0, -scaleY*400*Math.PI/2/4);
    ctx.lineTo(1200, -scaleY *400 * Math.PI/2/4);
    ctx.stroke();

    ctx.restore();
  }
  
  MakePlusMinus180(n: number): number {
    while (n < -180)
      n += 360;
    while (n > 180)
      n -= 360;
    return n;
  }
}

