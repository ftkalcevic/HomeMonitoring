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
                    using (var cmd = new SqlCommand(@"select DeviceId,DeviceName from TankWaterer_Tanks", con))
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
                    using (var cmd = new SqlCommand(@"select timestamp,Moisture1,Moisture2,TankVolume,TankFlow,TankOverflow,Temperature from TankWaterer where DeviceId=@deviceId and timestamp >= @startDate and timestamp < @endDate order by timestamp", con))
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

                                water.Add(new ITankWaterer()
                                {
                                    Timestamp = timestamp,
                                    Moisture1 = Moisture1,
                                    Moisture2 = Moisture2,
                                    TankVolume = TankVolume,
                                    TankFlow = TankFlow,
                                    TankOverflow = TankOverflow,
                                    Temperature = Temperature
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

        public ITankWaterer()
        {
            Moisture1 = 0;
            Moisture2 = 0;
            TankVolume = 0;
            TankFlow = 0;
            TankOverflow = 0;
            Temperature = 0;
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