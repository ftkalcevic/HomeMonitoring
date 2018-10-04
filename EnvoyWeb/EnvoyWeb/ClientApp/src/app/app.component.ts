import { Component, Inject, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LiveDataComponent } from './live-data/live-data.component';
import { HistoricDataComponent } from './historic-data/historic-data.component';
import { PanelDataComponent } from './panel-data/panel-data.component';
import { LivePowerComponent } from './live-power/live-power.component';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private baseUrl: string;
  private http: HttpClient;
  title = 'app';
  public power: LivePower;
  public maxProduction: number = 0;
  public maxConsumption: number = 0;
  public minNet: number = 0;
  public maxNet: number = 0;
  @ViewChild('speedo') speedo: LiveDataComponent ;
  @ViewChild('history') history: HistoricDataComponent ;
  @ViewChild('livePower') livePower: LivePowerComponent ;
  
  constructor(http: HttpClient, @Inject('BASE_URL') baseUrl: string) {
    this.baseUrl = baseUrl;
    this.http = http;
    setTimeout(() => this.ReadData(), 1000);
  }

  public ReadData() {
    this.http.get<LivePower>(this.baseUrl + 'api/Envoy/LiveData')
      .subscribe(
        result => {
          if (result.wattsConsumed != 0 || result.wattsProduced != 0) {
            // clean up data
            if (result.wattsConsumed < 0) result.wattsConsumed = 0;
            if (result.wattsProduced < 0) result.wattsProduced = 0;
            if (result.wattsProduced > this.maxProduction) this.maxProduction = result.wattsProduced;
            if (result.wattsConsumed > this.maxConsumption) this.maxConsumption = result.wattsConsumed;
            if (result.wattsNet > this.maxNet) this.maxNet = result.wattsNet;
            if (result.wattsNet < this.minNet) this.minNet = result.wattsNet;
            this.power = result;
            this.speedo.redrawSpeedo(result);
            this.history.newSample(result);
            this.livePower.newSample(result);
          }
          setTimeout(() => this.ReadData(), 1000);
        },
        error => {
          console.error(error);
          setTimeout(() => this.ReadData(), 1000);
        }
      );
  }
}
