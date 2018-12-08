using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Data;
using System.Data.SqlClient;

namespace EnvoyWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SonoffController : ControllerBase
    {
        string connectString;
        public SonoffController()
        {
            connectString = Startup.Configuration["ApplicationSettings:ConnectString"];
        }

        // GET: api/Sonoff/GetDevices
        [HttpGet("[action]")]
        public IEnumerable<ISonoffDevice> GetDevices()
        {
            List<ISonoffDevice> devices = new List<ISonoffDevice>();

            using (var con = new SqlConnection(connectString))
            {
                con.Open();
                using (var cmd = new SqlCommand(@"select id,name,description,hostname,ipaddress from SonoffDevices", con))
                {
                    using (var rdr = cmd.ExecuteReader())
                    {
                        while (rdr.Read())
                        {
                            int id = rdr.GetInt32(0);
                            string name = rdr.GetString(1);
                            string description = rdr.GetString(2);
                            string hostname = rdr.GetString(3);
                            string ipaddress = rdr.GetString(4);

                            devices.Add(new ISonoffDevice()
                            {
                                id = id,
                                name = name,
                                description = description,
                                hostname = hostname,
                                ipAddress = ipaddress
                            });

                        }
                        rdr.Close();
                    }
                }
                con.Close();
            }
            return devices;
        }

        // GET: api/Sonoff/1/GetDayData/1 oct 2017
        [HttpGet("{deviceId}/GetDayData/{day}")]
        public IEnumerable<ISonoffDailyData> GetDayData(int deviceId, DateTime day)
        {
            DateTime dayStart = new DateTime(day.Year, day.Month, day.Day);
            DateTime dayEnd = dayStart + new TimeSpan(1,0,0,0,0);

            List<ISonoffDailyData> data = new List<ISonoffDailyData>();

            using (var con = new SqlConnection(connectString))
            {
                con.Open();
                using (var cmd = new SqlCommand(@"select  timestamp, today, power from SonoffPower where deviceId = @deviceId and timestamp between @dateFrom and @dateTo", con))
                {
                    cmd.Parameters.Add("deviceId", SqlDbType.Int).Value = deviceId;
                    cmd.Parameters.Add("dateFrom", SqlDbType.Date).Value = dayStart;
                    cmd.Parameters.Add("dateTo", SqlDbType.Date).Value = dayEnd;
                    using (var rdr = cmd.ExecuteReader())
                    {
                        while (rdr.Read())
                        {
                            DateTime timestamp = rdr.GetDateTime(0);
                            float today = (float)rdr.GetDouble(1);
                            float power = (float)rdr.GetDouble(2);

                            data.Add(new ISonoffDailyData()
                            {
                                timestamp = timestamp,
                                today = today,
                                power = power
                            });

                        }
                        rdr.Close();
                    }
                }
                con.Close();
            }
            return data;
        }

        // GET: api/Sonoff/1/GetData
        [HttpGet("{deviceId}/GetHoursData")]
        public IEnumerable<ISonoffHoursData> GetHoursData(int deviceId)
        {
            List<ISonoffHoursData> data = new List<ISonoffHoursData>();

            using (var con = new SqlConnection(connectString))
            {
                con.Open();
                using (var cmd = new SqlCommand(@"
select DATEPART(YEAR, timestamp) YYYY,
DATEPART(MONTH, timestamp) MM,
DATEPART(DAY, timestamp) DD,
DATEPART(HOUR, timestamp) HH,
min(total) minkWh,
max(total) maxkWh
 from SonoffPower where deviceId = @deviceId
GROUP BY
DATEPART(YEAR, timestamp),
DATEPART(MONTH, timestamp),
DATEPART(DAY, timestamp),
DATEPART(HOUR, timestamp)
order by yyyy,mm,dd,hh"
, con))
                {
                    cmd.Parameters.Add("deviceId", SqlDbType.Int).Value = deviceId;
                    using (var rdr = cmd.ExecuteReader())
                    {
                        float lastkWh = 0;
                        while (rdr.Read())
                        {
                            int year = rdr.GetInt32(0);
                            int month = rdr.GetInt32(1);
                            int day = rdr.GetInt32(2);
                            int hour = rdr.GetInt32(3);
                            float minkWh = (float)rdr.GetDouble(4);
                            float maxkWh = (float)rdr.GetDouble(5);

                            // if the difference between the last is excessive, we may have missed samples
                            float energy = maxkWh - lastkWh;
                            if (energy > 2 * (maxkWh-minkWh))
                                energy = maxkWh - minkWh;
                            data.Add(new ISonoffHoursData()
                            {
                                year = year,
                                month = month,
                                day = day,
                                hour = hour,
                                kWh = energy
                            });
                            lastkWh = maxkWh;
                        }
                        rdr.Close();
                    }
                }
                con.Close();
            }
            return data;
        }


        // GET: api/Sonoff/1/GetData
        [HttpGet("{deviceId}/GetDaysData")]
        public IEnumerable<ISonoffDaysData> GetDaysData(int deviceId)
        {
            List<ISonoffDaysData> data = new List<ISonoffDaysData>();

            using (var con = new SqlConnection(connectString))
            {
                con.Open();
                using (var cmd = new SqlCommand(@"
;with cte as
(
  select	*,
			row_number() over(partition by datediff(d, 0, timestamp) order by timestamp ) as rn 
  from      SonoffPower
  where		deviceId = @deviceid
	    and yesterday > 0 
), data as 
(
	select dateadd(day,-1,convert(date,timestamp)) date, yesterday 
	from cte  
	where rn = 1
)
select  DATEPART(YEAR, date) YYYY,
        DATEPART(MONTH, date) MM,
        DATEPART(DAY, date) DD,
        yesterday kWh
 from data", con))
                {
                    cmd.Parameters.Add("deviceId", SqlDbType.Int).Value = deviceId;
                    using (var rdr = cmd.ExecuteReader())
                    {
                        while (rdr.Read())
                        {
                            int year = rdr.GetInt32(0);
                            int month = rdr.GetInt32(1);
                            int day = rdr.GetInt32(2);
                            float kWh = (float)rdr.GetDouble(3);

                            data.Add(new ISonoffDaysData()
                            {
                                year = year,
                                month = month,
                                day = day,
                                kWh = kWh
                            });
                        }
                        rdr.Close();
                    }
                }
                con.Close();
            }
            return data;
        }

        // GET: api/Sonoff/1/GetSummaryData
        [HttpGet("{deviceId}/GetSummaryData")]
        public IEnumerable<ISonoffSummaryData> GetSummaryData(int deviceId)
        {
            List<ISonoffSummaryData> data = new List<ISonoffSummaryData>();

            using (var con = new SqlConnection(connectString))
            {
                con.Open();
                using (var cmd = new SqlCommand(@"
;with cte as
(
  select	*,
			row_number() over(partition by datediff(d, 0, timestamp), deviceId order by timestamp ) as rn 
  from      SonoffPower
)
select deviceId, dateadd(day,-1,convert(date,timestamp)), yesterday
from cte  
where rn = 1
and deviceId = @deviceId
", con))
                {
                    cmd.Parameters.Add("deviceId", SqlDbType.Int).Value = deviceId;
                    using (var rdr = cmd.ExecuteReader())
                    {
                        while (rdr.Read())
                        {
                            DateTime timestamp = rdr.GetDateTime(1);
                            float today = (float)rdr.GetDouble(2);

                            data.Add(new ISonoffSummaryData()
                            {
                                timestamp = timestamp,
                                today = today
                            });

                        }
                        rdr.Close();
                    }
                }
                con.Close();
            }
            return data;
        }

        //// GET: api/Sonoff/5
        //[HttpGet("{id}", Name = "Get")]
        //public string Get(int id)
        //{
        //    return "value";
        //}

        //// POST: api/Sonoff
        //[HttpPost]
        //public void Post([FromBody] string value)
        //{
        //}

        //// PUT: api/Sonoff/5
        //[HttpPut("{id}")]
        //public void Put(int id, [FromBody] string value)
        //{
        //}

        //// DELETE: api/ApiWithActions/5
        //[HttpDelete("{id}")]
        //public void Delete(int id)
        //{
        //}
    }


    public class ISonoffDevice
    {
        public int id;
        public string name;
        public string description;
        public string hostname;
        public string ipAddress;
        public ISonoffDevice()
        {
            id = -1;
            name = "";
            description = "";
            hostname = "";
            ipAddress = "";
        }
    };

    public class ISonoffDailyData
    {
        public DateTime timestamp;
        public float today;
        public float power;
    };

    public class ISonoffHoursData
    {
        public int year, month, day, hour;
        public float kWh;
    };

    public class ISonoffDaysData
    {
        public int year, month, day;
        public float kWh;
    };

    public class ISonoffSummaryData
    {
        public DateTime timestamp;
        public float today;
    };

}
