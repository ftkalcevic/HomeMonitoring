import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { LiveDataService } from '../live-data-service/live-data-service';
import * as common from '../../data/common';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MY_FORMATS } from '../solar-history/solar-history.component';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import * as HomeSensorNet from '../../data/home-sensor-net';

@Component({
  selector: 'app-garden-tanks',
  templateUrl: './garden-tanks.component.html',
  providers: [
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
  ]
})
export class GardenTanksComponent implements OnDestroy {
  @ViewChild('tankWatererCanvas') canvasRef: ElementRef;

  subs: any[] = [];
  public tanks: HomeSensorNet.Tank[];
  public displayType: string = "week";
  public selectedTank: string;
  public date: Date;
  public firstDate: Date = new Date(2020, 1, 13);


  constructor(private liveDataService: LiveDataService, private route: ActivatedRoute) {
    this.tanks = liveDataService.tanks;
    this.selectedTank = this.tanks[0].deviceId;
    let now: Date = new Date();
    this.date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    //this.date = new Date(2020, 1, 13, 0, 0, 0);
    this.RequestReadTankWaterer();
  }

  ngOnDestroy() {
    for (let s of this.subs)
      s.unsubscribe();
  }

  ngAfterViewInit() {
    this.canvasRef.nativeElement.width = this.canvasRef.nativeElement.offsetWidth;
    this.canvasRef.nativeElement.height = this.canvasRef.nativeElement.offsetHeight;
  }

  RequestReadTankWaterer() {
    this.subs.push(this.liveDataService.ReadTankWater(this.selectedTank, this.displayType == "week", this.date).subscribe(result => { this.draw(result); }));
  }

  dateChange(evt: Date) {
    let d: Date = new Date(evt);
    this.date = d;
    this.RequestReadTankWaterer();
  }

