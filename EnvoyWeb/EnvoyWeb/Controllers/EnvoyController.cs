using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using Newtonsoft.Json;

namespace EnvoyWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EnvoyController : ControllerBase
    {
        HttpClient client;
        string url = "http://10.0.0.201/production.json?details=0";

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

            HttpClient c = GetClient();
            var response = c.GetAsync(url).Result;
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
            return power;
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
            timestamp = DateTime.Now;
            wattsProduced = 0;
            wattsConsumed = 0;
            wattsNet = 0;
        }
    };
}
