
export const colourList: { [id: string]: string; } = { "-3": "0, 225, 255",
                                                      "-4": "41, 155, 251",
                                                       "1": "244, 115, 152",
                                                       "2": "255, 187, 121",
                                                       "3": "255, 189, 51",
                                                       "4": "219, 255, 51",
                                                       "5": "117, 255, 51",
                                                       "6": "51, 255, 87",
                                                       "7": "117, 255, 189",
                                                       "-2": "51, 255, 189",
                                                       "-1": "255, 87, 51" };

export const CONSUMED_ID: number = -1;
export const OTHER_ID: number = -2;
export const GENERATED_ID: number = -3;
export const NET_ID: number = -4;
export const PANELS: number = 12;
export const PANEL_MAX_POWER: number = 270;
export const maxProduction: number = PANEL_MAX_POWER * PANELS;

// https://stackoverflow.com/questions/661562/how-to-format-a-float-in-javascript
export function prettyFloat(x, nbDec) {
  if (!nbDec) nbDec = 100;
  var a = Math.abs(x);
  var e = Math.floor(a);
  var d = Math.round((a - e) * nbDec); if (d == nbDec) { d = 0; e++; }
  var signStr = (x < 0) ? "-" : " ";
  var decStr = d.toString(); var tmp = 10; while (tmp < nbDec && d * tmp < nbDec) { decStr = "0" + decStr; tmp *= 10; }
  var eStr = e.toString();
  return signStr + eStr + "." + decStr;
}
