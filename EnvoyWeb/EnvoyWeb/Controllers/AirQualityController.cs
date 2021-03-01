using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace EnvoyWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AirQualityController : ControllerBase
    {
        string connectString;
        public AirQualityController()
        {
            connectString = Startup.Configuration["ApplicationSettings:ConnectString"];
        }

        // GET: api/AirQuality/Read
        [HttpGet("[action]/{range}/{date}")]
        // Range: 0: day, 1: week, 2: month
        public IEnumerable<IAirQuality> Read(int range, DateTime date)
        {
            List<IAirQuality> water = new List<IAirQuality>();

            try
            {
                DateTime dateStart, dateEnd;

                if (range == 2) // month
                {
                    dateStart = new DateTime(date.Year, date.Month, 1);
                    dateEnd = dateStart.AddMonths(1);
                }
                else if (range == 1) // week
                {
                    // Sunday will be the start of the week
                    int offset = (int)date.DayOfWeek;
                    dateStart = new DateTime(date.Year, date.Month, date.Day);
                    dateStart = dateStart.AddDays(-offset);
                    dateEnd = dateStart.AddDays(7);
                }
                else
                {
                    dateStart = new DateTime(date.Year, 1, 1);
                    dateEnd = dateStart.AddYears(1);
                }

                using (var con = new SqlConnection(connectString))
                {
                    con.Open();

                    using (var cmd = new SqlCommand(@"
SELECT 
    [timestamp],
    [Particle_0p5],
    [Particle_1p0],
    [Particle_2p5],
    [Particle_4p0],
    [Particle_10p0],
    [TypicalParticleSize],
    [Oxygen],
    [CO2],
    [CO],
    [Temperature],
    [Humidity]
FROM [Electricity].[dbo].[AirQuality] 
where timestamp >= @startDate and timestamp < @endDate order by timestamp", con))
                    {
                        cmd.Parameters.Add("startDate", SqlDbType.Date).Value = dateStart;
                        cmd.Parameters.Add("endDate", SqlDbType.Date).Value = dateEnd;

                        using (var rdr = cmd.ExecuteReader())
                        {
                            while (rdr.Read())
                            {
                                DateTime timestamp = rdr.GetDateTime(0);
                                float Particle_0p5 = (float)rdr.GetDouble(1);
                                float Particle_1p0 = (float)rdr.GetDouble(2);
                                float Particle_2p5 = (float)rdr.GetDouble(3);
                                float Particle_4p0 = (float)rdr.GetDouble(4);
                                float Particle_10p0 = (float)rdr.GetDouble(5);
                                float TypicalParticleSize = (float)rdr.GetDouble(6);
                                float Oxygen = (float)rdr.GetDouble(7);
                                float CO2 = (float)rdr.GetDouble(8);
                                float CO = (float)rdr.GetDouble(9);
                                float Temperature = (float)rdr.GetDouble(10);
                                float Humidity = (float)rdr.GetDouble(11);

                                water.Add(new IAirQuality()
                                {
                                    timestamp = timestamp,
                                    particle_0p5=Particle_0p5,
                                    particle_1p0 =Particle_1p0,
                                    particle_2p5 =Particle_2p5,
                                    particle_4p0 =Particle_4p0,
                                    particle_10p0 =Particle_10p0,
                                    typicalParticleSize =TypicalParticleSize,
                                    oxygen =Oxygen,
                                    cO2 =CO2,
                                    cO =CO,
                                    temperature =Temperature,
                                    humidity =Humidity
                                });
                            }
                            rdr.Close();
                        }
                    }
                    con.Close();
                }
            }
            catch (Exception ex)
            {
                Trace.TraceError(ex.ToString());
            }

            return water;
        }
    }

    public class IAirQuality
    {
        public DateTime timestamp;
        public float particle_0p5;
        public float particle_1p0;
        public float particle_2p5;
        public float particle_4p0;
        public float particle_10p0;
        public float typicalParticleSize;
        public float oxygen;
        public float cO2;
        public float cO;
        public float temperature;
        public float humidity;

        public IAirQuality()
        {
            //timestamp;
            particle_0p5=0;
            particle_1p0 = 0;
            particle_2p5 = 0;
            particle_4p0 = 0;
            particle_10p0 = 0;
            typicalParticleSize = 0;
            oxygen = 0;
            cO2 = 0;
            cO = 0;
            temperature = 0;
            humidity = 0;
    }
}

}
