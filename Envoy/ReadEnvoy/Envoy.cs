using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace ReadEnvoy
{
    public class Envoy
    {
        const int PERIOD = 15 * 60; // 15 minutes
        const int MAX_OVERSHOOT = 25; // seconds; keep the time if we are withing 20 seconds, otherwise it probably means we missed the interval

        EnvoyDB db;
        string hostname;
        string token;

        public Envoy(string hostname, string token, string connectString)
        {
            this.hostname = hostname;
            this.token = token;
            db = new EnvoyDB(connectString);
        }

        public int ReadPower()
        {
            while (true)
            {
                Trace.TraceInformation($"Poll");

                int production_readingtime = 0;
                int production_whToday = 0;
                int consumption_readingtime = 0;
                int consumption_whToday = 0;

                long pollUnixSeconds = new DateTimeOffset(DateTime.Now).ToUnixTimeSeconds();
                string json = QueryJSON("https://" + hostname + "/production.json?details=0", token);
                long nowUnixSeconds = new DateTimeOffset(DateTime.Now).ToUnixTimeSeconds();
                dynamic data = JsonConvert.DeserializeObject(json);
                foreach (var d in data.production)
                {
                    if (d.type == "eim" && d.measurementType == "production")
                    {
                        production_readingtime = d.readingTime;
                        production_whToday = d.whToday;
                    }
                }
                foreach (var d in data.consumption)
                {
                    if (d.type == "eim" && d.measurementType == "total-consumption")
                    {
                        consumption_readingtime = d.readingTime;
                        consumption_whToday = d.whToday;
                    }
                }
                DateTime dt = DateTimeOffset.FromUnixTimeSeconds(production_readingtime).LocalDateTime;
                Trace.TraceInformation($"Reading:{production_readingtime} Now:{nowUnixSeconds} {dt.ToString()}: Production: {production_whToday} Consumption: {consumption_whToday}");

                // We want to align readings to 5 minute intervals
                // We need to set the timer in the service to happen just after the 5 minute mark
                // Do we use the production reading time or the current time?
                long current_period= (production_readingtime / PERIOD) * PERIOD;
                int overshoot = (int)(production_readingtime - current_period);

                Trace.TraceInformation($"time_t:    {production_readingtime}");
                Trace.TraceInformation($"mod:       {(production_readingtime / PERIOD) * PERIOD}");
                Trace.TraceInformation($"overshoot: {overshoot}");

                int next_time = (production_readingtime / PERIOD + 1) * PERIOD;
                Trace.TraceInformation($"next_time: {next_time}");

                int time_delay = next_time - production_readingtime;
                //time_delay -= (int)(nowUnixSeconds - pollUnixSeconds); // Remove time taken to do the poll


                int sleep = time_delay + 10;

                Trace.TraceInformation($"sleep:     {sleep}");
                Trace.TraceInformation($"eta:       {DateTime.Now.AddSeconds(sleep).ToString()}");

                if (overshoot < MAX_OVERSHOOT)
                {
                    // store time in localtime
                    long current_period_localtime = DateTimeOffset.FromUnixTimeSeconds(current_period).ToLocalTime().ToUnixTimeSeconds();

                    db.AddUsageData(current_period_localtime, consumption_whToday, production_whToday, PERIOD);
                }

                //Thread.Sleep( (time_delay+1) * 1000); // add one second to be sure we are past the interval
                return sleep; // conservative next time

            }
        }

        public void ReadInverters()
        {
            string json = QueryJSON("https://" + hostname + "/api/v1/production/inverters", token);
            dynamic data = JsonConvert.DeserializeObject(json);
            var x = data;
            foreach ( var inverter in data)
            {
                string serialNumber = inverter.serialNumber;
                int lastReportDate = inverter.lastReportDate;
                int lastReportWatts = inverter.lastReportWatts;
                int maxReportWatts = inverter.maxReportWatts;

                db.AddInverterReading(serialNumber, lastReportDate, lastReportWatts, maxReportWatts);
            }
        }

        string QueryJSON(string url, string token = null )
        {
            var cookies = new CookieContainer();
            var handler = new HttpClientHandler
            {
                ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true,
                CookieContainer = cookies,
                UseCookies = true
            };
            HttpClient client = new HttpClient(handler);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = client.GetAsync(url).Result;
            if ( response.IsSuccessStatusCode)
            {
                var content = response.Content;
                string json = content.ReadAsStringAsync().Result;
                Trace.TraceInformation(json);
                return json;
            }
            return null;
        }
    }
}
