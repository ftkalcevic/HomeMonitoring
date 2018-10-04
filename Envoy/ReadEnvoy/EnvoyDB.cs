using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Data;
using System.Data.SqlClient;

namespace ReadEnvoy
{
    public class EnvoyDB
    {
        string connectString;
        Dictionary<string, int> inverterMap;
        Dictionary<int, DateTime> lastUpdateMap;

        public EnvoyDB(string connectString)
        {
            inverterMap = new Dictionary<string, int>();
            lastUpdateMap = new Dictionary<int, DateTime>();

            this.connectString = connectString;
            ReadInverters();
        }

        private void ReadInverters()
        {
            using (var con = new SqlConnection(connectString))
            {
                con.Open();
                using (var cmd = new SqlCommand(@"Select I.inverterId,I.serialNumber,MAX(R.timestamp) timestamp
                                                  from Inverters I
                                                  left join InverterReadings R 
                                                        on I.inverterId = R.inverterId
                                                  group by I.inverterId,I.serialNumber", con))
                {
                    using (var rdr = cmd.ExecuteReader())
                    {
                        while ( rdr.Read() )
                        {
                            int inverterId = rdr.GetInt32(0);
                            string serialNumber = rdr.GetString(1);
                            DateTime timestamp = rdr.IsDBNull(2) ? DateTime.MinValue : rdr.GetDateTime(2);
                            inverterMap[serialNumber] = inverterId;
                            lastUpdateMap[inverterId] = timestamp;
                        }
                        rdr.Close();
                    }
                }
                con.Close();
            }
        }

        private int NewInverter(string serialNumber)
        {
            int id=0;
            using (var con = new SqlConnection(connectString))
            {
                con.Open();
                using (var cmd = new SqlCommand(@"INSERT INTO Inverters 
                                                        (serialNumber) 
                                                   OUTPUT Inserted.inverterId
                                                   VALUES (@serialNumber) ", con))
                {
                    cmd.Parameters.Add("@serialNumber",SqlDbType.VarChar).Value = serialNumber;
                    id = (int)cmd.ExecuteScalar();
                    inverterMap[serialNumber] = id;
                    lastUpdateMap[id] = DateTime.MinValue;
                }
                con.Close();
            }
            return id;
        }


        public void AddInverterReading(string serialNumber, int lastReportDate, int lastReportWatts,int maxReportWatts )
        {
            if ( !inverterMap.ContainsKey(serialNumber) )
            {
                // new inverter
                NewInverter(serialNumber);
            }
            int id = inverterMap[serialNumber];
            DateTime reportDate = DateTimeOffset.FromUnixTimeSeconds(lastReportDate).LocalDateTime;
            int percentage = 100 * lastReportWatts / maxReportWatts;

            if (lastUpdateMap[id] != reportDate)
            {
                using (var con = new SqlConnection(connectString))
                {
                    con.Open();
                    using (var cmd = new SqlCommand(@"insert into InverterReadings              
                                                        (inverterId,timestamp,watts,percentage) 
                                                  select @inverterId,@timestamp,@watts,@percentage
                                                  where not exists (select 1 from InverterReadings where inverterId=@inverterId and timestamp=@timestamp)", con))
                    {
                        cmd.Parameters.Add("@inverterId", SqlDbType.Int).Value = id;
                        cmd.Parameters.Add("@timestamp", SqlDbType.DateTime).Value = reportDate;
                        cmd.Parameters.Add("@watts", SqlDbType.Int).Value = lastReportWatts;
                        cmd.Parameters.Add("@percentage", SqlDbType.Int).Value = percentage;
                        cmd.ExecuteNonQuery();
                        lastUpdateMap[id] = reportDate;
                    }
                    con.Close();
                }
            }
        }
    }
}
