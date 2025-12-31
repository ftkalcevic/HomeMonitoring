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
            re = new Envoy("10.0.0.216", 
                            "TOKEN GOES HERE",
                            @"Persist Security Info=False;Integrated Security=SSPI; database = Electricity; server = Server");
            re.ReadInverters();

            t = new Timer();
            t.Interval = 1000;  // 1 sec
            t.Tick += T_Tick;
            t.Start();
        }

        private void T_Tick(object sender, EventArgs e)
        {
            int del = re.ReadPower();
            if (del < 0)
                del = 1;
            t.Interval = del * 1000;
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
