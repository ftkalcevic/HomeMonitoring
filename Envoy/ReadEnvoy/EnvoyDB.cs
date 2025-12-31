using System;
using System.Collections;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Linq;

namespace ReadEnvoy
{
    public class EnvoyDB
    {
        const long SECONDS_PER_DAY = 24 * 60 * 60;

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

        public void AddUsageData(long time, int consumed, int produced, int period)
        {
            try
            {
                using (var con = new SqlConnection(connectString))
                {
                    con.Open();

                    // Get the last reading for today.
                    bool hasTodaysReading = false;
                    long last_time = 0;
                    double last_consumed = 0;
                    double last_produced = 0;
                    double last_consumed_daily_sum = 0;
                    double last_produced_daily_sum = 0;
                    using (var cmd = new SqlCommand(@"Select top 1 time, consumed, produced, produced_daily_sum, consumed_daily_sum from EnphaseData order by time desc", con))
                    {
                        using (var rdr = cmd.ExecuteReader())
                        {
                            if (rdr.Read())
                            {
                                last_time = rdr.GetInt64(0);
                                last_consumed = rdr.GetDouble(1);
                                last_produced = rdr.GetDouble(2);
                                last_produced_daily_sum = rdr.GetDouble(3);
                                last_consumed_daily_sum = rdr.GetDouble(4);
                                hasTodaysReading = true;    // maybe
                            }
                            rdr.Close();
                        }
                    }

                    // Is the reading today?
                    long start_of_day = (time / SECONDS_PER_DAY) * SECONDS_PER_DAY;
                    if (hasTodaysReading)
                    {
                        if ((last_time / SECONDS_PER_DAY) * SECONDS_PER_DAY != start_of_day)
                        {
                            hasTodaysReading = false;
                        }
                    }

                    // Do we need to fill gaps?
                    bool gapFill = false;
                    long gapStart = 0; 
                    if (!hasTodaysReading)
                    {
                        gapFill = true;
                        gapStart = start_of_day;
                    }
                    else if (time - last_time > period)
                    {
                        gapFill = true;
                        gapStart = last_time + period;
                    }


                    var table = new DataTable();
                    table.Columns.Add("time", typeof(long));
                    table.Columns.Add("consumed", typeof(double));
                    table.Columns.Add("produced", typeof(double));
                    table.Columns.Add("consumed_daily_sum", typeof(double));
                    table.Columns.Add("produced_daily_sum", typeof(double));
                    table.Columns.Add("gaps", typeof(int));


                    if (gapFill)
                    {
                        double consumed_diff = consumed - last_consumed_daily_sum;
                        double produced_diff = produced - last_produced_daily_sum;
                        int numGaps = (int)((time - gapStart) / period) + 1;
                        System.Diagnostics.Debug.WriteLine($"numGaps: {numGaps}");
                        for (long t = gapStart, i = 0; t <= time; t += period, i++)
                        {
                            var row = table.NewRow();
                            row["time"] = t;
                            row["consumed"] = consumed_diff / numGaps;
                            row["produced"] = produced_diff / numGaps;
                            row["consumed_daily_sum"] = last_consumed_daily_sum + consumed_diff * (i+1) / numGaps;
                            row["produced_daily_sum"] = last_produced_daily_sum + produced_diff * (i+1) / numGaps;
                            row["gaps"] = numGaps;
                            table.Rows.Add(row);
                        }
                    }
                    else
                    {
                        System.Diagnostics.Debug.WriteLine($"No gaps");
                        var row = table.NewRow();
                        row["time"] = time;
                        row["consumed"] = consumed - last_consumed_daily_sum;
                        row["produced"] = produced - last_produced_daily_sum;
                        row["consumed_daily_sum"] = consumed;
                        row["produced_daily_sum"] = produced;
                        row["gaps"] = 0;
                        table.Rows.Add(row);
                    }


                    using (var bulk = new SqlBulkCopy(con))
                    {
                        bulk.DestinationTableName = "EnphaseData";

                        bulk.ColumnMappings.Add("time", "time");
                        bulk.ColumnMappings.Add("consumed", "consumed");
                        bulk.ColumnMappings.Add("produced", "produced");
                        bulk.ColumnMappings.Add("consumed_daily_sum", "consumed_daily_sum");
                        bulk.ColumnMappings.Add("produced_daily_sum", "produced_daily_sum");
                        bulk.ColumnMappings.Add("gaps", "gaps");

                        bulk.WriteToServer(table);
                    }

                    con.Close();
                }
            }
            catch (Exception ex)
            {
                // Just log and ignore the error.  We'll get again next time.
                Trace.TraceError(ex.ToString());
            }
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
                    using (var cmd = new SqlCommand(@"
MERGE INTO InverterReadings AS target
USING (VALUES (@inverterId, @timestamp, @watts, @percentage)) AS source (inverterId, timestamp, watts, percentage)
    ON target.inverterId = source.inverterId
WHEN MATCHED THEN
    UPDATE SET 
        timestamp = source.timestamp,
        watts = source.watts,
        percentage = source.percentage
WHEN NOT MATCHED THEN
    INSERT (inverterId, timestamp, watts, percentage)
    VALUES (source.inverterId, source.timestamp, source.watts, source.percentage);", con))
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
