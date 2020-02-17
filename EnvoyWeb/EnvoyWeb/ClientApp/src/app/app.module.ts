import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { NavMenuComponent } from './nav-menu/nav-menu.component';
import { LiveDataComponent } from './live-data/live-data.component';
import { LiveSolarStatsComponent } from './live-solar-stats/live-solar-stats.component';
import { HistoricDataComponent } from './historic-data/historic-data.component';
import { TitleComponent } from './title/title.component';
import '../data/live-power.ts';
import { PanelDataComponent } from './panel-data/panel-data.component';
import { LivePowerComponent } from './live-power/live-power.component';
import { LivePower2Component } from './live-power2/live-power2.component';
import { LivePowerStatsComponent } from './live-power-stats/live-power-stats.component';
import { EnlightenComponent } from './enlighten/enlighten.component';
import { EnergyEasyComponent } from './energyeasy/energyeasy.component';
import { SolarHistoryComponent } from './solar-history/solar-history.component';

import { GardenTanksComponent } from './garden-tanks/garden-tanks.component';
import { GardenNoiseComponent } from './garden-noise/garden-noise.component';

import { WeatherRadarComponent } from './weather-radar/weather-radar.component';
import { WeatherRainComponent } from './weather-rain/weather-rain.component';
import { WeatherTempComponent } from './weather-temp/weather-temp.component';
import { WeatherTodayComponent } from './weather-today/weather-today.component';
import { WeatherWindComponent } from './weather-wind/weather-wind.component';
import { SonoffDeviceComponent } from './sonoff-device/sonoff-device.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CdkTableModule } from '@angular/cdk/table';
import {
  MatAutocompleteModule,
  MatButtonModule,
  MatButtonToggleModule,
  MatCardModule,
  MatCheckboxModule,
  MatChipsModule,
  MatDialogModule,
  MatExpansionModule,
  MatGridListModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatProgressSpinnerModule,
  MatRadioModule,
  MatRippleModule,
  MatSelectModule,
  MatSidenavModule,
  MatSliderModule,
  MatSlideToggleModule,
  MatSnackBarModule,
  MatSortModule,
  MatTableModule,
  MatTabsModule,
  MatToolbarModule,
  MatTooltipModule,
  MatStepperModule,
  MatDatepickerModule,
  MatNativeDateModule
} from '@angular/material';

@NgModule({
  declarations: [
    AppComponent,
    NavMenuComponent,
    LiveDataComponent,
    LiveSolarStatsComponent,
    HistoricDataComponent,
    PanelDataComponent,
    LivePowerComponent,
    LivePower2Component,
    LivePowerStatsComponent,
    TitleComponent,
    EnlightenComponent,
    EnergyEasyComponent,
    GardenTanksComponent,
    GardenNoiseComponent,
    WeatherRadarComponent,
    WeatherRainComponent, 
    WeatherTempComponent, 
    WeatherTodayComponent,
    WeatherWindComponent,
    SonoffDeviceComponent,
    SolarHistoryComponent
  ],
  exports: [
    CdkTableModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
  ],
  imports: [
    MatDatepickerModule,        // <----- import(must)
    MatNativeDateModule,        // <----- import for date formating(optional)
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    BrowserAnimationsModule,
    BrowserModule.withServerTransition({ appId: 'ng-cli-universal' }),
    HttpClientModule,
    FormsModule,
    RouterModule.forRoot([
      { path: '', redirectTo: '/live-data', pathMatch: 'full' },
      { path: 'live-data', component: LiveDataComponent, pathMatch: 'full' },
      { path: 'historic-data', component: HistoricDataComponent},
      { path: 'panel-data', component: PanelDataComponent},
      { path: 'live-power', component: LivePowerComponent },
      { path: 'live-power2', component: LivePower2Component },
      { path: 'live-power-stats', component: LivePowerStatsComponent },
      { path: 'live-power-stats/:deviceId', component: LivePowerStatsComponent },
      { path: 'enlighten', component: EnlightenComponent},
      { path: 'energyeasy', component: EnergyEasyComponent },
      { path: 'garden-tanks', component: GardenTanksComponent },
      { path: 'garden-noise', component: GardenNoiseComponent },
      { path: 'weather-radar', component: WeatherRadarComponent },
      { path: 'weather-rain', component: WeatherRainComponent },
      { path: 'weather-temp', component: WeatherTempComponent },
      { path: 'weather-today', component: WeatherTodayComponent },
      { path: 'weather-wind', component: WeatherWindComponent },
      { path: 'sonoff-device/:deviceId', component: SonoffDeviceComponent },
      { path: 'solar-history', component: SolarHistoryComponent },
    ])
    ],
  providers: [DatePipe],
  bootstrap: [AppComponent]
})
export class AppModule { }
