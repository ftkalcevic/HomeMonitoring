import { Component } from '@angular/core';

@Component({
  selector: 'app-nav-menu',
  templateUrl: './nav-menu.component.html',
  styleUrls: ['./nav-menu.component.css']
})
export class NavMenuComponent {
  public isExpanded: boolean = false;

  collapse() {
    this.isExpanded = false;
    console.info("isExpanded="+this.isExpanded.toString());
  }

  toggle() {
    this.isExpanded = !this.isExpanded;
    console.info("isExpanded="+this.isExpanded.toString());
  }
}
