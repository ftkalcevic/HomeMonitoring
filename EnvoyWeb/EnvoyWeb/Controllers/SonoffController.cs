using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Data;
using System.Data.SqlClient;

namespace EnvoyWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SonoffController : ControllerBase
    {
        string connectString = @"Persist Security Info=False;Integrated Security=SSPI; database = Electricity; server = Server\SqlExpress";

        // GET: api/Sonoff/GetDevices
        [HttpGet("[action]")]
        public IEnumerable<SonoffDevice> GetDevices()
        {
            List<SonoffDevice> devices = new List<SonoffDevice>();

            using (var con = new SqlConnection(connectString))
            {
                con.Open();
                using (var cmd = new SqlCommand(@"select id,name,description,hostname from SonoffDevices", con))
                {
                    using (var rdr = cmd.ExecuteReader())
                    {
                        while (rdr.Read())
                        {
                            int id = rdr.GetInt32(0);
                            string name = rdr.GetString(1);
                            string description = rdr.GetString(2);
                            string hostname = rdr.GetString(3);

                            devices.Add(new SonoffDevice()
                            {
                                id = id,
                                name = name,
                                description = description,
                                hostname = hostname
                            });

                        }
                        rdr.Close();
                    }
                }
                con.Close();
            }
            return devices;
        }

        //// GET: api/Sonoff/5
        //[HttpGet("{id}", Name = "Get")]
        //public string Get(int id)
        //{
        //    return "value";
        //}

        //// POST: api/Sonoff
        //[HttpPost]
        //public void Post([FromBody] string value)
        //{
        //}

        //// PUT: api/Sonoff/5
        //[HttpPut("{id}")]
        //public void Put(int id, [FromBody] string value)
        //{
        //}

        //// DELETE: api/ApiWithActions/5
        //[HttpDelete("{id}")]
        //public void Delete(int id)
        //{
        //}
    }

    
    public class SonoffDevice
    {
        public int id;
        public string name;
        public string description;
        public string hostname;
        public SonoffDevice()
        {
            id = -1;
            name = "";
            description = "";
            hostname = "";
        }
    };

}
