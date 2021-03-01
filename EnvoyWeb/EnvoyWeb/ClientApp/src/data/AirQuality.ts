export interface IAirQuality
{
  timestamp: Date;
  particle_0p5: number;
  particle_1p0: number;
  particle_2p5: number;
  particle_4p0: number;
  particle_10p0: number;
  typicalParticleSize: number;
  oxygen: number;
  cO2: number;
  cO: number;
  temperature: number;
  humidity: number;
}
