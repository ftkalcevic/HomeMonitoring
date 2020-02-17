using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;

namespace EnvoyWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SoundRecordingsController : ControllerBase
    {
        string connectString;
        public SoundRecordingsController()
        {
            connectString = Startup.Configuration["ApplicationSettings:ConnectString"];
        }

        // GET: api/SoundRecordingsController/GetNoiseSamples
        [HttpGet("[action]/{deviceId}/{range}/{date}")]
        // Range: 0: day, 1: week, 2: month
        public IEnumerable<ISoundRecording> GetNoiseSamples(string deviceId, int range, DateTime date)
        {
            List<ISoundRecording> water = new List<ISoundRecording>();

            try
            {
                DateTime dateStart, dateEnd;

                if ( range == 1 )  // week
                {
                    // Sunday will be the start of the week
                    int offset = (int)date.DayOfWeek;
                    dateStart = new DateTime(date.Year, date.Month, date.Day);
                    dateStart = dateStart.AddDays(-offset);
                    dateEnd = dateStart.AddDays(7);
                }
                else if ( range == 2 )  // Month
                {
                    dateStart = new DateTime(date.Year, date.Month, 1);
                    dateEnd = dateStart.AddMonths(1);
                }
                else // if (range == 0) // Day
                {
                    dateStart = new DateTime(date.Year, date.Month, date.Day);
                    dateEnd = dateStart.AddDays(1);
                }

                using (var con = new SqlConnection(connectString))
                {
                    con.Open();
                    using (var cmd = new SqlCommand(@"select timestamp,deviceName,average,min,max,weight from SoundRecordings where DeviceName=@deviceName and timestamp >= @startDate and timestamp < @endDate order by timestamp", con))
                    {
                        cmd.Parameters.Add("deviceName", SqlDbType.VarChar).Value = deviceId;
                        cmd.Parameters.Add("startDate", SqlDbType.Date).Value = dateStart;
                        cmd.Parameters.Add("endDate", SqlDbType.Date).Value = dateEnd;

                        using (var rdr = cmd.ExecuteReader())
                        {
                            while (rdr.Read())
                            {
                                DateTime timestamp = rdr.GetDateTime(0);
                                string deviceName = rdr.GetString(1);
                                float average = (float)rdr.GetDouble(2);
                                float min = (float)rdr.GetDouble(3);
                                float max = (float)rdr.GetDouble(4);
                                string Weight = rdr.GetString(5);

                                water.Add(new ISoundRecording()
                                {
                                    timestamp = timestamp,
                                    deviceName = deviceName,
                                    average = average,
                                    min = min,
                                    max = max,
                                    weight = Weight
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

    public class ISoundRecording
    {
        public string deviceName;
        public DateTime timestamp;
        public float average;
        public float min;
        public float max;
        public string weight;

        public ISoundRecording()
        {
            deviceName = "";
            //timestamp;
            average=0;
            min = 0;
            max = 0;
            weight="";
        }
    }
}
