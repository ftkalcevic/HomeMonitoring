import { Component, Inject, ElementRef, ViewChild, ViewChildren, QueryList, OnChanges } from '@angular/core';
import { LiveDataService } from './live-data-service/live-data-service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app';
  
  constructor(private liveDataService: LiveDataService) {
  }

}
