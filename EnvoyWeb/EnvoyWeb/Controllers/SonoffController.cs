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
        string connectString = @"Persist Security Info=False;Integrated Security=SSPI; database = Electricity; server = Server\SqlExpress";

        // GET: api/Sonoff/GetDevices
        [HttpGet("[action]")]
        public IEnumerable<ISonoffDevice> GetDevices()
        {
            List<ISonoffDevice> devices = new List<ISonoffDevice>();

            using (var con = new SqlConnection(connectString))
            {
                con.Open();
                using (var cmd = new SqlCommand(@"select id,name,description,hostname from SonoffDevices", con))
                {
                    using (var rdr = cmd.ExecuteReader())
                    {
                        while (rdr.Read())
                        {
                            int id = rdr.GetInt32(0);
                            string name = rdr.GetString(1);
                            string description = rdr.GetString(2);
                            string hostname = rdr.GetString(3);

                            devices.Add(new ISonoffDevice()
                            {
                                id = id,
                                name = name,
                                description = description,
                                hostname = hostname
                            });

                        }
                        rdr.Close();
                    }
                }
                con.Close();
            }
            return devices;
        }

        // GET: api/Sonoff/1/GetData/1 oct 2017
        [HttpGet("{deviceId}/GetData/{day}")]
        public IEnumerable<ISonoffDailyData> GetData(int deviceId, DateTime day)
        {
            DateTime dayStart = new DateTime(day.Year, day.Month, day.Day);
            DateTime dayEnd = dayStart + new TimeSpan(1,0,0,0,0);
            return GetDailyData(deviceId, dayStart, dayEnd);
        }

        // GET: api/Sonoff/1/GetData/1 oct 2017
        [HttpGet("{deviceId}/GetWeekData/{day}")]
        public IEnumerable<ISonoffDailyData> GetWeekData(int deviceId, DateTime day)
        {
            DateTime dayStart = new DateTime(day.Year, day.Month, day.Day);
            DateTime dayEnd = dayStart + new TimeSpan(7, 0, 0, 0, 0);
            return GetDailyData(deviceId, dayStart, dayEnd);
        }

        // GET: api/Sonoff/1/GetData/1 oct 2017
        private List<ISonoffDailyData> GetDailyData(int deviceId, DateTime dayFrom, DateTime dayTo)
        {
            List<ISonoffDailyData> data = new List<ISonoffDailyData>();

            using (var con = new SqlConnection(connectString))
            {
                con.Open();
                using (var cmd = new SqlCommand(@"select  timestamp, today, power from SonoffPower where deviceId = @deviceId and timestamp between @dateFrom and @dateTo", con))
                {
                    cmd.Parameters.Add("deviceId", SqlDbType.Int).Value = deviceId;
                    cmd.Parameters.Add("dateFrom", SqlDbType.Date).Value = dayFrom;
                    cmd.Parameters.Add("dateTo", SqlDbType.Date).Value = dayTo;
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
        public ISonoffDevice()
        {
            id = -1;
            name = "";
            description = "";
            hostname = "";
        }
    };

    public class ISonoffDailyData
    {
        public DateTime timestamp;
        public float today;
        public float power;
    };

    public class ISonoffSummaryData
    {
        public DateTime timestamp;
        public float today;
    };

}
