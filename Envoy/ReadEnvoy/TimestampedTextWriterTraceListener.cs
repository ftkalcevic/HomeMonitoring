using System;
using System.Diagnostics;

namespace ReadEnvoy
{
    public class TimestampedTextWriterTraceListener : TextWriterTraceListener
    {
        public TimestampedTextWriterTraceListener(string file) : base(file) { }

        public override void TraceEvent(TraceEventCache eventCache, string source,
                                        TraceEventType eventType, int id, string message)
        {
            var ts = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");
            base.WriteLine($"{ts} [{eventType}] {source} ({id}): {message}");
            base.Flush();
        }

        public override void TraceEvent(TraceEventCache eventCache, string source,
                                        TraceEventType eventType, int id, string format, params object[] args)
        {
            TraceEvent(eventCache, source, eventType, id, string.Format(format, args));
        }
    }
}