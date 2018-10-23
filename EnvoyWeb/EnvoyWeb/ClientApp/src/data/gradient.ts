export class GradientStep {
  percent: number;
  R: number;
  G: number;
  B: number;
}

export class Gradient {
  private gradient: GradientStep[];

  constructor( g: GradientStep[] ) {
    this.gradient = g;
  }

  public getColour(percent: number) {
    if (percent > 100)
      percent = 100;
    else if (percent < 0)
      percent = 0;
    let g0: GradientStep = null;
    for (let g1 of this.gradient) {
      if (percent < g1.percent) {
        if (g0 != null) {
          const r: number = (g1.R - g0.R) * (percent - g0.percent) / (g1.percent - g0.percent) + g0.R;
          const g: number = (g1.G - g0.G) * (percent - g0.percent) / (g1.percent - g0.percent) + g0.G;
          const b: number = (g1.B - g0.B) * (percent - g0.percent) / (g1.percent - g0.percent) + g0.B;

          return r.toFixed(0) + "," + g.toFixed(0) + "," + b.toFixed(0);
        }
      } else {
        g0 = g1;
      }
    }
    return g0.R.toFixed(0) + "," + g0.G.toFixed(0) + "," + g0.B.toFixed(0);
  }

}
