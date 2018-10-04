using System;
using System.Collections.Generic;
using System.Linq;
using System.ServiceProcess;
using System.Text;
using System.Threading.Tasks;
using System.Diagnostics;

namespace SonoffPowerMonitoring
{
    static class Program
    {
        /// <summary>
        /// The main entry point for the application.
        /// </summary>
        static void Main()
        {
            try
            {
                ServiceBase[] ServicesToRun;
                ServicesToRun = new ServiceBase[]
                {
                    new SonoffPowerMonitoring()
                };
                ServiceBase.Run(ServicesToRun);
            }
            catch (Exception e)
            {
                Trace.TraceError("Failed to run service - " + e.ToString());
            }
        }
    }
}
