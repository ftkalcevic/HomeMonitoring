import { Component, Inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatrixLT } from '../../assets/src_matrix_lt.js';
import { DatePipe } from '@angular/common';
import { interval } from "rxjs/internal/observable/interval";
import { startWith, switchMap } from "rxjs/operators";
import { GradientStep, Gradient } from "../../data/gradient";


@Component({
  selector: 'app-panel-data',
  host: {
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave()',
    '(mouseover)': 'onMouseOver()',
    '(mousemove)': 'onMouseMove($event)'
  },
  templateUrl: './panel-data.component.html'
})
export class PanelDataComponent {
  private baseUrl: string;
  private http: HttpClient;
  @ViewChild('panelCanvas') canvasRef: ElementRef;
  @ViewChild('imgHouse') houseImgRef: ElementRef;
  public panelInfo = {
    "system_id": 1460367,
    "rotation": 0,
    "dimensions": {
      "x_min": -477,
      "x_max": 731,
      "y_min": -480,
      "y_max": 294
    },
    "arrays": [
      {
        "array_id": 2344175,
        "label": "North West Array",
        "x": -158,
        "y": -40,
        "azimuth": 327,
        "modules": [
          {
            "module_id": 31414811,
            "rotation": 0,
            "x": -200,
            "y": -100,
            "inverter": {
              "inverter_id": 32104668,
              "serial_num": "121810018710"
            }
          },
          {
            "module_id": 31414812,
            "rotation": 0,
            "x": -100,
            "y": -100,
            "inverter": {
              "inverter_id": 32104663,
              "serial_num": "121810018431"
            }
          },
          {
            "module_id": 31414813,
            "rotation": 0,
            "x": 0,
            "y": -100,
            "inverter": {
              "inverter_id": 32104666,
              "serial_num": "121810018247"
            }
          },
          {
            "module_id": 31414814,
            "rotation": 0,
            "x": 100,
            "y": -100,
            "inverter": {
              "inverter_id": 32104665,
              "serial_num": "121810018433"
            }
          },
          {
            "module_id": 31414815,
            "rotation": 0,
            "x": 200,
            "y": -100,
            "inverter": {
              "inverter_id": 32104664,
              "serial_num": "121810018427"
            }
          },
          {
            "module_id": 31414816,
            "rotation": 0,
            "x": -57,
            "y": 100,
            "inverter": {
              "inverter_id": 32104658,
              "serial_num": "121810015542"
            }
          },
          {
            "module_id": 31414817,
            "rotation": 0,
            "x": 43,
            "y": 100,
            "inverter": {
              "inverter_id": 32104669,
              "serial_num": "121810017904"
            }
          }
        ],
        "dimensions": {
          "x_min": -477,
          "x_max": 161,
          "y_min": -344,
          "y_max": 264
        }
      },
      {
        "array_id": 2344176,
        "label": "North East Array",
        "x": 520,
        "y": -226,
        "azimuth": 57,
        "modules": [
          {
            "module_id": 31414818,
            "rotation": 0,
            "x": -200,
            "y": 0,
            "inverter": {
              "inverter_id": 32104667,
              "serial_num": "121810015362"
            }
          },
          {
            "module_id": 31414819,
            "rotation": 0,
            "x": -100,
            "y": 0,
            "inverter": {
              "inverter_id": 32104662,
              "serial_num": "121810018719"
            }
          },
          {
            "module_id": 31414820,
            "rotation": 0,
            "x": 0,
            "y": 0,
            "inverter": {
              "inverter_id": 32104661,
              "serial_num": "121810018564"
            }
          },
          {
            "module_id": 31414821,
            "rotation": 0,
            "x": 100,
            "y": 0,
            "inverter": {
              "inverter_id": 32104660,
              "serial_num": "121810018700"
            }
          },
          {
            "module_id": 31414822,
            "rotation": 0,
            "x": 200,
            "y": 0,
            "inverter": {
              "inverter_id": 32104659,
              "serial_num": "121810018351"
            }
          }
        ],
        "dimensions": {
          "x_min": 291,
          "x_max": 731,
          "y_min": -420,
          "y_max": 108
        }
      }
    ],
    "haiku": "Put upon the roof / I am waiting for the sun / All I see is clouds"
  };
  public panelGeometry;
  public panelHighlighted = null;
  private timestamp: Date;
  subs: any[] = [];
  gradient: Gradient = new Gradient([{ percent:0,   R:65,  G:75,  B:85},
                                     { percent:50,  R:0,   G:128, B:241},
                                     { percent:100, R:150, G:215, B:255}]);

