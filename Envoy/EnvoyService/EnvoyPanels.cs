using ReadEnvoy;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Diagnostics;
using System.Linq;
using System.Security.Cryptography;
using System.ServiceProcess;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace EnvoyService
{
    public partial class EnvoyPanels : ServiceBase
    {
        Timer timer1;
        Timer timer2;
        Envoy envoy;

        public EnvoyPanels()
        {
            InitializeComponent();
        }

        protected override void OnStart(string[] args)
        {

            //if (!EventLog.SourceExists(this.ServiceName))
            //{
            //    EventSourceCreationData source = new EventSourceCreationData(this.ServiceName, "Application");
            //    EventLog.CreateEventSource(source);
            //}

            //EventLog log = new EventLog("Application");
            //log.WriteEntry(this.ServiceName + " starting.");

            try
            {
                Trace.TraceInformation("Starting " + this.ServiceName);

                Trace.TraceInformation(Properties.Settings.Default.EnvoyHostname);
                Trace.TraceInformation(Properties.Settings.Default.EnvoyToken);
                Trace.TraceInformation(Properties.Settings.Default.ConnectString);

                envoy = new Envoy(Properties.Settings.Default.EnvoyHostname,
                                  Properties.Settings.Default.EnvoyToken,
                                  Properties.Settings.Default.ConnectString);
                Trace.TraceInformation("new envoy done");
                timer1 = new Timer(onTimer1, null, 0, Properties.Settings.Default.PollPeriod * 1000);
                timer2 = new Timer(onTimer2, null, 1000, Timeout.Infinite);
                Trace.TraceInformation("Going " + this.ServiceName);
            }
            catch (Exception e)
            {
                Trace.TraceError("Exception: " + e.ToString());
            }
        }

        private void onTimer1(object state)
        {
            Trace.TraceInformation("Reading");

            if (!Monitor.IsEntered(envoy))
            {
                lock (envoy)
                {
                    try
                    {
                        envoy.ReadInverters();
                    }
                    catch (Exception e)
                    {
                        Trace.TraceError("onTimer1Exception: " + e.ToString());
                    }
                }
            }
        }

        private void onTimer2(object state)
        {
            if (!Monitor.IsEntered(envoy))
            {
                lock (envoy)
                {
                    try
                    {
                        int next_time = envoy.ReadPower();
                        if (next_time < 0)
                            next_time = 1;
                        timer2.Change( next_time * 1000, Timeout.Infinite );
                    }
                    catch (Exception e)
                    {
                        Trace.TraceError("onTimer2Exception: " + e.ToString());
                    }
                }
            }
        }

        protected override void OnStop()
        {
            Trace.TraceInformation("Stopping " + this.ServiceName);
            //EventLog log = new EventLog("Application");
            //log.WriteEntry(this.ServiceName + " stopping.");
            timer1.Change(Timeout.Infinite, Timeout.Infinite);
            timer1.Dispose();
            timer1 = null;
            envoy = null;
        }
    }
}
