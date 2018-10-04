import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DatePipe } from '@angular/common';

import { AppComponent } from './app.component';
import { LiveDataComponent } from './live-data/live-data.component';
import { HistoricDataComponent } from './historic-data/historic-data.component';
import { TitleComponent } from './title/title.component';
import '../data/live-power.ts';
import { PanelDataComponent } from './panel-data/panel-data.component';
import { LivePowerComponent } from './live-power/live-power.component';


@NgModule({
  declarations: [
    AppComponent,
    LiveDataComponent,
    HistoricDataComponent,
    PanelDataComponent,
    LivePowerComponent,
    TitleComponent
  ],
  imports: [
    BrowserModule.withServerTransition({ appId: 'ng-cli-universal' }),
    HttpClientModule,
    FormsModule
    ],
  providers: [DatePipe],
  bootstrap: [AppComponent]
})
export class AppModule { }
