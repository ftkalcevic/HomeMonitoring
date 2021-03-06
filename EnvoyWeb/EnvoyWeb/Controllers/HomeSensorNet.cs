﻿using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace EnvoyWeb
{
    [Route("api/[controller]")]
    public class HomeSensorNet : Controller
    {
        string connectString;
        public HomeSensorNet()
        {
            connectString = Startup.Configuration["ApplicationSettings:ConnectString"];
        }

        // GET: api/HomeSensorNet/GetTanks
        [HttpGet("[action]")]
        public IEnumerable<ITank> GetTanks()
        {
            List<ITank> tanks = new List<ITank>();

            try
            {
                using (var con = new SqlConnection(connectString))
                {
                    con.Open();
                    using (var cmd = new SqlCommand(@"select DeviceId,DeviceName from TankWaterer_Tanks order by SortOrder", con))
                    {
                        using (var rdr = cmd.ExecuteReader())
                        {
                            while (rdr.Read())
                            {
                                string id = rdr.GetString(0);
                                string name = rdr.GetString(1);

                                tanks.Add(new ITank()
                                {
                                    DeviceId = id,
                                    DeviceName = name
                                });

                            }
                            rdr.Close();
                        }
                    }
                    con.Close();
                }
            }
            catch (Exception ex)
            {
                Trace.TraceError(ex.ToString());
            }

            return tanks;
        }

        // GET: api/HomeSensorNet/GetTankWater
        [HttpGet("[action]/{deviceId}/{week}/{date}")]
        public IEnumerable<ITankWaterer> GetTankWater(string deviceId, bool week, DateTime date)
        {
            List<ITankWaterer> water = new List<ITankWaterer>();

            try
            {
                DateTime dateStart, dateEnd;

                if (week)
                {
                    // Sunday will be the start of the week
                    int offset = (int)date.DayOfWeek;
                    dateStart = new DateTime(date.Year, date.Month, date.Day);
                    dateStart = dateStart.AddDays(-offset);
                    dateEnd = dateStart.AddDays(7);
                }
                else
                {
                    dateStart = new DateTime(date.Year, date.Month, 1);
                    dateEnd = dateStart.AddMonths(1);
                }

                using (var con = new SqlConnection(connectString))
                {
                    con.Open();
                    using (var cmd = new SqlCommand(@"select timestamp,Moisture1,Moisture2,TankVolume,TankFlow,TankOverflow,Temperature,Water24Hours from TankWaterer where DeviceId=@deviceId and timestamp >= @startDate and timestamp < @endDate order by timestamp", con))
                    {
                        cmd.Parameters.Add("deviceId", SqlDbType.VarChar).Value = deviceId;
                        cmd.Parameters.Add("startDate", SqlDbType.Date).Value = dateStart;
                        cmd.Parameters.Add("endDate", SqlDbType.Date).Value = dateEnd;

                        using (var rdr = cmd.ExecuteReader())
                        {
                            while (rdr.Read())
                            {
                                DateTime timestamp = rdr.GetDateTime(0);
                                int Moisture1 = rdr.GetInt32(1);
                                int Moisture2 = rdr.GetInt32(2);
                                int TankVolume = rdr.GetInt32(3);
                                float TankFlow = (float)rdr.GetDouble(4);
                                float TankOverflow = (float)rdr.GetDouble(5);
                                float Temperature = (float)rdr.GetDouble(6);
                                float Water24Hours = (float)rdr.GetDouble(7);

                                water.Add(new ITankWaterer()
                                {
                                    Timestamp = timestamp,
                                    Moisture1 = Moisture1,
                                    Moisture2 = Moisture2,
                                    TankVolume = TankVolume,
                                    TankFlow = TankFlow,
                                    TankOverflow = TankOverflow,
                                    Temperature = Temperature,
                                    Water24Hours = Water24Hours
                                });

                            }
                            rdr.Close();
                        }
                    }
                    con.Close();
                }
            }
            catch (Exception ex)
            {
                Trace.TraceError(ex.ToString());
            }

            return water;
        }

        // GET: api/HomeSensorNet/GetPotPlantStats
        [HttpGet("[action]/{deviceId}/{period}/{date}")]
        public IEnumerable<IPotPlantStats> GetPotPlantStats(string deviceId, int period, DateTime date)
        {
            List<IPotPlantStats> pp = new List<IPotPlantStats>();

            try
            {
                DateTime dateStart, dateEnd;

                if (period == 0) // week
                {
                    // Sunday will be the start of the week
                    int offset = (int)date.DayOfWeek;
                    dateStart = new DateTime(date.Year, date.Month, date.Day);
                    dateStart = dateStart.AddDays(-offset);
                    dateEnd = dateStart.AddDays(7);
                }
                else if (period == 1) // month
                {
                    dateStart = new DateTime(date.Year, date.Month, 1);
                    dateEnd = dateStart.AddMonths(1);
                }
                else // year
                {
                    dateStart = new DateTime(date.Year, 1, 1);
                    dateEnd = new DateTime(date.Year + 1, 1, 1);
                }

                using (var con = new SqlConnection(connectString))
                {
                    con.Open();
                    using (var cmd = new SqlCommand(@"
select timestamp,InternalTemperature,ExternalTemperature,VBat,Moisture 
from PotPlants 
where timestamp >= @startDate and timestamp < @endDate order by timestamp", con))
                    {
                        //cmd.Parameters.Add("deviceId", SqlDbType.VarChar).Value = deviceId;
                        cmd.Parameters.Add("startDate", SqlDbType.Date).Value = dateStart;
                        cmd.Parameters.Add("endDate", SqlDbType.Date).Value = dateEnd;

                        using (var rdr = cmd.ExecuteReader())
                        {
                            while (rdr.Read())
                            {
                                DateTime timestamp = rdr.GetDateTime(0);
                                float InternalTemperature = (float)rdr.GetDouble(1);
                                float ExternalTemperature = (float)rdr.GetDouble(2);
                                float VBat = (float)rdr.GetDouble(3);
                                int Moisture = rdr.GetInt32(4);

                                pp.Add(new IPotPlantStats()
                                {
                                    Timestamp = timestamp,
                                    Moisture = Moisture,
                                    InternalTemperature = InternalTemperature,
                                    ExternalTemperature = ExternalTemperature,
                                    VBat = VBat
                                });

                            }
                            rdr.Close();
                        }
                    }
                    con.Close();
                }
            }
            catch (Exception ex)
            {
                Trace.TraceError(ex.ToString());
            }

            return pp;
        }

        // GET: api/HomeSensorNet/GetRainGaugeStats
        [HttpGet("[action]/{period}/{date}")]
        public IEnumerable<IRainGaugeStats> GetRainGaugeStats(int period, DateTime date)
        {
            List<IRainGaugeStats> pp = new List<IRainGaugeStats>();

            try
            {
                DateTime dateStart, dateEnd;

                if (period == 0) // day
                {
                    dateStart = new DateTime(date.Year, date.Month, date.Day);
                    dateEnd = dateStart.AddDays(1);
                }
                else if (period == 1) // week
                {
                    // Sunday will be the start of the week
                    int offset = (int)date.DayOfWeek;
                    dateStart = new DateTime(date.Year, date.Month, date.Day);
                    dateStart = dateStart.AddDays(-offset);
                    dateEnd = dateStart.AddDays(7);
                }
                else if (period == 2) // month
                {
                    dateStart = new DateTime(date.Year, date.Month, 1);
                    dateEnd = dateStart.AddMonths(1);
                }
                else // year
                {
                    dateStart = new DateTime(date.Year, 1, 1);
                    dateEnd = new DateTime(date.Year + 1, 1, 1);
                }

                using (var con = new SqlConnection(connectString))
                {
                    con.Open();
                    using (var cmd = new SqlCommand(@"
select [timestamp],[millimeters],[temperature],[humidity],[vbat],[vsolar]
from RainGauge
where timestamp >= @startDate and timestamp < @endDate order by timestamp", con))
                    {
                        cmd.Parameters.Add("startDate", SqlDbType.Date).Value = dateStart;
                        cmd.Parameters.Add("endDate", SqlDbType.Date).Value = dateEnd;

                        using (var rdr = cmd.ExecuteReader())
                        {
                            while (rdr.Read())
                            {
                                DateTime timestamp = rdr.GetDateTime(0);
                                float millimeters = (float)rdr.GetDouble(1);
                                float temperature = (float)rdr.GetDouble(2);
                                float humidity = (float)rdr.GetDouble(3);
                                float vbat = (float)rdr.GetDouble(4);
                                float vsolar = (float)rdr.GetDouble(5);

                                pp.Add(new IRainGaugeStats()
                                {
                                    Timestamp = timestamp,
                                    millimeters = millimeters,
                                    temperature = temperature,
                                    humidity = humidity,
                                    vbat = vbat,
                                    vsolar = vsolar
                                });

                            }
                            rdr.Close();
                        }
                    }
                    con.Close();
                }
            }
            catch (Exception ex)
            {
                Trace.TraceError(ex.ToString());
            }

            return pp;
        }


        public class IRainGaugeStats
        {
            public float millimeters;
            public float temperature;
            public float humidity;
            public float vbat;
            public float vsolar;
            public DateTime Timestamp;

            public IRainGaugeStats()
            {
                millimeters = 0;
                temperature = 0;
                humidity = 0;
                vbat = 0;
                vsolar = 0;
                //Timestamp;
            }
        }
        public class IPotPlantStats
        {
            public int Moisture;
            public float InternalTemperature;
            public float ExternalTemperature;
            public float VBat;
            public DateTime Timestamp;

            public IPotPlantStats()
            {
                Moisture = 0;
                InternalTemperature = 0;
                ExternalTemperature = 0;
                VBat = 0;
                //Timestamp;
            }
        }
        public class ITankWaterer
        {
            public int Moisture1;
            public int Moisture2;
            public int TankVolume;
            public float TankFlow;
            public float TankOverflow;
            public float Temperature;
            public DateTime Timestamp;
            public float Water24Hours;

            public ITankWaterer()
            {
                Moisture1 = 0;
                Moisture2 = 0;
                TankVolume = 0;
                TankFlow = 0;
                TankOverflow = 0;
                Temperature = 0;
                Water24Hours = 0;
                //Timestamp;
            }
        }
        public class ITank
        {
            public string DeviceId;
            public string DeviceName;

            public ITank()
            {
                DeviceId = "";
                DeviceName = "";
            }
        }
    }
}
