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

        // GET: api/Envoy/LiveData
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

        // GET: api/Envoy/LiveData
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
