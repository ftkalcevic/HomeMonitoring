import { Component, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-live-data',
  templateUrl: './live-data.component.html'
})
export class LiveDataComponent {
  public power: LivePower;
  private baseUrl: string;
  private http: HttpClient;

  constructor(http: HttpClient, @Inject('BASE_URL') baseUrl: string) {
    this.baseUrl = baseUrl;
    this.http = http;
    setInterval(() => this.ReadData(), 1000);
  }

  public ReadData() {
    this.http.get<LivePower>(this.baseUrl + 'api/Envoy/LiveData').subscribe(result => {
      this.power = result;
    }, error => console.error(error));
  }
}

interface LivePower {
  timestamp: Date;
  wattsProduced: number;
  wattsConsumed: number;
  wattsNet: number;
};

