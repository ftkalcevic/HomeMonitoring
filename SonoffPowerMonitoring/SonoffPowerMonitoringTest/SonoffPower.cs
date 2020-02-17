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
using System.Diagnostics;

namespace SonoffPowerMonitoringLib
{
    public class SonoffPower: IDisposable
    {
        string brokerHostname;
        int brokerPort;
        MqttClient sonoff_client;
        MqttClient ar844_client;
        MqttClient antscale_client;
        Regex exSonoffSourceFromTopic;
        Regex exAr844SourceFromTopic;
        SonoffPowerDB db;

        public SonoffPower(string host, int port, string connectString)
        {
            brokerHostname = host;
            brokerPort = port;
            db = new SonoffPowerDB(connectString);
            exSonoffSourceFromTopic = new Regex(@"^tele/(.*)/SENSOR$");
            exAr844SourceFromTopic = new Regex(@"^tele/(.*)/ar844/data$");

        }

        public void Stop()
        {
            System.Diagnostics.Debug.WriteLine("stop");
            sonoff_client.Disconnect();
            sonoff_client = null;
            //ar844_client.Disconnect();
            //ar844_client = null;
            //antscale_client.Disconnect();
            //antscale_client = null;
        }

        public void Start()
        {
            System.Diagnostics.Debug.WriteLine("start");
            sonoff_client = new MqttClient(brokerHostname,brokerPort,false,null,null,MqttSslProtocols.None);
            sonoff_client.MqttMsgPublishReceived += Client_MqttMsgPublishReceived_Sonoff;
            string clientId = Guid.NewGuid().ToString();

            // subscribe to the topic "/home/temperature" with QoS 2
            sonoff_client.Subscribe(new string[] { "tele/+/SENSOR" }, new byte[] { MqttMsgBase.QOS_LEVEL_EXACTLY_ONCE });
            sonoff_client.Connect(clientId);


            //ar844_client = new MqttClient(brokerHostname, brokerPort, false, null, null, MqttSslProtocols.None);
            //ar844_client.MqttMsgPublishReceived += Client_MqttMsgPublishReceived_ar844;
            //clientId = Guid.NewGuid().ToString();

            //// subscribe to the topic "/home/temperature" with QoS 2
            //ar844_client.Subscribe(new string[] { "tele/+/ar844/data" }, new byte[] { MqttMsgBase.QOS_LEVEL_EXACTLY_ONCE });
            //ar844_client.Connect(clientId);

            //antscale_client = new MqttClient(brokerHostname, brokerPort, false, null, null, MqttSslProtocols.None);
            //antscale_client.MqttMsgPublishReceived += Client_MqttMsgPublishReceived_antscale;
            //clientId = Guid.NewGuid().ToString();

            //// subscribe to the topic "/home/temperature" with QoS 2
            //antscale_client.Subscribe(new string[] { "tele/scales/weight" }, new byte[] { MqttMsgBase.QOS_LEVEL_EXACTLY_ONCE });
            //antscale_client.Connect(clientId);
        }

        private void Client_MqttMsgPublishReceived_Sonoff(object sender, MqttMsgPublishEventArgs e)
        {
            try
            {
                /*
                tele/sonoff1/STATE {"Time":"2018-10-02T07:34:46","Uptime":"0T00:00:25","Vcc":3.122,"POWER":"ON","Wifi":{"AP":1,"SSId":"WiFi-GGK6","RSSI":100,"APMac":"A4:CA:A0:59:B2:A0"}}
                tele/sonoff1/SENSOR {"Time":"2018-10-02T07:34:46","ENERGY":{"Total":0.047,"Yesterday":0.000,"Today":0.047,"Period":0,"Power":0,"Factor":0.00,"Voltage":243,"Current":0.000}}
                 */
                string source = exSonoffSourceFromTopic.Match(e.Topic).Groups[1].Value;
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
            catch (Exception ex)
            {
                Trace.TraceError("Error Processing Sonoff message - " + ex.ToString());
            }
        }

        private void Client_MqttMsgPublishReceived_ar844(object sender, MqttMsgPublishEventArgs e)
        {
            try
            {
                /*
                tele/robotarm/ar844/data {"time": "2019-12-29T12:38:00Z","avg": 47.5,"min": 41.6,"max": 63.2,"weight": "A"}
                 */
                string source = exAr844SourceFromTopic.Match(e.Topic).Groups[1].Value;
                string msg = System.Text.Encoding.UTF8.GetString(e.Message);

                System.Diagnostics.Debug.WriteLine(source + " " + msg);

                dynamic data = JsonConvert.DeserializeObject(msg);
                DateTime timestamp = data.time;
                float? avg = data.avg;
                float? min = data.min;
                float? max = data.max;
                string weight = data.weight;

                db.AddAr844SoundReading(source, timestamp, avg, min, max, weight);
            }
            catch (Exception ex)
            {
                Trace.TraceError("Error Processing Ar844 message - " + ex.ToString());
            }
        }

        private void Client_MqttMsgPublishReceived_antscale(object sender, MqttMsgPublishEventArgs e)
        {
            try
            {
                /*
                
                 */
                string msg = System.Text.Encoding.UTF8.GetString(e.Message);

                System.Diagnostics.Debug.WriteLine(msg);

                dynamic data = JsonConvert.DeserializeObject(msg);
                DateTime timestamp = data.timestamp;
                int? userProfile = data.userProfile;
                float? weight = data.weight;
                string gender = data.gender;
                int age = data.age;
                int height = data.height;
                float? hydrationPercentage = data.hydrationPercentage;
                float? bodyFatPercentage = data.bodyFatPercentage;
                float? activeMetabolicRate = data.activeMetabolicRate;
                float? basalMetabolicRate = data.basalMetabolicRate;
                float? muscleMass = data.muscleMass;
                float? boneMass = data.boneMass;


                db.AddAntScaleReading(timestamp, userProfile, weight, gender, age, height, hydrationPercentage, bodyFatPercentage, activeMetabolicRate, basalMetabolicRate, muscleMass, boneMass);
            }
            catch (Exception ex)
            {
                Trace.TraceError("Error Processing Ant Scale message - " + ex.ToString());
            }

        }

        #region IDisposable Support
        private bool disposedValue = false; // To detect redundant calls

        protected virtual void Dispose(bool disposing)
        {
            if (!disposedValue)
            {
                if (disposing)
                {
                    if (sonoff_client != null && sonoff_client.IsConnected)
                        sonoff_client.Disconnect();
                }

                // TODO: free unmanaged resources (unmanaged objects) and override a finalizer below.
                // TODO: set large fields to null.
                sonoff_client = null;

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
