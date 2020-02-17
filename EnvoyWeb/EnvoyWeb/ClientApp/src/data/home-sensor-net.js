export class Tank {
    //public constructor(init?: Partial<ITank>) {
    //  Object.assign(this, init);
    //}
    constructor(id, name) {
        this.deviceId = id;
        this.deviceName = name;
    }
}
export class TankWaterer {
    constructor(init) {
        Object.assign(this, init);
    }
}
//# sourceMappingURL=home-sensor-net.js.map