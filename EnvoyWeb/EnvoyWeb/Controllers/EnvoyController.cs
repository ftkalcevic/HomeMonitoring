using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using Newtonsoft.Json;
using System.Data;
using System.Data.SqlClient;

namespace EnvoyWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EnvoyController : ControllerBase
    {
        private static HttpClient client;
        string connectString;
        string userId;
        string apiKey;
        string hostname;

        public EnvoyController()
        {
            connectString = Startup.Configuration["ApplicationSettings:ConnectString"];
            userId = Startup.Configuration["ApplicationSettings:enphaseUserId"];
            apiKey = Startup.Configuration["ApplicationSettings:enphaseApiKey"];
            hostname = Startup.Configuration["ApplicationSettings:envoyHostname"];
        }

        private HttpClient GetClient()
        {
            if ( client == null )
            {
                client = new HttpClient();
            }
            return client;
        }

        // GET: api/Envoy/LiveData
        [HttpGet("[action]")]
        public ILivePower LiveData()
        {
            string url = $@"http://{hostname}/production.json?details=0";
            ILivePower power = new ILivePower();

            try
            {
                HttpClient c = GetClient();
                var responseMsg = c.GetAsync(url);
                var response = responseMsg.Result;
                if (response.IsSuccessStatusCode)
                {
                    var content = response.Content;
                    string json = content.ReadAsStringAsync().Result;

                    dynamic data = JsonConvert.DeserializeObject(json);
                    int readingTime = data.production[1].readingTime;
                    power.timestamp = DateTimeOffset.FromUnixTimeSeconds(readingTime).LocalDateTime;
                    power.wattsProduced = data.production[1].wNow;
                    power.wattsConsumed = data.consumption[0].wNow;
                    power.wattsNet = data.consumption[1].wNow;
                }
            }
            catch(Exception)
            {
                if (client != null)
                {
                    client.Dispose();
                    client = null;
                }
            }
            return power;
         }

        // GET: api/Envoy/CurrentPanelData
        [HttpGet("[action]")]
        public IEnumerable<IPanelData> CurrentPanelData()
        {
            List<IPanelData> panels = new List<IPanelData>();

            using (var con = new SqlConnection(connectString))
            {
                con.Open();
                using (var cmd = new SqlCommand(  @"select  i.inverterId,i.serialNumber, ir.timestamp, ir.watts, ir.percentage 
                                                    from	Inverters i
                                                    join	InverterReadings ir
                                                    on		i.inverterId = ir.inverterId
	                                                    and ir.timestamp = (select MAX(timestamp) from InverterReadings ir2 where ir2.inverterId = ir.inverterId)
                                                    ", con))
                {
                    using (var rdr = cmd.ExecuteReader())
                    {
                        while (rdr.Read())
                        {
                            int inverterId = rdr.GetInt32(0);
                            string serialNumber = rdr.GetString(1);
                            DateTime timestamp = rdr.GetDateTime(2);
                            int watts= rdr.GetInt32(3);
                            int percent = rdr.GetInt32(4);

                            panels.Add(new IPanelData()
                            {
                                inverterId = inverterId,
                                serialNumber = serialNumber,
                                timestamp = timestamp,
                                watts = watts,
                                percentage = percent
                            });

                        }
                        rdr.Close();
                    }
                }
                con.Close();
            }
            return panels;
        }

        // GET: api/Envoy/EnphaseSystem
        [HttpGet("[action]")]
        public int EnphaseSystem()
        {
            int systemId = -1;

            string url = $@"https://api.enphaseenergy.com/api/v2/systems?key={apiKey}&user_id={userId}";

            try
            {
                HttpClient c = GetClient();
                var responseMsg = c.GetAsync(url);
                var response = responseMsg.Result;
                if (response.IsSuccessStatusCode)
                {
                    var content = response.Content;
                    string json = content.ReadAsStringAsync().Result;

                    dynamic data = JsonConvert.DeserializeObject(json);
                    systemId = data.systems[0].system_id;
                }
            }
            catch (Exception)
            {
                if (client != null)
                {
                    client.Dispose();
                    client = null;
                }
            }
            return systemId;
        }

        // GET: api/Envoy/EnphaseSummary/#
        [HttpGet("EnphaseSummary/{systemId}")]
        public ILivePower EnphaseSummary(int systemId)
        {
            ILivePower power = new ILivePower();
            string url = $@"https://api.enphaseenergy.com/api/v2/systems/{systemId}/summary?key={apiKey}&user_id={userId}";

            try
            {
                HttpClient c = GetClient();
                var responseMsg = c.GetAsync(url);
                var response = responseMsg.Result;
                if (response.IsSuccessStatusCode)
                {
                    var content = response.Content;
                    string json = content.ReadAsStringAsync().Result;

                    dynamic data = JsonConvert.DeserializeObject(json);
                }
            }
            catch (Exception)
            {
                if (client != null)
                {
                    client.Dispose();
                    client = null;
                }
            }
            return power;
        }

        // GET: api/Envoy/EnphaseSummary/#
        [HttpGet("EnphaseDayData/{systemId}/{date}")]
        public IEnphaseData [] EnphaseDayData(int systemId, DateTime date)
        {
            DateTime dtStart = new DateTime(date.Year, date.Month, date.Day);
            DateTime dtEnd = dtStart.AddDays(1);

            long start = ((DateTimeOffset)dtStart.ToUniversalTime()).ToUnixTimeSeconds();
            long end = ((DateTimeOffset)dtEnd.ToUniversalTime()).ToUnixTimeSeconds()-1;

            // Check the database first

            dynamic consumptionData=null, productionData=null;
            try
            {
                // Read envoy consumption
                string url;
                if ( dtEnd > DateTime.Now )
                    url = $@"https://api.enphaseenergy.com/api/v2/systems/{systemId}/consumption_stats?key={apiKey}&user_id={userId}&start_at={start}";
                else
                    url = $@"https://api.enphaseenergy.com/api/v2/systems/{systemId}/consumption_stats?key={apiKey}&user_id={userId}&start_at={start}&end_at={end}";

                HttpClient hc = GetClient();
                var responseMsg = hc.GetAsync(url);
                var response = responseMsg.Result;
                if (response.IsSuccessStatusCode)
                {
                    var content = response.Content;
                    string json = content.ReadAsStringAsync().Result;

                    consumptionData = JsonConvert.DeserializeObject(json);
                }
            }
            catch (Exception)
            {
                if (client != null)
                {
                    client.Dispose();
                    client = null;
                }
            }

            try
            {
                // Read envoy production
                string url;
                if (dtEnd > DateTime.Now)
                    url = $@"https://api.enphaseenergy.com/api/v2/systems/{systemId}/stats?key={apiKey}&user_id={userId}&start_at={start}";
                else
                    url = $@"https://api.enphaseenergy.com/api/v2/systems/{systemId}/stats?key={apiKey}&user_id={userId}&start_at={start}&end_at={end}";

                HttpClient hc = GetClient();
                var responseMsg = hc.GetAsync(url);
                var response = responseMsg.Result;
                if (response.IsSuccessStatusCode)
                {
                    var content = response.Content;
                    string json = content.ReadAsStringAsync().Result;

                    productionData = JsonConvert.DeserializeObject(json);
                }
            }
            catch (Exception)
            {
                if (client != null)
                {
                    client.Dispose();
                    client = null;
                }
            }

            // combine consumption and production data.
            // consumption data is every 15minutes, production is every 5, so we sum the producton data.
            // we assume if we get 1 lot of data, we get the lot (wrong - 5 min vs 15 min) and production has no 0 records
            IEnphaseData[] data = new IEnphaseData[24 * 4];  // 15 min intervals
            int p = 0, c = 0, d = 0;
            for ( int t = 0; t < 24*60*60; t += 15*60 )
            {
                long period = start + t;
                long periodEnd = period + 15*60;

                double cons = 0;
                double prod = 0;

                if ( productionData != null )
                    while ( p < productionData.intervals.Count &&
                            productionData.intervals[p].end_at <= periodEnd )
                    {
                        prod += (int)productionData.intervals[p].enwh;
                        p++;
                    }

                if (consumptionData != null)
                    while (c < consumptionData.intervals.Count &&
                        consumptionData.intervals[c].end_at <= periodEnd)
                    {
                        cons += (int)consumptionData.intervals[c].enwh;
                        c++;
                    }

                data[d] = new IEnphaseData() { whConsumed = cons, whProduced = prod };
                d++;
            }

            return data;
        }
    }

    public class ILivePower
    {
        public DateTime timestamp;
        public double wattsProduced;
        public double wattsConsumed;
        public double wattsNet;
        public ILivePower()
        {
            timestamp = DateTime.MinValue;
            wattsProduced = 0;
            wattsConsumed = 0;
            wattsNet = 0;
        }
    };

    public class IEnphaseData
    {
        public double whProduced;
        public double whConsumed;
        public IEnphaseData()
        {
            whProduced = 0;
            whConsumed = 0;
        }
    };

    public class IPanelData
    {
        public DateTime timestamp;
        public int watts;
        public int percentage;
        public string serialNumber;
        public int inverterId;
        public IPanelData()
        {
            timestamp = DateTime.MinValue;
            watts = 0;
            percentage = 0;
            serialNumber = "";
            inverterId = 0;
        }
    };
}
