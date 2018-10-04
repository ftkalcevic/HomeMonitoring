using SonoffPowerMonitoringLib;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Test
{
    public partial class Form1 : Form
    {
        SonoffPower sonoff;

        public Form1()
        {
            InitializeComponent();
            sonoff = new SonoffPower(@"server",1883, @"Persist Security Info=False;Integrated Security=SSPI; database = Electricity; server = Server\SqlExpress");
        }
        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            base.OnFormClosed(e);

            sonoff.Dispose();
            sonoff = null;
        }

        private void btnStart_Click(object sender, EventArgs e)
        {
            sonoff.Start();
        }

        private void btnStop_Click(object sender, EventArgs e)
        {
            sonoff.Stop();
        }
    }
}
