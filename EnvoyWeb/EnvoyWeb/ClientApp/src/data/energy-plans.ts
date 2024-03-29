

export class PriceBreak {
  Name: string;
  StartTime: string;
  EndTime: string;
  StartDate?: string;
  EndDate?: string;
  Rate: number;
  IsForControlledLoad?: boolean;
  IsForWeekDayOnly?: boolean;
}

export class EnergyPlan {
  Name: string;
  DailySupplyCharge: number;
  EnergyDiscount: number;
  FiT: number;
  PFiT: number;
  Pricing: PriceBreak[];
}

export class EnergyPlans {
  Plans: EnergyPlan
  []
  = [
    { /*0*/
      "Name": "RACV Plus 45/30 FIT Simply Energy - Time of Use + Controlled Load OP",
      "DailySupplyCharge": 0.9462,
      "EnergyDiscount": 0.45,
      "FiT": 0.1130,
      "PFiT": 0.6,
      "Pricing": [
        {
          "Name": "Controlled",
          "StartTime": "0:00",
          "EndTime": "23:59",
          "Rate": 0.2068,
          "IsForControlledLoad": true,
          "IsForWeekDayOnly": false
        },
        {
          "Name": "Peak",
          "StartTime": "7:00",
          "EndTime": "22:59",
          "Rate": 0.3638,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": true
        },
        {
          "Name": "Off-Peak",
          "StartTime": "0:00",
          "EndTime": "23:59",
          "Rate": 0.2088,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": false
        }
      ]
    },
    { /*1*/
      "Name": "RACV Plus 45/30 FIT Simply Energy - Peak + Controlled Load",
      "DailySupplyCharge": 0.8729,
      "EnergyDiscount": 0.45,
      "FiT": 0.1130,
      "PFiT": 0.6,
      "Pricing": [
        {
          "Name": "Controlled",
          "StartTime": "0:00",
          "EndTime": "23:59",
          "Rate": 0.2068,
          "IsForControlledLoad": true,
          "IsForWeekDayOnly": false
        },
        {
          "Name": "Summer Peak",
          "StartTime": "0:00",
          "EndTime": "23:59",
          "StartDate": "1 Nov",
          "EndDate": "31 Mar",
          "Rate": 0.3008,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": false
        },
        {
          "Name": "Non-Summer Peak",
          "StartTime": "0:00",
          "EndTime": "23:59",
          "Rate": 0.3008,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": false
        }
      ]
    },
    { /*2*/
      "Name": "RACV Plus 45/30 FIT Simply Energy - Dual Rate - Till 31 Dec 2019",
      "DailySupplyCharge": 1.04082,
      "EnergyDiscount": 0.45,
      "FiT": 0.12,
      "PFiT": 0.6,
      "Pricing": [
        {
          "Name": "Peak",
          "StartTime": "7:00",
          "EndTime": "22:59",
          "Rate": 0.45815,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": true
        },
        {
          "Name": "Off-Peak",
          "StartTime": "0:00",
          "EndTime": "23:59",
          "Rate": 0.2519,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": false
        }
      ]
    },
    { /*3*/
      "Name": "RACV Plus 45/30 FIT Simply Energy - Dual Rate - From 1 Jan 2020",
      "DailySupplyCharge": 1.12123,
      "EnergyDiscount": 0.45,
      "FiT": 0.12,
      "PFiT": 0.6,
      "Pricing": [
        {
          "Name": "Peak",
          "StartTime": "7:00",
          "EndTime": "22:59",
          "Rate": 0.5709,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": true
        },
        {
          "Name": "Off-Peak",
          "StartTime": "0:00",
          "EndTime": "23:59",
          "Rate": 0.31383,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": false
        }
      ]
    },
    { /*4*/
      "Name": "Alinta HomeDeal - Dual Rate - From 4 Mar 2020",
      "DailySupplyCharge": ".828",
      "EnergyDiscount": 0,
      "FiT": 0.12,
      "PFiT": 0.6,
      "Pricing": [
        {
          "Name": "Peak",
          "StartTime": "7:00",
          "EndTime": "22:59",
          "Rate": 0.276,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": true
        },
        {
          "Name": "Off-Peak",
          "StartTime": "0:00",
          "EndTime": "23:59",
          "Rate": 0.139,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": false
        }
      ]
    },
    { /*5*/
      "Name": "RACV Plus 45/30 FIT Simply Energy - Time of Use + Controlled Load OSP",
      "DailySupplyCharge": 0.8773,
      "EnergyDiscount": 0.45,
      "FiT": 0.1130,
      "PFiT": 0.6,
      "Pricing": [
        {
          "Name": "Controlled",
          "StartTime": "0:00",
          "EndTime": "23:59",
          "Rate": 0.2068,
          "IsForControlledLoad": true,
          "IsForWeekDayOnly": false
        },
        {
          "Name": "Summer Peak WeekDay",
          "StartTime": "15:00",
          "EndTime": "20:59",
          "StartDate": "1 Oct",
          "EndDate": "31 Mar",
          "Rate": 0.5208,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": true
        },
        {
          "Name": "Summer Shoulder WeekDay Morning",
          "StartTime": "7:00",
          "EndTime": "14:59",
          "StartDate": "1 Oct",
          "EndDate": "31 Mar",
          "Rate": 0.2788,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": true
        },
        {
          "Name": "Summer Shoulder WeekDay Evening",
          "StartTime": "21:00",
          "EndTime": "21:59",
          "StartDate": "1 Oct",
          "EndDate": "31 Mar",
          "Rate": 0.2788,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": true
        },
        {
          "Name": "Summer Shoulder Weekend",
          "StartTime": "7:00",
          "EndTime": "21:59",
          "StartDate": "1 Oct",
          "EndDate": "31 Mar",
          "Rate": 0.2788,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": false
        },
        {
          "Name": "Summer Off-Peak",
          "StartTime": "0:00",
          "EndTime": "23:59",
          "StartDate": "1 Oct",
          "EndDate": "31 Mar",
          "Rate": 0.2168,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": false
        },
        {
          "Name": "Winter Peak WeekDay",
          "StartTime": "15:00",
          "EndTime": "20:59",
          "StartDate": "1 Apr",
          "EndDate": "30 Sep",
          "Rate": 0.3838,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": true
        },
        {
          "Name": "Winter Shoulder WeekDay Morning",
          "StartTime": "7:00",
          "EndTime": "14:59",
          "StartDate": "1 Apr",
          "EndDate": "30 Sep",
          "Rate": 0.2968,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": true
        },
        {
          "Name": "Winter Shoulder WeekDay Evening",
          "StartTime": "21:00",
          "EndTime": "21:59",
          "StartDate": "1 Apr",
          "EndDate": "30 Sep",
          "Rate": 0.2968,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": true
        },
        {
          "Name": "Winter Shoulder Weekend",
          "StartTime": "7:00",
          "EndTime": "21:59",
          "StartDate": "1 Apr",
          "EndDate": "30 Sep",
          "Rate": 0.2968,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": false
        },
        {
          "Name": "Winter Off-Peak",
          "StartTime": "0:00",
          "EndTime": "23:59",
          "StartDate": "1 Apr",
          "EndDate": "30 Sep",
          "Rate": 0.2188,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": false
        }

      ]
    },
    { /*6*/
      "Name": "RACV Plus 45/30 FIT Simply Energy - Time of Use",
      "DailySupplyCharge": 0.8773,
      "EnergyDiscount": 0.45,
      "FiT": 0.1130,
      "PFiT": 0.6,
      "Pricing": [
        {
          "Name": "Summer Peak WeekDay",
          "StartTime": "15:00",
          "EndTime": "20:59",
          "StartDate": "1 Oct",
          "EndDate": "31 Mar",
          "Rate": 0.5208,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": true
        },
        {
          "Name": "Summer Shoulder WeekDay Morning",
          "StartTime": "7:00",
          "EndTime": "14:59",
          "StartDate": "1 Oct",
          "EndDate": "31 Mar",
          "Rate": 0.2788,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": true
        },
        {
          "Name": "Summer Shoulder WeekDay Evening",
          "StartTime": "21:00",
          "EndTime": "21:59",
          "StartDate": "1 Oct",
          "EndDate": "31 Mar",
          "Rate": 0.2788,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": true
        },
        {
          "Name": "Summer Shoulder Weekend",
          "StartTime": "7:00",
          "EndTime": "21:59",
          "StartDate": "1 Oct",
          "EndDate": "31 Mar",
          "Rate": 0.2788,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": false
        },
        {
          "Name": "Summer Off-Peak",
          "StartTime": "0:00",
          "EndTime": "23:59",
          "StartDate": "1 Oct",
          "EndDate": "31 Mar",
          "Rate": 0.2168,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": false
        },
        {
          "Name": "Winter Peak WeekDay",
          "StartTime": "15:00",
          "EndTime": "20:59",
          "StartDate": "1 Apr",
          "EndDate": "30 Sep",
          "Rate": 0.3838,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": true
        },
        {
          "Name": "Winter Shoulder WeekDay Morning",
          "StartTime": "7:00",
          "EndTime": "14:59",
          "StartDate": "1 Apr",
          "EndDate": "30 Sep",
          "Rate": 0.2968,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": true
        },
        {
          "Name": "Winter Shoulder WeekDay Evening",
          "StartTime": "21:00",
          "EndTime": "21:59",
          "StartDate": "1 Apr",
          "EndDate": "30 Sep",
          "Rate": 0.2968,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": true
        },
        {
          "Name": "Winter Shoulder Weekend",
          "StartTime": "7:00",
          "EndTime": "21:59",
          "StartDate": "1 Apr",
          "EndDate": "30 Sep",
          "Rate": 0.2968,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": false
        },
        {
          "Name": "Winter Off-Peak",
          "StartTime": "0:00",
          "EndTime": "23:59",
          "StartDate": "1 Apr",
          "EndDate": "30 Sep",
          "Rate": 0.2188,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": false
        }

      ]
    },
    { /*7*/
      "Name": "Alinta HomeDeal - Dual Rate - From 28 Sep 2020",
      "DailySupplyCharge": ".828",
      "EnergyDiscount": 0,
      "FiT": 0.102,
      "PFiT": 0.6,
      "Pricing": [
        {
          "Name": "Peak",
          "StartTime": "7:00",
          "EndTime": "22:59",
          "Rate": 0.276,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": true
        },
        {
          "Name": "Off-Peak",
          "StartTime": "0:00",
          "EndTime": "23:59",
          "Rate": 0.139,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": false
        }
      ]
    },
    { /*8*/
      "Name": "Alinta HomeDeal - Dual Rate - From 1 Aug 2021",
      "DailySupplyCharge": ".828",
      "EnergyDiscount": 0,
      "FiT": 0.067,
      "PFiT": 0.6,
      "Pricing": [
        {
          "Name": "Peak",
          "StartTime": "7:00",
          "EndTime": "22:59",
          "Rate": 0.276,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": true
        },
        {
          "Name": "Off-Peak",
          "StartTime": "0:00",
          "EndTime": "23:59",
          "Rate": 0.139,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": false
        }
      ]
    },
    { /*9*/
      "Name": "Alinta HomeDeal - Dual Rate - From 1 Aug 2023",
      "DailySupplyCharge": ".93874",
      "EnergyDiscount": 0,
      "FiT": 0.049,
      "PFiT": 0.6,
      "Pricing": [
        {
          "Name": "Peak",
          "StartTime": "7:00",
          "EndTime": "22:59",
          "Rate": "0.40238",
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": false
        },
        {
          "Name": "Off-Peak",
          "StartTime": "0:00",
          "EndTime": "23:59",
          "Rate": 0.24442,
          "IsForControlledLoad": false,
          "IsForWeekDayOnly": false
        }
      ]
    }

  ];

