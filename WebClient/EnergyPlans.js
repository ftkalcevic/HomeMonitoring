var EnergyPlans = {
  "Plans": [
    {
      "Name": "RACV Plus 45/30 FIT Simply Energy - Time of Use + Controlled Load OP",
      "DailySupplyCharge": 0.9462,
      "EnergyDiscount": 0.45,
      "FiT":  0.1130,
      "PFiT":  0.6,
      "Pricing": [
        {"Name": "Controlled", "StartTime": "0:0", "EndTime": "23:59", "Rate": 0.2068, "isControlledLoad": true, "IsWeekDayOnly":  false},
        { "Name": "Peak", "StartTime": "7:0", "EndTime": "22:59", "Rate": 0.3638, "isControlledLoad": false, "IsWeekDayOnly": true },
          {"Name": "Off-Peak", "StartTime": "0:0", "EndTime": "23:59", "Rate": 0.2088, "isControlledLoad": false, "IsWeekDayOnly": false}
      ]
    },
    {
      "Name": "RACV Plus 45/30 FIT Simply Energy - Peak + Controlled Load",
      "DailySupplyCharge": 0.8729,
      "EnergyDiscount": 0.45,
      "FiT":  0.1130,
      "PFiT":  0.6,
      "Pricing": [
          {"Name": "Controlled", "StartTime": "0:0", "EndTime": "23:59", "Rate": 0.2068, "isControlledLoad": true, "IsWeekDayOnly": false
      },
      {"Name": "Summer Peak", "StartTime": "0:0", "EndTime": "23:59", "StartDate": "1 Nov", "EndDate": "31 Mar", "Rate": 0.3008, "isControlledLoad": false, "IsWeekDayOnly": false
      },
      {"Name": "Non-Summer Peak", "StartTime": "0:0", "EndTime": "23:59", "Rate": 0.3008, "isControlledLoad": false, "IsWeekDayOnly": false
    }
      ]
    },
    {
      "Name": "RACV Plus 45/30 FIT Simply Energy - Time of Use + Controlled Load OSP",
      "DailySupplyCharge": 0.8773,
      "EnergyDiscount": 0.45,
      "FiT":  0.1130,
      "PFiT":  0.6,
      "Pricing": [
          {"Name": "Controlled", "StartTime": "0:0", "EndTime": "23:59", "Rate": 0.2068, "isControlledLoad": true, "IsWeekDayOnly": false},
          {"Name": "Summer Peak WeekDay", "StartTime": "15:0", "EndTime": "20:59", "StartDate": "1 Oct", "EndDate": "31 Mar", "Rate": 0.5208, "isControlledLoad": false, "IsWeekDayOnly": true},
          {"Name": "Summer Shoulder WeekDay Morning", "StartTime": "7:0", "EndTime": "14:59", "StartDate": "1 Oct", "EndDate": "31 Mar", "Rate": 0.2788, "isControlledLoad": false, "IsWeekDayOnly": true      },
          {"Name": "Summer Shoulder WeekDay Evening", "StartTime": "21:0", "EndTime": "21:59", "StartDate": "1 Oct", "EndDate": "31 Mar", "Rate": 0.2788, "isControlledLoad": false, "IsWeekDayOnly": true      },
          {"Name": "Summer Shoulder Weekend", "StartTime": "7:0", "EndTime": "21:59", "StartDate": "1 Oct", "EndDate": "31 Mar", "Rate": 0.2788, "isControlledLoad": false, "IsWeekDayOnly": false      },
          {"Name": "Summer Off-Peak", "StartTime": "0:0", "EndTime": "23:59", "StartDate": "1 Oct", "EndDate": "31 Mar", "Rate": 0.2168, "isControlledLoad": false, "IsWeekDayOnly": false      },
          {"Name": "Winter Peak WeekDay", "StartTime": "15:0", "EndTime": "20:59", "StartDate": "1 Apr", "EndDate": "30 Sep", "Rate": 0.3838, "isControlledLoad": false, "IsWeekDayOnly": true      },
          {"Name": "Winter Shoulder WeekDay Morning", "StartTime": "7:0", "EndTime": "14:59", "StartDate": "1 Apr", "EndDate": "30 Sep", "Rate": 0.2968, "isControlledLoad": false, "IsWeekDayOnly": true      },
          {"Name": "Winter Shoulder WeekDay Evening", "StartTime": "21:0", "EndTime": "21:59", "StartDate": "1 Apr", "EndDate": "30 Sep", "Rate": 0.2968, "isControlledLoad": false, "IsWeekDayOnly": true      },
          {"Name": "Summer Shoulder Weekend", "StartTime": "7:0", "EndTime": "21:59", "StartDate": "1 Apr", "EndDate": "30 Sep", "Rate": 0.2968, "isControlledLoad": false, "IsWeekDayOnly": false      },
          {"Name": "Winter Off-Peak", "StartTime": "0:0", "EndTime": "23:59", "StartDate": "1 Apr", "EndDate": "30 Sep", "Rate": 0.2188, "isControlledLoad": false, "IsWeekDayOnly": false},

      ]
    }
  ]
}
