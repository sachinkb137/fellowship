import React, { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer as RC,
} from "recharts";
import { Box, Typography, ToggleButton, ToggleButtonGroup, Paper, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";
import { DistrictSummary } from "../types";

interface Props {
  data?: DistrictSummary["timeSeries"];
}

const CustomTooltip = (props: any) => {
  const { active, payload } = props;
  if (active && payload && payload.length) {
    return (
      <Paper
        sx={{
          p: 1.5,
          backgroundColor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
        }}
      >
        {payload.map((entry: any, index: number) => (
          <Typography key={index} variant="caption" sx={{ color: entry.color }}>
            <strong>{entry.name}:</strong>{" "}
            {entry.name === "Wages" ? `₹${entry.value}k` : entry.value.toLocaleString()}
          </Typography>
        ))}
      </Paper>
    );
  }
  return null;
};

const TimeSeriesChart: React.FC<Props> = ({ data }) => {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const [chartType, setChartType] = useState<"line" | "area">("line");
  const [metrics, setMetrics] = useState<("workers" | "wages" | "jobs")[]>([
    "workers",
    "wages",
    "jobs",
  ]);

  const handleLanguageChange = (_: any, lang: string | null) => {
    if (lang) {
      i18n.changeLanguage(lang);
    }
  };

  if (!data || data.length === 0) return null;

  const formatted = data.map((d) => ({
    date: d.date.split("-").slice(1).join("-"), // MM-DD format
    workers: d.workers_count,
    wages: Math.round(d.total_wages / 100000), // Convert to lakhs
    jobs: d.jobs_created,
  }));

  const handleMetricChange = (
    _: React.MouseEvent<HTMLElement>,
    newMetrics: ("workers" | "wages" | "jobs")[]
  ) => {
    if (newMetrics.length > 0) {
      setMetrics(newMetrics);
    }
  };

  const lineProps = {
    type: "monotone" as const,
    strokeWidth: 2.5,
    dot: { r: 4, fill: "white" },
    activeDot: { r: 6 },
    isAnimationActive: true,
  };

  const areaProps = {
    type: "monotone" as const,
    strokeWidth: 2,
    fillOpacity: 0.1,
    isAnimationActive: true,
  };

  const renderChart = () => {
    if (chartType === "area") {
      return (
        <AreaChart data={formatted}>
          <defs>
            <linearGradient id="colorWorkers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1976d2" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#1976d2" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorWages" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2e7d32" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff9800" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ff9800" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={theme.palette.text.secondary} />
          <YAxis tick={{ fontSize: 11 }} stroke={theme.palette.text.secondary} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: 20 }} />
          {metrics.includes("workers") && (
            <Area
              {...areaProps}
              dataKey="workers"
              stroke="#1976d2"
              fill="url(#colorWorkers)"
              name="👥 Workers"
            />
          )}
          {metrics.includes("wages") && (
            <Area
              {...areaProps}
              dataKey="wages"
              stroke="#2e7d32"
              fill="url(#colorWages)"
              name="💰 Wages (₹ Lakhs)"
            />
          )}
          {metrics.includes("jobs") && (
            <Area
              {...areaProps}
              dataKey="jobs"
              stroke="#ff9800"
              fill="url(#colorJobs)"
              name="🛠 Jobs"
            />
          )}
        </AreaChart>
      );
    }

    return (
      <LineChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={theme.palette.text.secondary} />
        <YAxis tick={{ fontSize: 11 }} stroke={theme.palette.text.secondary} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ paddingTop: 20 }} />
        {metrics.includes("workers") && (
          <Line {...lineProps} dataKey="workers" stroke="#1976d2" name="👥 Workers" />
        )}
        {metrics.includes("wages") && (
          <Line {...lineProps} dataKey="wages" stroke="#2e7d32" name="💰 Wages (₹ Lakhs)" />
        )}
        {metrics.includes("jobs") && (
          <Line {...lineProps} dataKey="jobs" stroke="#ff9800" name="🛠 Jobs" />
        )}
      </LineChart>
    );
  };

  return (
    <Paper elevation={1} sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            📊 Monthly Performance Trends
          </Typography>
          <ToggleButtonGroup
            value={i18n.language || "en"}
            exclusive
            onChange={handleLanguageChange}
            size="small"
            aria-label="Select language"
            sx={{
              "& .MuiToggleButton-root": {
                fontSize: "0.75rem",
                fontWeight: 600,
                px: 1,
                py: 0.5,
              }
            }}
          >
            <ToggleButton value="en" aria-label="English">
              EN
            </ToggleButton>
            <ToggleButton value="hi" aria-label="Hindi">
              HI
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
          <Box>
            <Typography variant="caption" fontWeight={600} display="block" mb={0.5}>
              Chart Type:
            </Typography>
            <ToggleButtonGroup
              value={chartType}
              exclusive
              onChange={(e, value) => value && setChartType(value)}
              size="small"
            >
              <ToggleButton value="line">Line</ToggleButton>
              <ToggleButton value="area">Area</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box>
            <Typography variant="caption" fontWeight={600} display="block" mb={0.5}>
              Show Metrics:
            </Typography>
            <ToggleButtonGroup
              value={metrics}
              onChange={handleMetricChange}
              size="small"
            >
              <ToggleButton value="workers">Workers</ToggleButton>
              <ToggleButton value="wages">Wages</ToggleButton>
              <ToggleButton value="jobs">Jobs</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      </Box>

      <Box sx={{ height: 350, width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </Box>

      <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          <strong>Note:</strong> Wages are displayed in lakhs (₹ 1,00,000 = 1 lakh)
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Data shows the last 3 months of performance for this district.
        </Typography>
      </Box>
    </Paper>
  );
};

export default TimeSeriesChart;