  public incrementDate() {
    let d: Date;
    if (this.displayType == "week")
      d = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate() + 7);
    else
      d = new Date(this.date.getFullYear(), this.date.getMonth()+1, 1 );
    if (d.getTime() > Date.now())
      d = new Date(Date.now());
    this.date = d;
    this.RequestReadTankWaterer();
  }

  public decrementDate() {
    let d: Date;
    if (this.displayType == "week")
      d = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate() - 7);
    else
      d = new Date(this.date.getFullYear(), this.date.getMonth() - 1, 1);
    if (d.getTime() < this.firstDate.getTime())
      d = this.firstDate;
    this.date = d;
    this.RequestReadTankWaterer();
  }

  public displayTypeChanged(newType: string) {
    this.displayType = newType;
    this.RequestReadTankWaterer();
    }

  draw(data: HomeSensorNet.ITankWaterer[]) {

    let ctx: CanvasRenderingContext2D = this.canvasRef.nativeElement.getContext('2d');
    ctx.save();

    let width: number = this.canvasRef.nativeElement.width;
    let height: number = this.canvasRef.nativeElement.height;

    ctx.fillStyle = "rgb(240,240,240)";
    ctx.fillRect(0, 0, width, height);

    if (data.length == 0) {
      ctx.restore();
      return;
    }

    let minMoisture: number, maxMoisture: number;
    let minVolume: number, maxVolume: number;
    let minTemperature: number, maxTemperature: number;
    let minLitres: number, maxLitres: number;
    let flowData: any[] = [];

    minMoisture = Math.min(data[0].moisture1, data[0].moisture2);
    maxMoisture = Math.max(data[0].moisture1, data[0].moisture2);
    minVolume = 0; maxVolume = 100;
    minTemperature = 0; maxTemperature = 50;
    minLitres = 0; maxLitres = 500;

    // Collect data.
    // Bar charts for water dispensed each day, manual + overflow, date
    // Raw data for moisture 1, moisture 2, tank volume, temperature, timestamp - this is just what the query gives us.
    let lastDay: number = data[0].timestamp.getDate();
    let flow: number = data[0].tankFlow;
    let overflow: number = data[0].tankOverflow;
    let lastFlow: number = flow;
    let lastOverflow = overflow;
    for (let d of data) {
      // find min/max
      if (d.moisture1 < minMoisture) minMoisture = d.moisture1;
      if (d.moisture2 < minMoisture) minMoisture = d.moisture2;
      if (d.moisture1 > maxMoisture) maxMoisture = d.moisture1;
      if (d.moisture2 > maxMoisture) maxMoisture = d.moisture2;
      if (d.tankVolume < minVolume) minVolume = d.tankVolume;
      if (d.tankVolume > maxVolume) maxVolume = d.tankVolume;
      if (d.temperature < minTemperature) minTemperature = d.temperature;
      if (d.temperature > maxTemperature) maxTemperature = d.temperature;

      // Sum the flow for the day. (endtime.flow - starttime.flow)
      if (lastDay != d.timestamp.getDate()) {
        let dayFlow: number = lastFlow - flow;
        let dayOverflow: number = lastOverflow - overflow;
        flowData[lastDay] = { flow: dayFlow, overflow: dayOverflow };
        lastDay = d.timestamp.getDate();
        flow = d.tankFlow;
        overflow = d.tankOverflow;
        if ((dayFlow + dayOverflow) > maxLitres) maxLitres = (dayFlow + dayOverflow);
      }
      lastFlow = d.tankFlow;
      lastOverflow = d.tankOverflow;
    }
    let dayFlow: number = lastFlow - flow;
    let dayOverflow: number = lastOverflow - overflow;
    flowData[lastDay] = { flow: dayFlow, overflow: dayOverflow };
    if ((dayFlow + dayOverflow) > maxLitres) maxLitres = (dayFlow + dayOverflow);
    

    // Get start/end dates
    let dateStart: Date;
    let dateEnd: Date;
    let days: number;
    if (this.displayType == "week") {

      // Sunday will be the start of the week
      let offset: number = this.date.getDay();
      dateStart = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate() - offset);
      dateEnd = new Date(dateStart.getFullYear(), dateStart.getMonth(), dateStart.getDate() + 7);
      days = 7;
    }
    else {
      dateStart = new Date(this.date.getFullYear(), this.date.getMonth(), 1);
      dateEnd = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 1);
      days = new Date(dateEnd.getFullYear(), dateEnd.getMonth(), 0).getDate();
    }

    // Draw Chart
    let scaleX: number = 0.9 * (width / (days));
    let scaleFlowY: number = 0.9 * (height / (maxLitres));
    let scaleMoistureY: number = 0.9 * (height / (maxMoisture));
    let scaleVolumeY: number = 0.9 * (height / (maxVolume));
    let scaleTemperatureY: number = 0.9 * (height / (maxTemperature));
    let offsetX: number = width * 0.1 / 2;
    let offsetY: number = height * 0.1 / 2;


    // Flow bar charts
    const flowColour: string = "CornflowerBlue";
    const overflowColour: string = "CadetBlue";
    const columnWidth: number = width * 0.9 / days;
    for (let i in flowData) {
      let day: number = Number(i) - dateStart.getDate();
      let f: any = flowData[Number(i)];
      if (f.flow > 0) {
        ctx.fillStyle = flowColour;
        ctx.fillRect(offsetX + day * columnWidth, -offsetY + height - f.flow * scaleFlowY, columnWidth, f.flow*scaleFlowY);
      }
      if (f.overflow > 0) {
        ctx.fillStyle = overflowColour;
        ctx.fillRect(offsetX + day * columnWidth, -offsetY + height - (f.overflow + f.flow) * scaleFlowY, columnWidth, f.overflow * scaleFlowY);
      }
    }

    // moisture1
    ctx.lineWidth = 2;
    ctx.strokeStyle = "green";
    ctx.beginPath();
    let first: boolean = true;
    for (let d of data) {
      let dt: number = (d.timestamp.getTime() - dateStart.getTime()) / (24 * 60 * 60 * 1000); // floating point days since startDate
      let ptX: number = offsetX + dt * scaleX;
      let ptY: number = height - offsetY - d.moisture1 * scaleMoistureY;
      if (first) {
        ctx.moveTo(ptX, ptY);
        first = false;
      }
      else
        ctx.lineTo(ptX,ptY);
    }
    ctx.stroke();

    // moisture2
    ctx.lineWidth = 2;
    ctx.strokeStyle = "YellowGreen";
    ctx.beginPath();
    first = true;
    for (let d of data) {
      let dt: number = (d.timestamp.getTime() - dateStart.getTime()) / (24 * 60 * 60 * 1000); // floating point days since startDate
      let ptX: number = offsetX + dt * scaleX;
      let ptY: number = height - offsetY - d.moisture2 * scaleMoistureY;
      if (first) {
        ctx.moveTo(ptX, ptY);
        first = false;
      }
      else
        ctx.lineTo(ptX, ptY);
    }
    ctx.stroke();

    // tank volume
    ctx.lineWidth = 2;
    ctx.strokeStyle = "Aqua";
    ctx.beginPath();
    first = true;
    for (let d of data) {
      let dt: number = (d.timestamp.getTime() - dateStart.getTime()) / (24 * 60 * 60 * 1000); // floating point days since startDate
      let ptX: number = offsetX + dt * scaleX;
      let ptY: number = height - offsetY - d.tankVolume * scaleVolumeY;
      if (first) {
        ctx.moveTo(ptX, ptY);
        first = false;
      }
      else
        ctx.lineTo(ptX, ptY);
    }
    ctx.stroke();

    // temperature
    ctx.lineWidth = 2;
    ctx.strokeStyle = "GoldenRod";
    ctx.beginPath();
    first = true;
    for (let d of data) {
      let dt: number = (d.timestamp.getTime() - dateStart.getTime()) / (24 * 60 * 60 * 1000); // floating point days since startDate
      let ptX: number = offsetX + dt * scaleX;
      let ptY: number = height - offsetY - d.temperature * scaleTemperatureY;
      if (first) {
        ctx.moveTo(ptX, ptY);
        first = false;
      }
      else
        ctx.lineTo(ptX, ptY);
    }
    ctx.stroke();


    ctx.restore();

  }
}