  constructor(http: HttpClient, @Inject('BASE_URL') baseUrl: string, private datePipe: DatePipe) {
    this.baseUrl = baseUrl;
    this.http = http;

    this.subs.push(
      interval(5 * 60 * 1000)
        .pipe(
          startWith(100),
        switchMap(()=> this.http.get<IPanelPower[]>(this.baseUrl + 'api/Envoy/CurrentPanelData')
        )
        )
        .subscribe(
          result => {
            this.redrawPanels(result);
          },
          error => {
            console.error(error);
          }
        )
    );
  }

  ngAfterViewInit() {
    this.canvasRef.nativeElement.width = this.canvasRef.nativeElement.offsetWidth;
    this.canvasRef.nativeElement.height = this.canvasRef.nativeElement.offsetHeight;
  }

  ngOnDestroy() {
    for (let s of this.subs)
      s.unsubscribe();
  }

  public redrawPanels(power: IPanelPower[]) {
    if (this.panelGeometry == null)
      this.InitialisePanelGeometry();

    if (power != null) {
      for (let i: number = 0; i < power.length; i++) {
        this.panelGeometry[power[i].serialNumber].percentage = power[i].percentage;
        this.panelGeometry[power[i].serialNumber].watts = power[i].watts;
      }
      this.timestamp = power[0].timestamp;
    }

    let ctx: CanvasRenderingContext2D = this.canvasRef.nativeElement.getContext('2d');
    ctx.save();

    // Clear any previous content.
    let width: number = this.canvasRef.nativeElement.width;
    let height: number = this.canvasRef.nativeElement.height;

    let image: HTMLImageElement = <HTMLImageElement>this.houseImgRef.nativeElement;
    ctx.drawImage(image, -260, -170, width*1.45, width*1.45);

    // Draw all panels
    for (var sn in this.panelGeometry) {
      this.DrawPanel(ctx, sn, false);
    }

    // timestamp
    ctx.font = "20px san serif";
    ctx.fillStyle = "white";
    ctx.textAlign = "end";
    ctx.fillText(this.datePipe.transform(this.timestamp,"h:mm:ss a"), width-5, height-5);

    // Legend
    let y1: number = height / 4, y2: number = 3 * height / 4;
    let x1: number = width - 25, x2: number = width - 5;
    let grad: CanvasGradient = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, 'rgb(150,215,255)');
    grad.addColorStop(.5, 'rgb(0,128,241)');
    grad.addColorStop(1, 'rgb(63,75,85)');
    ctx.fillStyle = grad;
    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    
    if (this.panelHighlighted) {
      
      this.DrawPanel(ctx, this.panelHighlighted, true);

      let x: number = (this.panelGeometry[this.panelHighlighted].points[0].x +
                      this.panelGeometry[this.panelHighlighted].points[2].x)/2;
      let y: number = (this.panelGeometry[this.panelHighlighted].points[0].y +
                      this.panelGeometry[this.panelHighlighted].points[2].y)/2;
      x -= 70; y -= 19;

      ctx.strokeStyle = "black";
      ctx.lineWidth = 4;
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillRect(x, y, 140, 38);
      ctx.strokeRect(x, y, 140, 38);

      ctx.font = "20px san serif";
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.fillText(this.panelGeometry[this.panelHighlighted].watts + "W (" +
                   this.panelGeometry[this.panelHighlighted].percentage + "%)", x+70,y+25);
    }
    ctx.restore();
  }


  private DrawPanel(ctx: CanvasRenderingContext2D, serialNumber:string, highlight:boolean) {

    ctx.strokeStyle = "black";
    var geom = this.panelGeometry[serialNumber];
    var percentage: number = geom.percentage;

    ctx.fillStyle = "rgb(" + this.gradient.getColour(percentage) + ")";
    ctx.beginPath();
    ctx.moveTo(geom.points[0].x, geom.points[0].y);
    ctx.lineTo(geom.points[1].x, geom.points[1].y);
    ctx.lineTo(geom.points[2].x, geom.points[2].y);
    ctx.lineTo(geom.points[3].x, geom.points[3].y);
    ctx.lineTo(geom.points[0].x, geom.points[0].y);
    ctx.fill()

    if (highlight) {
      ctx.strokeStyle = "red";
    } else {
      ctx.strokeStyle = "black";
    }
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(geom.points[0].x, geom.points[0].y);
    ctx.lineTo(geom.points[1].x, geom.points[1].y);
    ctx.lineTo(geom.points[2].x, geom.points[2].y);
    ctx.lineTo(geom.points[3].x, geom.points[3].y);
    ctx.lineTo(geom.points[0].x, geom.points[0].y);
    ctx.stroke();
  }

  private InitialisePanelGeometry(){
    this.panelGeometry = {};

    let width: number = this.canvasRef.nativeElement.width;
    let height: number = this.canvasRef.nativeElement.height;

    let m: MatrixLT = new MatrixLT(null);

    let scaleX = width / (this.panelInfo.dimensions.x_max - this.panelInfo.dimensions.x_min);
    let scaleY = height / (this.panelInfo.dimensions.y_max - this.panelInfo.dimensions.y_min);
    scaleX *= .95;
    scaleY *= .95;
    if (scaleX < scaleY)
      scaleY = scaleX;
    else
      scaleX = scaleY;
    let xoffset: number = width - (this.panelInfo.dimensions.x_max - this.panelInfo.dimensions.x_min) * scaleX;
    let yoffset: number = height - (this.panelInfo.dimensions.y_max - this.panelInfo.dimensions.y_min) * scaleY;
    m.scale(scaleX, scaleY);
    m.translate(-this.panelInfo.dimensions.x_min + xoffset, -this.panelInfo.dimensions.y_min + yoffset);

    let p: number, a: number;
    for (a = 0; a < this.panelInfo.arrays.length; a++) {

      let arr = this.panelInfo.arrays[a];

      let m2: MatrixLT = m.clone();
      m2.translate(arr.x, arr.y);
      m2.rotate((arr.azimuth / 180 * Math.PI) + Math.PI);

      for (p = 0; p < arr.modules.length; p++) {
        let panel = arr.modules[p];
        
        var p1 = m2.applyToPoint(panel.x - 50, panel.y - 100);
        var p2 = m2.applyToPoint(panel.x + 50, panel.y - 100);
        var p3 = m2.applyToPoint(panel.x + 50, panel.y + 100);
        var p4 = m2.applyToPoint(panel.x - 50, panel.y + 100);

        this.panelGeometry[panel.inverter.serial_num] = {
          serialNumber: panel.inverter.serial_num,
          points: [ {x: p1.x, y: p1.y },
                    {x: p2.x, y: p2.y },
                    {x: p3.x, y: p3.y},
                    {x: p4.x, y: p4.y}],
          watts: 0,
          percentage: 0
        };
      }
    }
  }
  onMouseEnter() {
    //console.log("onMouseEnter");
  }
  onMouseLeave() {
    //console.log("onMouseLeave");
  }
  onMouseOver() {
    //console.log("onMouseOver");
  }
  onMouseMove(e: MouseEvent) {
    var panel = this.findHitPanel(e.offsetX, e.offsetY);
    if (panel || this.panelHighlighted) {
      
      if (!this.panelHighlighted ||
        this.panelHighlighted != panel ) {
        this.panelHighlighted = panel;
        this.redrawPanels(null);
      }
    }
  }

  // https://github.com/substack/point-in-polygon/blob/master/index.js
  PointInPoly(p, poly) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    const x = p.x, y = p.y;

    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;

      const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }

  private findHitPanel(x: number, y: number): any {

    for (const p in this.panelGeometry) {
      if (this.PointInPoly({ x: x, y: y }, this.panelGeometry[p].points)) {
        return p;
      }
    }
    return null;
  }
}
