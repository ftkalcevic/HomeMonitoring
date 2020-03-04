import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { LiveDataService } from '../live-data-service/live-data-service';
import * as common from '../../data/common';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MY_FORMATS } from '../solar-history/solar-history.component';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import * as HomeSensorNet from '../../data/home-sensor-net';
import { ChartComponent, DataSeries, EAxisType, EChartType } from '../chart/chart.component';

@Component({
  selector: 'app-garden-tanks',
  templateUrl: './garden-tanks.component.html',
  providers: [
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
  ]
})
export class GardenTanksComponent implements OnDestroy {
  @ViewChild('chart') chart: ChartComponent;

  subs: any[] = [];
  public tanks: HomeSensorNet.Tank[];
  public displayType: string = "week";
  public selectedTank: string;
  public date: Date;
  public firstDate: Date = new Date(2020, 1, 13);
  public showFlow: boolean = true;
  public showVolume: boolean = true;
  public showMoisture: boolean = true;
  public showTemperature: boolean = true;

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

    // Get start/end dates
    let dayStart: number;
    let dayEnd: number;
    if (this.displayType == "week") {

      // Sunday will be the start of the week
      let offset: number = this.date.getDay();
      dayStart = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate() - offset).getTime()/(24*60*60*1000);
      dayEnd = dayStart + 7;
    }
    else {
      dayStart = new Date(this.date.getFullYear(), this.date.getMonth(), 1).getTime() / (24 * 60 * 60 * 1000);
      dayEnd = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 1).getTime() / (24 * 60 * 60 * 1000);
    }

    this.chart.clearDataSeries();
    let flowMax: number = 500;
    let activeAxis: EAxisType = EAxisType.primary;
    let activeAxisCount: number = 0;
    if (this.showFlow) {

      // Collect data.
      // Bar charts for water dispensed each day, manual + overflow, date
      // Raw data for moisture 1, moisture 2, tank volume, temperature, timestamp - this is just what the query gives us.
      let flowData: any[] = [];
      let lastDay: number = data[0].timestamp.getDate();
      let lastDate: Date = data[0].timestamp;
      let flow: number = data[0].tankFlow;
      let overflow: number = data[0].tankOverflow;
      let lastFlow: number = flow;
      let lastOverflow = overflow;
      for (let d of data) {

        // Sum the flow for the day. (endtime.flow - starttime.flow)
        if (lastDay != d.timestamp.getDate()) {
          let dayFlow: number = lastFlow - flow;
          let dayOverflow: number = lastOverflow - overflow;
          flowData[lastDay] = { x: lastDate.getTime() / (24 * 60 * 60 * 1000), y: [dayFlow, dayOverflow] };
          if (dayFlow + dayOverflow > flowMax) flowMax = dayFlow + dayOverflow;
          lastDay = d.timestamp.getDate();
          lastDate = d.timestamp;
          flow = d.tankFlow;
          overflow = d.tankOverflow;
        }
        lastFlow = d.tankFlow;
        lastOverflow = d.tankOverflow;
      }
      let dayFlow: number = lastFlow - flow;
      let dayOverflow: number = lastOverflow - overflow;
      flowData[lastDay] = { x: lastDate.getTime() / (24 * 60 * 60 * 1000), y: [dayFlow, dayOverflow] };
      if (dayFlow + dayOverflow > flowMax) flowMax = dayFlow + dayOverflow;

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = flowData;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.ymin = 0;
      dataSeries.ymax = flowMax;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      dataSeries.xTickFormat = this.displayType == "week" ? "E d MMM" : "dMMMyy";
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yUnits = "(l)";
      dataSeries.yDataType = "number";
      dataSeries.chartType = EChartType.stackedColumn;
      dataSeries.fillStyle = [ "Blue", "DeepSkyBlue"];
      dataSeries.strokeStyle = "green";
      this.chart.addDataSeries(dataSeries);
    }

    if (this.showVolume) {

      // Make data series for weigh
      let series: any[] = [];
      for (let d of data) {
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.tankVolume };
      }

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.ymin = 0;
      dataSeries.ymax = flowMax;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      dataSeries.xTickFormat = this.displayType == "week" ? "E d MMM" : "dMMMyy";
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yUnits = "(l)";
      dataSeries.yDataType = "number";
      dataSeries.strokeStyle = "Aqua";
      this.chart.addDataSeries(dataSeries);
    }
    if (activeAxisCount > 0) {
      activeAxis++;
      activeAxisCount = 0;
    }



    if (this.showMoisture) {

      // Make data series for weigh
      let series: any[] = [];
      for (let d of data) {
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.moisture1 };
      }

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.ymin = 0;
      dataSeries.ymax = 1024;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      dataSeries.xTickFormat = this.displayType == "week" ? "E d MMM" : "dMMMyy";
      dataSeries.yDataType = "number";
      dataSeries.strokeStyle = "YellowGreen";
      this.chart.addDataSeries(dataSeries);
    }
    if (activeAxisCount > 0) {
      activeAxis++;
      activeAxisCount = 0;
    }


    if (this.showTemperature) {

      // Make data series for weigh
      let series: any[] = [];
      for (let d of data) {
        series[series.length] = { x: d.timestamp.getTime() / (24 * 60 * 60 * 1000), y: d.temperature };
      }

      let dataSeries: DataSeries = new DataSeries();
      dataSeries.series = series;
      dataSeries.xmin = dayStart;
      dataSeries.xmax = dayEnd;
      dataSeries.ymin = 0;
      dataSeries.xAxisType = EAxisType.primary;
      dataSeries.xDataType = "date";
      dataSeries.xTickFormat = this.displayType == "week" ? "E d MMM" : "dMMMyy";
      dataSeries.yAxisType = activeAxis; activeAxisCount++;
      dataSeries.yUnits = "(\xB0C)";
      dataSeries.yDataType = "number";
      dataSeries.strokeStyle = "GoldenRod";
      this.chart.addDataSeries(dataSeries);
    }
    if (activeAxisCount > 0) {
      activeAxis++;
      activeAxisCount = 0;
    }

    this.chart.draw();
  }
}
