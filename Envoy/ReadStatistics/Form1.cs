using ReadEnvoy;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace ReadStatistics
{
    public partial class Form1 : Form
    {
        Envoy re;
        Timer t;

        public Form1()
        {
            InitializeComponent();
            re = new Envoy("10.0.0.201", "envoy", "056704", @"Persist Security Info=False;Integrated Security=SSPI; database = Electricity; server = Server\SqlExpress");
            re.ReadInverters();

            t = new Timer();
            t.Interval = 5 * 60 * 1000;  // 5 minutes
            t.Tick += T_Tick;
            t.Start();
        }

        private void T_Tick(object sender, EventArgs e)
        {
            re.ReadInverters();
        }

        private void button1_Click(object sender, EventArgs e)
        {
            re.ReadPower();
        }

        private void button2_Click(object sender, EventArgs e)
        {
            re.ReadInverters();
        }
    }
}
