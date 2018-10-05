import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { NavMenuComponent } from './nav-menu/nav-menu.component';
import { LiveDataComponent } from './live-data/live-data.component';
import { HistoricDataComponent } from './historic-data/historic-data.component';
import { TitleComponent } from './title/title.component';
import '../data/live-power.ts';
import { PanelDataComponent } from './panel-data/panel-data.component';
import { LivePowerComponent } from './live-power/live-power.component';
import { EnlightenComponent } from './enlighten/enlighten.component';
import { EnergyEasyComponent } from './energyeasy/energyeasy.component';


@NgModule({
  declarations: [
    AppComponent,
    NavMenuComponent,
    LiveDataComponent,
    HistoricDataComponent,
    PanelDataComponent,
    LivePowerComponent,
    TitleComponent,
    EnlightenComponent,
    EnergyEasyComponent
  ],
  imports: [
    BrowserModule.withServerTransition({ appId: 'ng-cli-universal' }),
    HttpClientModule,
    FormsModule,
    RouterModule.forRoot([
      { path: 'live-data', component: LiveDataComponent, pathMatch: 'full' },
      { path: 'historic-data', component: HistoricDataComponent},
      { path: 'panel-data', component: PanelDataComponent},
      { path: 'live-power', component: LivePowerComponent },
      { path: 'enlighten', component: EnlightenComponent},
      { path: 'energyeasy', component: EnergyEasyComponent},
    ])
    ],
  providers: [DatePipe],
  bootstrap: [AppComponent]
})
export class AppModule { }
