using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Data;
using System.Data.SqlClient;

namespace SonoffPowerMonitoringLib
{
    class SonoffPowerDB
    {
        string connectString;
        Dictionary<string, int> deviceMap;

        public SonoffPowerDB(string connectString)
        {
            this.connectString = connectString;
            this.deviceMap = new Dictionary<string, int>();

            ReadDevices();
        }

        private void ReadDevices()
        {
            using (var con = new SqlConnection(connectString))
            {
                con.Open();
                using (var cmd = new SqlCommand(@"Select	id, [name]
                                                  from      SonoffDevices", con))
                {
                    using (var rdr = cmd.ExecuteReader())
                    {
                        while (rdr.Read())
                        {
                            int deviceId = rdr.GetInt32(0);
                            string deviceName = rdr.GetString(1);
                            deviceMap[deviceName] = deviceId;
                        }
                        rdr.Close();
                    }
                }
                con.Close();
            }
        }
        private int NewDevice(string deviceName)
        {
            int id = 0;
            using (var con = new SqlConnection(connectString))
            {
                con.Open();
                using (var cmd = new SqlCommand(@"INSERT INTO SonoffDevices 
                                                        ([name]) 
                                                   OUTPUT Inserted.id
                                                   VALUES (@deviceName) ", con))
                {
                    cmd.Parameters.Add("@deviceName", SqlDbType.VarChar).Value = deviceName;
                    id = (int)cmd.ExecuteScalar();
                    deviceMap[deviceName] = id;
                }
                con.Close();
            }
            return id;
        }

        public void AddSonoffPowerReading(string deviceName,
                                          DateTime timestamp,
                                          float? total,
                                          float? yesterday,
                                          float? today,
                                          float? period,
                                          float? power,
                                          float? factor,
                                          float? voltage,
                                          float? current )
        {
            if (!deviceMap.ContainsKey(deviceName))
            {
                // new inverter
                NewDevice(deviceName);
            }
            int id = deviceMap[deviceName];

            using (var con = new SqlConnection(connectString))
            {
                con.Open();
                using (var cmd = new SqlCommand(@"insert into SonoffPower
                                                        (deviceId,timestamp,total,yesterday,today,period,power,factor,voltage,[current]) 
                                                  select @deviceId,@timestamp,@total,@yesterday,@today,@period,@power,@factor,@voltage,@current
                                                  where not exists (select 1 from SonoffPower where deviceId=@deviceId and timestamp=@timestamp)", con))
                {
                    cmd.Parameters.Add("@deviceId", SqlDbType.Int).Value = id;
                    cmd.Parameters.Add("@timestamp", SqlDbType.DateTime).Value = timestamp;
                    cmd.Parameters.Add("@total", SqlDbType.Float).Value = total;
                    cmd.Parameters.Add("@yesterday", SqlDbType.Float).Value = yesterday;
                    cmd.Parameters.Add("@today", SqlDbType.Float).Value = today;
                    if ( period == null )
                        cmd.Parameters.Add("@period", SqlDbType.Float).Value = DBNull.Value;
                    else
                        cmd.Parameters.Add("@period", SqlDbType.Float).Value = period;
                    cmd.Parameters.Add("@power", SqlDbType.Float).Value = power;
                    cmd.Parameters.Add("@factor", SqlDbType.Float).Value = factor;
                    cmd.Parameters.Add("@voltage", SqlDbType.Float).Value = voltage;
                    cmd.Parameters.Add("@current", SqlDbType.Float).Value = current;
                    cmd.ExecuteNonQuery();
                }
                con.Close();
            }
        }

        public void AddAr844SoundReading(string deviceName,
                                          DateTime timestamp,
                                          float? avg,
                                          float? min,
                                          float? max,
                                          string weight)
        {
            using (var con = new SqlConnection(connectString))
            {
                con.Open();
                using (var cmd = new SqlCommand(@"insert into SoundRecordings
                                                        ([deviceName],[timestamp],[average],[min],[max],weight) 
                                                  select @deviceName,@timestamp,@avg,@min,@max,@weight
                                                  where not exists (select 1 from SoundRecordings where [deviceName]=@deviceName and [timestamp]=@timestamp)", con))
                {
                    cmd.Parameters.Add("@deviceName", SqlDbType.VarChar).Value = deviceName;
                    cmd.Parameters.Add("@timestamp", SqlDbType.DateTime).Value = timestamp;
                    cmd.Parameters.Add("@avg", SqlDbType.Float).Value = avg;
                    cmd.Parameters.Add("@min", SqlDbType.Float).Value = min;
                    cmd.Parameters.Add("@max", SqlDbType.Float).Value = max;
                    cmd.Parameters.Add("@weight", SqlDbType.VarChar).Value = weight;
                    cmd.ExecuteNonQuery();
                }
                con.Close();
            }
        }

        public void AddAntScaleReading(DateTime timestamp, int? userProfile, float? weight, string gender, int age, int height, float? hydrationPercentage, float? bodyFatPercentage, float? activeMetabolicRate, float? basalMetabolicRate, float? muscleMass, float? boneMass)
        {
            using (var con = new SqlConnection(connectString))
            {
                con.Open();
                using (var cmd = new SqlCommand(@"
INSERT INTO [dbo].[Weight]
           ([timestamp]
           ,[userProfile]
           ,[weight]
           ,[gender]
           ,[age]
           ,[height]
           ,[hydrationPercentage]
           ,[bodyFatPercentage]
           ,[activeMetabolicRate]
           ,[basalMetabolicRate]
           ,[muscleMass]
           ,[boneMass])
     SELECT
            @timestamp,
            @userProfile,
            @weight,
            @gender,
            @age,
            @height,
            @hydrationPercentage,
            @bodyFatPercentage,
            @activeMetabolicRate,
            @basalMetabolicRate,
            @muscleMass,
            @boneMass
    where not exists (select 1 from [dbo].[Weight] where [userProfile]=@userProfile and [timestamp]=@timestamp)", con))
                {
                    cmd.Parameters.Add("@timestamp", SqlDbType.DateTime).Value = timestamp;
                    cmd.Parameters.Add("@userProfile", SqlDbType.Int).Value = userProfile;
                    cmd.Parameters.Add("@weight", SqlDbType.Float).Value = weight;
                    cmd.Parameters.Add("@gender", SqlDbType.VarChar).Value = gender;
                    cmd.Parameters.Add("@age", SqlDbType.Int).Value = age;
                    cmd.Parameters.Add("@height", SqlDbType.Int).Value = height;
                    cmd.Parameters.Add("@hydrationPercentage", SqlDbType.Float).Value = hydrationPercentage;
                    cmd.Parameters.Add("@bodyFatPercentage", SqlDbType.Float).Value = bodyFatPercentage;
                    cmd.Parameters.Add("@activeMetabolicRate", SqlDbType.Float).Value = activeMetabolicRate;
                    cmd.Parameters.Add("@basalMetabolicRate", SqlDbType.Float).Value = basalMetabolicRate;
                    cmd.Parameters.Add("@muscleMass", SqlDbType.Float).Value = muscleMass;
                    cmd.Parameters.Add("@boneMass", SqlDbType.Float).Value = boneMass;
                    cmd.ExecuteNonQuery();
                }
                con.Close();
            }
        }
    }
}