  constructor() { }

  dateMatch(pricing: PriceBreak, month: number, day: number): boolean {
    if (pricing.StartDate != null) {
      let s: Date = new Date(pricing.StartDate);
      let sm: number = s.getMonth();
      let e: Date = new Date(pricing.EndDate);
      let em: number = e.getMonth();
      if ((sm <= em && (sm <= month && month <= em)) ||
        (sm > em && (sm <= month || month <= em)))
        return true;
      else
        return false
    }
    else
      return true;
  }

  dowMatch(pricing: PriceBreak, dow: number): boolean {
    if (pricing.IsForWeekDayOnly != null && pricing.IsForWeekDayOnly) {
      if (dow > 0 && dow < 6)
        return true;
      else
        return false;
    } else {
      return true;
    }
  }

  timeMatch(pricing: PriceBreak, hour: number, minute: number): boolean {
    if (pricing.StartTime != null) {
      let s: number = parseInt(pricing.StartTime.split(/:/)[0]);
      let e: number = parseInt(pricing.EndTime.split(/:/)[0]);
      if (s <= hour && hour <= e)
        return true;
      else
        return false;
    } else {
      return true;
    }
  }

  controlledLoadMatch(pricing:PriceBreak, c: boolean): boolean {
    let planValue: boolean = (pricing.IsForControlledLoad != null) ? pricing.IsForControlledLoad : false;
    return planValue === c;
  }

  findTariff(plan: EnergyPlan, date: Date, time: number, controlledLoad: boolean): PriceBreak {
    let month: number = date.getMonth();
    let day: number = date.getDate();
    let dow: number = date.getDay();
    let hour: number = Math.floor(time);
    let minute: number = 60 * (time % 1);
    for (let p: number = 0; p < plan.Pricing.length; p++) {
      let pricing: PriceBreak = plan.Pricing[p];
      if (this.controlledLoadMatch(pricing, controlledLoad) &&
        this.dateMatch(pricing, month, day) &&
        this.dowMatch(pricing, dow) &&
        this.timeMatch(pricing, hour, minute)) {
        return pricing;
      }
    }
    return null;
  }
}


export class MyEnergyPlan {
  StartDate: Date;
  EndDate: Date;
  PlanId: number;
}

