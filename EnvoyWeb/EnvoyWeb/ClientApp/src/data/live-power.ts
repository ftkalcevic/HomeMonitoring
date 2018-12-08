
interface ILivePower {
  timestamp: Date;
  wattsProduced: number;
  wattsConsumed: number;
  wattsNet: number;
}

interface IEnphaseData {
  whProduced:number;
  whConsumed:number;
}
