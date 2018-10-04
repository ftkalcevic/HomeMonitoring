using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Net;
using System.Net.Http;
using Newtonsoft.Json;

namespace ReadEnvoy
{
    public class Envoy
    {
        EnvoyDB db;
        string hostname;
        string username;
        string password;

        public Envoy(string hostname, string username, string password, string connectString)
        {
            this.hostname = hostname;
            this.password = password;
            this.username = username;
            db = new EnvoyDB(connectString);
        }

        public void ReadPower()
        {
            string json = QueryJSON("http://" + hostname + "/production.json?details=0");
        }

        public void ReadInverters()
        {
            string json = QueryJSON("http://" + hostname + "/api/v1/production/inverters", username, password);
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

        string QueryJSON(string url, string username = null, string password = null )
        {
            HttpClientHandler handler = new HttpClientHandler();
            handler.Credentials = new NetworkCredential(username, password);
            HttpClient client = new HttpClient(handler);

            if ( username != null && password != null )
            {
                var byteArray = Encoding.ASCII.GetBytes(username+":"+password);
                client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", Convert.ToBase64String(byteArray));

            }
            var response = client.GetAsync(url).Result;
            if ( response.IsSuccessStatusCode)
            {
                var content = response.Content;
                string json = content.ReadAsStringAsync().Result;
                System.Diagnostics.Debug.WriteLine(json);
                return json;
            }
            return null;
        }
    }
}
