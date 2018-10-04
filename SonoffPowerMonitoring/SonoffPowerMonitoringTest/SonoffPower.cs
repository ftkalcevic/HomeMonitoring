using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using uPLibrary.Networking.M2Mqtt;
using uPLibrary.Networking.M2Mqtt.Messages;

namespace SonoffPowerMonitoringLib
{
    public class SonoffPower: IDisposable
    {
        string brokerHostname;
        int brokerPort;
        MqttClient client;
        Regex exSourceFromTopic;
        SonoffPowerDB db;

        public SonoffPower(string host, int port, string connectString)
        {
            brokerHostname = host;
            brokerPort = port;
            db = new SonoffPowerDB(connectString);
            exSourceFromTopic = new Regex(@"^tele/(.*)/SENSOR$");

        }

        public void Stop()
        {
            System.Diagnostics.Debug.WriteLine("stop");
            client.Disconnect();
            client = null;
        }

        public void Start()
        {
            System.Diagnostics.Debug.WriteLine("start");
            client = new MqttClient(brokerHostname,brokerPort,false,null,null,MqttSslProtocols.None);
            client.MqttMsgPublishReceived += Client_MqttMsgPublishReceived;
            string clientId = Guid.NewGuid().ToString();

            // subscribe to the topic "/home/temperature" with QoS 2
            client.Subscribe(new string[] { "tele/+/SENSOR" }, new byte[] { MqttMsgBase.QOS_LEVEL_EXACTLY_ONCE });
            client.Connect(clientId);
        }

        private void Client_MqttMsgPublishReceived(object sender, MqttMsgPublishEventArgs e)
        {
            /*
            tele/sonoff1/STATE {"Time":"2018-10-02T07:34:46","Uptime":"0T00:00:25","Vcc":3.122,"POWER":"ON","Wifi":{"AP":1,"SSId":"WiFi-GGK6","RSSI":100,"APMac":"A4:CA:A0:59:B2:A0"}}
            tele/sonoff1/SENSOR {"Time":"2018-10-02T07:34:46","ENERGY":{"Total":0.047,"Yesterday":0.000,"Today":0.047,"Period":0,"Power":0,"Factor":0.00,"Voltage":243,"Current":0.000}}
             */
            string source = exSourceFromTopic.Match(e.Topic).Groups[1].Value;
            string msg =  System.Text.Encoding.UTF8.GetString(e.Message);

            System.Diagnostics.Debug.WriteLine(source + " " + msg);

            dynamic data = JsonConvert.DeserializeObject(msg);
            DateTime timestamp = data.Time;
            float? total = data.ENERGY.Total;
            float? yesterday = data.ENERGY.Yesterday;
            float? today = data.ENERGY.Today;
            float? period = data.ENERGY.Period;
            float? power = data.ENERGY.Power;
            float? factor = data.ENERGY.Factor;
            float? voltage = data.ENERGY.Voltage;
            float? current = data.ENERGY.Current;

            db.AddSonoffPowerReading(source, timestamp, total, yesterday, today, period, power, factor, voltage, current);
        }

        #region IDisposable Support
        private bool disposedValue = false; // To detect redundant calls

        protected virtual void Dispose(bool disposing)
        {
            if (!disposedValue)
            {
                if (disposing)
                {
                    if (client != null && client.IsConnected)
                        client.Disconnect();
                }

                // TODO: free unmanaged resources (unmanaged objects) and override a finalizer below.
                // TODO: set large fields to null.
                client = null;

                disposedValue = true;
            }
        }

        // TODO: override a finalizer only if Dispose(bool disposing) above has code to free unmanaged resources.
        // ~SonoffPower() {
        //   // Do not change this code. Put cleanup code in Dispose(bool disposing) above.
        //   Dispose(false);
        // }
         
        // This code added to correctly implement the disposable pattern.
        public void Dispose()
        {
            // Do not change this code. Put cleanup code in Dispose(bool disposing) above.
            Dispose(true);
            // TODO: uncomment the following line if the finalizer is overridden above.
            // GC.SuppressFinalize(this);
        }
        #endregion
    }
}
