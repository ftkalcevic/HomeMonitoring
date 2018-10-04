using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Diagnostics;
using System.Linq;
using System.ServiceProcess;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using ReadEnvoy;

namespace EnvoyService
{
    public partial class EnvoyPanels : ServiceBase
    {
        Timer timer;
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
                Trace.TraceInformation(Properties.Settings.Default.EnvoyUsername);
                Trace.TraceInformation(Properties.Settings.Default.EnvoyPassword);
                Trace.TraceInformation(Properties.Settings.Default.ConnectString);

                envoy = new Envoy(Properties.Settings.Default.EnvoyHostname,
                                  Properties.Settings.Default.EnvoyUsername,
                                  Properties.Settings.Default.EnvoyPassword,
                                  Properties.Settings.Default.ConnectString);
                Trace.TraceInformation("new envoy done");
                timer = new Timer(onTimer, null, 0, Properties.Settings.Default.PollPeriod * 1000);
                Trace.TraceInformation("Going " + this.ServiceName);
            }
            catch (Exception e)
            {
                Trace.TraceError("Exception: " + e.ToString());
            }
        }

        private void onTimer(object state)
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
                        Trace.TraceError("onTimerException: " + e.ToString());
                    }
                }
            }
        }

        protected override void OnStop()
        {
            Trace.TraceInformation("Stopping " + this.ServiceName);
            //EventLog log = new EventLog("Application");
            //log.WriteEntry(this.ServiceName + " stopping.");
            timer.Change(Timeout.Infinite, Timeout.Infinite);
            timer.Dispose();
            timer = null;
            envoy = null;
        }
    }
}
