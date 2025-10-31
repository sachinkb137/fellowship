import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Box, Typography } from "@mui/material";

interface Props {
  data?: Array<{ date: string; workers_count: number; total_wages: number; jobs_created: number }>;
}

const TimeSeriesChart: React.FC<Props> = ({ data }) => {
  // ✅ Sample fallback data if no data is passed from backend
  const sampleData = [
    { date: "Jan-2025", workers_count: 1200, total_wages: 850000, jobs_created: 420 },
    { date: "Feb-2025", workers_count: 1500, total_wages: 960000, jobs_created: 510 },
    { date: "Mar-2025", workers_count: 1800, total_wages: 1150000, jobs_created: 640 },
    { date: "Apr-2025", workers_count: 1400, total_wages: 900000, jobs_created: 500 },
    { date: "May-2025", workers_count: 2100, total_wages: 1320000, jobs_created: 720 },
    { date: "Jun-2025", workers_count: 1900, total_wages: 1250000, jobs_created: 680 },
  ];

  const finalData = data || sampleData;

  const points = finalData.map((d) => ({
    date: d.date,
    workers: d.workers_count,
    wages: d.total_wages,
    jobs: d.jobs_created,
  }));

  return (
    <Box sx={{ height: 300, bgcolor: "background.paper", p: 2, borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Last 6 Months – Worker Participation & Wages
      </Typography>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="workers" stroke="#1976d2" dot={false} name="Workers Count" />
          <Line type="monotone" dataKey="wages" stroke="#2e7d32" dot={false} name="Total Wages Paid" />
          <Line type="monotone" dataKey="jobs" stroke="#ff9800" dot={false} name="Jobs Created" />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default TimeSeriesChart;
