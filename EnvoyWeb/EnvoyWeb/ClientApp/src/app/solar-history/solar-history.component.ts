import { Component, ElementRef, ViewChild, AfterViewInit, OnInit, SimpleChanges } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LiveDataService, CircularBuffer, LivePower, ISonoffDailyData, ISonoffSummaryData, ISonoffHoursData, ISonoffDaysData } from '../live-data-service/live-data-service';
import { GradientStep, Gradient } from "../../data/gradient";
import * as SunCalc from "suncalc";
import { mat4, vec3 } from "gl-matrix";
import * as common from '../../data/common';
import { ExpectedConditions } from 'protractor';

@Component({
  selector: 'app-solar-history',
  templateUrl: './solar-history.component.html'
})
export class SolarHistoryComponent implements OnInit {
  @ViewChild('chartCanvas') canvasRef: ElementRef;
  longitude: number = 145.000516 - 360;
  latitude: number = -37.886778;
  subs: any[] = [];
  date: Date;
  enphaseData: IEnphaseData [];
  dateTimePickerSettings = {
    bigBanner: true,
    timePicker: false,
    format: 'dd-MM-yyyy',
    defaultOpen: false
  }
  constructor(private liveDataService: LiveDataService, private route: ActivatedRoute, private datePipe: DatePipe) {
    this.subs.push(this.liveDataService.getEnphaseSystem().subscribe(result => { this.processEnphaseSystem(result); }));
    let now: Date = new Date();
    this.date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    //this.date = new Date(2019, 1, 1,0,0,0);
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

  CalculatePredictedSolar(): any {
    // Predict the solar output based on panel orientation, position of the sun, and calculated irradiance.

    // todo: if don't have data, or day has changed...

    let predictedData: any = [];

    let predictDate: Date = new Date(this.date);
    let times: any = SunCalc.getTimes(predictDate, this.latitude, this.longitude);

    let start: number = times.sunrise.getHours() + times.sunrise.getMinutes() / 60;
    let end: number = times.sunset.getHours() + times.sunset.getMinutes() / 60;
    for (let i: number = 0; i < 24 * 4; i++) {

      let power: number = 0;
      const t: number = start + (end - start) * i / (24 * 4);
      const time: Date = new Date(predictDate.getFullYear(), predictDate.getMonth(), predictDate.getDate(), Math.floor(t), (t % 1) * 60, 0, 0);
      var sunPos = SunCalc.getPosition(time, this.latitude, this.longitude);

      let sunAltitude: number = sunPos.altitude / Math.PI * 180;
      if (sunAltitude < 0)
        sunAltitude = 0;
      let sunAzimuth: number = this.MakePlusMinus180(180 + sunPos.azimuth / Math.PI * 180);  // 0 north

      let vecToSun: any = vec3.fromValues(0, 1, 0);
      vec3.rotateZ(vecToSun, vecToSun, [0, 0, 0], -1 * Math.PI * sunAzimuth / 180);
      vec3.rotateX(vecToSun, vecToSun, [0, 0, 0], 1 * Math.PI * sunAltitude / 180);

      // https://www.pveducation.org/pvcdrom/properties-of-sunlight/calculation-of-solar-insolation
      let airMass: number = 1.0 / Math.cos((90 - sunAltitude) / 180.0 * Math.PI);
      let irradiance: number = 1.353 * Math.pow(0.7, Math.pow(airMass, 0.678));

      power = 0;
      for (let a: number = 0; a < this.liveDataService.panelInfo.arrays.length; a++) {

        let arr = this.liveDataService.panelInfo.arrays[a];

        let panelAltitude: number = arr.altitude;
        let panelAzimuth: number = this.MakePlusMinus180(arr.azimuth);

        let panelWidth: number = arr.panel_size.width;
        let panelLength: number = arr.panel_size.length;
        let panelArea: number = panelWidth * panelLength;

        let vecPanelNormal: any = vec3.fromValues(0, 0, 1);
        vec3.rotateX(vecPanelNormal, vecPanelNormal, [0, 0, 0], -1 * Math.PI * panelAltitude / 180);
        vec3.rotateZ(vecPanelNormal, vecPanelNormal, [0, 0, 0], -1 * Math.PI * panelAzimuth / 180);

        const angle: number = vec3.angle(vecToSun, vecPanelNormal);

        if (!(angle > Math.PI / 2 || angle < -Math.PI / 2)) {

          let transform: any = mat4.create();
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

          let presentedArea: number = 0.5 * Math.abs(x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)) +
            0.5 * Math.abs(x1 * (y4 - y3) + x4 * (y3 - y1) + x3 * (y1 - y4));
          let expectedPower: number = Math.abs(arr.power * presentedArea / panelArea) * arr.modules.length;
          expectedPower *= irradiance;

          power += expectedPower;
        }
      }
      predictedData.push({ time: t, power: power });
    }
    return predictedData;
  }

  redrawChart(): void {

    let predicetedSolar: any = this.CalculatePredictedSolar();

    let ctx: CanvasRenderingContext2D = this.canvasRef.nativeElement.getContext('2d');
    ctx.save();

    let width: number = this.canvasRef.nativeElement.width;
    let height: number = this.canvasRef.nativeElement.height;

    let scaleX: number = 0.9 * (width / (24 * 4));
    let scaleY: number = 0.9 * (height / (common.maxProduction / 4 * 2));

    ctx.clearRect(0, 0, width, height);
    ctx.translate(0, height / 2);



    let t: number;
    ctx.strokeStyle = "rgba(41, 155, 251, 0.3)";
    ctx.fillStyle = "rgba(41, 155, 251, 0.3)";
    for (t = 0; t < 24 * 4; t++) {
      ctx.fillRect(t * scaleX, 0, 1 * scaleX, -this.enphaseData[t].whProduced * scaleY);
    }
    ctx.strokeStyle = "rgba(244,115,32,0.3)";
    ctx.fillStyle = "rgba(244,115,32,0.3)";
    for (t = 0; t < 24 * 4; t++) {
      ctx.fillRect(t * scaleX, 0, 1 * scaleX, this.enphaseData[t].whConsumed * scaleY);
    }
    for (t = 0; t < 24 * 4; t++) {
      let net: number = this.enphaseData[t].whProduced - this.enphaseData[t].whConsumed;
      if (net < 0) {
        ctx.strokeStyle = "rgba(244,115,32,0.8)";
        ctx.fillStyle = "rgba(244,115,32,0.8)";
      }
      else {
        ctx.strokeStyle = "rgba(41, 155, 251, 0.8)";
        ctx.fillStyle = "rgba(41, 155, 251, 0.8)";
      }

      ctx.fillRect(t * scaleX, 0, 1 * scaleX, -net * scaleY);
    }

    ctx.lineWidth = 2;
    ctx.strokeStyle = "red"
    ctx.beginPath();
    ctx.moveTo(scaleX * (predicetedSolar[0].time) * 4, -scaleY * predicetedSolar[0].power / 4);
    for (let i: number = 1; i < predicetedSolar.length; i++) {
      ctx.lineTo(scaleX * (predicetedSolar[i].time) * 4, -scaleY * predicetedSolar[i].power / 4);
    }
    ctx.stroke();

    ctx.strokeStyle = "black"
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1200, 0);
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

