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
    public class WeightController : ControllerBase
    {
        string connectString;
        public WeightController()
        {
            connectString = Startup.Configuration["ApplicationSettings:ConnectString"];
        }

        // GET: api/Weight/ReadWeight
        [HttpGet("[action]/{month}/{date}")]
        public IEnumerable<IWeight> ReadWeight(bool month, DateTime date)
        {
            List<IWeight> water = new List<IWeight>();

            try
            {
                DateTime dateStart, dateEnd;

                if (month)
                {
                    dateStart = new DateTime(date.Year, date.Month, 1);
                    dateEnd = dateStart.AddMonths(1);
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
SELECT [timestamp]
      ,[weight]
      ,[hydrationPercentage]
      ,[bodyFatPercentage]
      ,[activeMetabolicRate]
      ,[basalMetabolicRate]
      ,[muscleMass]
      ,[boneMass]
FROM [Electricity].[dbo].[Weight] 
where timestamp >= @startDate and timestamp < @endDate order by timestamp", con))
                    {
                        cmd.Parameters.Add("startDate", SqlDbType.Date).Value = dateStart;
                        cmd.Parameters.Add("endDate", SqlDbType.Date).Value = dateEnd;

                        using (var rdr = cmd.ExecuteReader())
                        {
                            while (rdr.Read())
                            {
                                DateTime timestamp = rdr.GetDateTime(0);
                                float weight = (float)rdr.GetDouble(1);
                                float hydrationPercentage = (float)rdr.GetDouble(2);
                                float bodyFatPercentage = (float)rdr.GetDouble(3);
                                float activeMetabolicRate = (float)rdr.GetDouble(4);
                                float basalMetabolicRate = (float)rdr.GetDouble(5);
                                float muscleMass = (float)rdr.GetDouble(6);
                                float boneMass = (float)rdr.GetDouble(7);

                                water.Add(new IWeight()
                                {
                                    timestamp = timestamp,
                                    weight = weight,
                                    hydrationPercentage = hydrationPercentage,
                                    bodyFatPercentage = bodyFatPercentage,
                                    activeMetabolicRate =activeMetabolicRate,
                                    basalMetabolicRate = basalMetabolicRate,
                                    muscleMass = muscleMass,
                                    boneMass = boneMass
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

    public class IWeight
    {
        public DateTime timestamp;
        public float weight;
        public float hydrationPercentage;
        public float bodyFatPercentage;
        public float activeMetabolicRate;
        public float basalMetabolicRate;
        public float muscleMass;
        public float boneMass;

        public IWeight()
        {
            //timestamp;
            weight=0;
            hydrationPercentage = 0;
            bodyFatPercentage = 0;
            activeMetabolicRate = 0;
            basalMetabolicRate = 0;
            muscleMass = 0;
            boneMass = 0;
        }
    }

}
