export class GradientStep {
}
export class Gradient {
    constructor(g) {
        this.gradient = g;
    }
    getColour(percent) {
        if (percent > 100)
            percent = 100;
        else if (percent < 0)
            percent = 0;
        let g0 = null;
        for (let g1 of this.gradient) {
            if (percent < g1.percent) {
                if (g0 != null) {
                    const r = (g1.R - g0.R) * (percent - g0.percent) / (g1.percent - g0.percent) + g0.R;
                    const g = (g1.G - g0.G) * (percent - g0.percent) / (g1.percent - g0.percent) + g0.G;
                    const b = (g1.B - g0.B) * (percent - g0.percent) / (g1.percent - g0.percent) + g0.B;
                    return r.toFixed(0) + "," + g.toFixed(0) + "," + b.toFixed(0);
                }
            }
            else {
                g0 = g1;
            }
        }
        return g0.R.toFixed(0) + "," + g0.G.toFixed(0) + "," + g0.B.toFixed(0);
    }
}
//# sourceMappingURL=gradient.js.map