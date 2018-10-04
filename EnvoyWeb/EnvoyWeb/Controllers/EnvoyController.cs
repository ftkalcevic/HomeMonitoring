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
        string url = "http://10.0.0.201/production.json?details=0";
        string connectString = @"Persist Security Info=False;Integrated Security=SSPI; database = Electricity; server = Server\SqlExpress";

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
        public LivePower LiveData()
        {
            LivePower power = new LivePower();

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
        public IEnumerable<PanelData> CurrentPanelData()
        {
            List<PanelData> panels = new List<PanelData>();

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

                            panels.Add(new PanelData()
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
    }

    public class LivePower
    {
        public DateTime timestamp;
        public double wattsProduced;
        public double wattsConsumed;
        public double wattsNet;
        public LivePower()
        {
            timestamp = DateTime.MinValue;
            wattsProduced = 0;
            wattsConsumed = 0;
            wattsNet = 0;
        }
    };
    public class PanelData
    {
        public DateTime timestamp;
        public int watts;
        public int percentage;
        public string serialNumber;
        public int inverterId;
        public PanelData()
        {
            timestamp = DateTime.MinValue;
            watts = 0;
            percentage = 0;
            serialNumber = "";
            inverterId = 0;
        }
    };
}
