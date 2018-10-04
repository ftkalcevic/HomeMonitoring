using SonoffPowerMonitoringLib;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Diagnostics;
using System.Linq;
using System.ServiceProcess;
using System.Text;
using System.Threading.Tasks;
using SonoffPowerMonitoring.Properties;

namespace SonoffPowerMonitoring
{
    public partial class SonoffPowerMonitoring : ServiceBase
    {
        SonoffPower sonoff;

        public SonoffPowerMonitoring()
        {
            InitializeComponent();
            sonoff = new SonoffPower(Settings.Default.BrokerHost,
                                     Settings.Default.BrokerPort,
                                     Settings.Default.ConnectString);
        }

        protected override void OnStart(string[] args)
        {
            Trace.TraceInformation("Starting");
            try
            {
                sonoff.Start();
            }
            catch (Exception e)
            {
                Trace.TraceError("Failed to start - " + e.ToString());
            }
        }

        protected override void OnStop()
        {
            Trace.TraceInformation("Stop");
            try
            {
                sonoff.Stop();
            }
            catch (Exception e)
            {
                Trace.TraceError("Failed to stop - " + e.ToString());
            }
        }
    }
}
