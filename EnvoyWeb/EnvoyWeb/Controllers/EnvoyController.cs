using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

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
        string token;

        public EnvoyController()
        {
            connectString = Startup.Configuration["ApplicationSettings:ConnectString"];
            userId = Startup.Configuration["ApplicationSettings:enphaseUserId"];
            apiKey = Startup.Configuration["ApplicationSettings:enphaseApiKey"];
            hostname = Startup.Configuration["ApplicationSettings:envoyHostname"];
            token = Startup.Configuration["ApplicationSettings:envoyToken"]; 
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
            string url = $@"https://{hostname}/production.json?details=0";
            ILivePower power = new ILivePower();

            try
            {
                var cookies = new CookieContainer();
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true,
                    CookieContainer = cookies,
                    UseCookies = true
                };
                var client = new HttpClient(handler);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Add a cookie
                //cookies.Add(new Uri($"https://{hostname}"), new Cookie("sessionId", "rPcxSI1LHk78hmzu7kvA8Rzc0XKTHsHY"));

                var responseMsg = client.GetAsync(url);
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
            catch(Exception ex)
            {
                Trace.TraceError(ex.ToString());
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
        [HttpGet("[action]/{systemId}")]
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
        [HttpGet("[action]/{systemId}/{date}")]
        public IEnphaseData [] EnphaseDayData(int systemId, DateTime date)
        {
            DateTime dtStart = new DateTime(date.Year, date.Month, date.Day);
            DateTime dtEnd = dtStart.AddDays(1);

            long start = ((DateTimeOffset)dtStart.ToUniversalTime()).ToUnixTimeSeconds();
            long startOfDay = start;
            long end = ((DateTimeOffset)dtEnd.ToUniversalTime()).ToUnixTimeSeconds();
            long now = ((DateTimeOffset)DateTime.Now.ToUniversalTime()).ToUnixTimeSeconds()-1;

            // Check the database first
            int dbRecords = 0;
            long dbMaxTime = 0;
            IEnphaseData[] data = new IEnphaseData[24 * 4];  // 15 min intervals
            try
            {
                using (var con = new SqlConnection(connectString))
                {
                    con.Open();
                    using (var cmd = new SqlCommand(@"select  time, consumed, produced 
                                                    from	EnphaseData
                                                    where   time >= @startTime and time < @endTime
                                                    order by time
                                                    ", con))
                    {
                        cmd.Parameters.Add("@startTime", SqlDbType.BigInt).SqlValue = start;
                        cmd.Parameters.Add("@endTime", SqlDbType.BigInt).SqlValue = end;

                        using (var rdr = cmd.ExecuteReader())
                        {
                            while (rdr.Read())
                            {
                                dbRecords++;
                                long time = rdr.GetInt64(0);
                                double consumed = rdr.GetDouble(1);
                                double produced = rdr.GetDouble(2);

                                data[(time - start) / (15*60)] = new IEnphaseData() { whConsumed = consumed, whProduced = produced };

                                if (time > dbMaxTime)
                                    dbMaxTime = time;
                            }
                            rdr.Close();
                        }
                    }
                    con.Close();
                }
            }
            catch (Exception ex)
            {
                // Just log and ignore the error.  We'll get data online.
                Trace.TraceError(ex.ToString());
            }


            // If we don't have all the data, go get it
            bool dontHaveAllData = (dbRecords == 0 || dbMaxTime < (end-15*60));
            bool moreDataToGet = (now - dbMaxTime) > 15 * 60;             // data is updated every 15 minutes
            if (dontHaveAllData && moreDataToGet)
            {
                if ( dbRecords > 0 )
                    start = dbMaxTime + 15*60;      // dbMaxtime is the start of the period
                dynamic consumptionData = null, productionData = null;

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
                    else
                    {
                        var content = response.Content;
                        string r = content.ReadAsStringAsync().Result;

                        Trace.TraceWarning("stats failed\n" + response.ToString() + "\n" + r);
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
                    // Read envoy consumption
                    string url;
                    if (dtEnd > DateTime.Now)
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
                    else
                    {
                        var content = response.Content;
                        string r = content.ReadAsStringAsync().Result;

                        Trace.TraceWarning("consumption_stats failed\n" + response.ToString() + "\n" + r);
                        Trace.TraceWarning($"url={url}\n");
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

                // Generated data has to be saved back to the database (time,cons,prod)
                List<DBEnphaseData> dbData = new List<DBEnphaseData>();
                if (productionData != null && consumptionData != null)
                {
                    long maxProdTime = productionData.intervals.Count > 0 ? productionData.intervals[productionData.intervals.Count - 1].end_at : 0;
                    long maxConsTime = consumptionData.intervals.Count > 0 ? consumptionData.intervals[consumptionData.intervals.Count - 1].end_at : 0; 
                    long maxTime = maxConsTime; // because consumption time is every 15 minutes (vs prod 5 min)  Math.Max(maxProdTime, maxConsTime);

                    // combine consumption and production data.
                    // consumption data is every 15minutes, production is every 5, so we sum the producton data.
                    // we assume if we get 1 lot of data, we get the lot (wrong - 5 min vs 15 min) and production has no 0 records
                    int p = 0, c = 0;
                    int t0 = (int)(start - startOfDay);
                    for (int t = t0; t < 24 * 60 * 60; t += 15 * 60)
                    {
                        long period = startOfDay + t;
                        int d = t / (15 * 60);
                        long periodEnd = period + 15 * 60;

                        double cons = 0;
                        double prod = 0;

                        while (p < productionData.intervals.Count &&
                                productionData.intervals[p].end_at <= periodEnd)
                        {
                            prod += (int)productionData.intervals[p].enwh;
                            p++;
                        }

                        while (c < consumptionData.intervals.Count &&
                            consumptionData.intervals[c].end_at <= periodEnd)
                        {
                            cons += (int)consumptionData.intervals[c].enwh;
                            c++;
                        }

                        data[d] = new IEnphaseData() { whConsumed = cons, whProduced = prod };
                        if (period < maxTime)
                            dbData.Add(new DBEnphaseData() { whConsumed = cons, whProduced = prod, time = period });

                        if (c == consumptionData.intervals.Count && p == productionData.intervals.Count)
                            break;
                    }
                }

                // Write new data to db
                if (dbData.Count > 0)
                {
                    try
                    {
                        using (var con = new SqlConnection(connectString))
                        {
                            con.Open();

                            using (var cmd = new SqlCommand(@"INSERT INTO  EnphaseData(  time, consumed, produced )
                                                                VALUES ( @time, @consumed, @produced )", con))
                            {
                                cmd.Parameters.Add("@time", SqlDbType.BigInt);
                                cmd.Parameters.Add("@consumed", SqlDbType.Float);
                                cmd.Parameters.Add("@produced", SqlDbType.Float);

                                foreach (DBEnphaseData d in dbData)
                                {
                                    cmd.Parameters["@time"].SqlValue = d.time;
                                    cmd.Parameters["@consumed"].SqlValue = d.whConsumed;
                                    cmd.Parameters["@produced"].SqlValue = d.whProduced;
                                    cmd.ExecuteNonQuery();
                                }
                            }
                            con.Close();
                        }
                    }
                    catch (Exception ex)
                    {
                        // Just log and ignore the error.  We'll get again next time.
                        Trace.TraceError(ex.ToString());
                    }
                }
            }

            return data;
        }

        // Get: api/Envoy/EnphaseDayDataDelete/#
        [HttpGet("[action]/{date}")]
        public bool EnphaseDayDataDelete(DateTime date)
        {
            DateTime dtStart = new DateTime(date.Year, date.Month, date.Day);
            DateTime dtEnd = dtStart.AddDays(1);

            long start = ((DateTimeOffset)dtStart.ToUniversalTime()).ToUnixTimeSeconds();
            long end = ((DateTimeOffset)dtEnd.ToUniversalTime()).ToUnixTimeSeconds();

            try
            {
                using (var con = new SqlConnection(connectString))
                {
                    con.Open();
                    using (var cmd = new SqlCommand(@"delete 
                                                      from	EnphaseData
                                                      where   time >= @startTime and time < @endTime
                                                    ", con))
                    {
                        cmd.Parameters.Add("@startTime", SqlDbType.BigInt).SqlValue = start;
                        cmd.Parameters.Add("@endTime", SqlDbType.BigInt).SqlValue = end;

                        cmd.ExecuteNonQuery();
                    }
                    con.Close();
                }
            }
            catch (Exception ex)
            {
                // Just log and ignore the error.
                Trace.TraceError(ex.ToString());
                return false;
            }
            return true;
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

    public class DBEnphaseData
    {
        public long time;
        public double whProduced;
        public double whConsumed;
        public DBEnphaseData()
        {
            time = 0;
            whProduced = 0;
            whConsumed = 0;
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
