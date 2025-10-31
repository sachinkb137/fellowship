import React, { useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  useTheme,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTranslation } from "react-i18next";

import { DistrictSummary } from "../types";

interface Props {
  summary: DistrictSummary;
}

const PieChartComparison: React.FC<Props> = ({ summary }) => {
  const theme = useTheme();
  const { i18n } = useTranslation();

  if (!summary?.currentStats) return null;

  const handleLanguageChange = (_: any, lang: string | null) => {
    if (lang) {
      i18n.changeLanguage(lang);
    }
  };

  return (
    <Box sx={{ py: 4, px: { xs: 1, sm: 0 } }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.8rem', sm: '2.2rem' } }}>
          🥧 Data Distribution
        </Typography>
        <ToggleButtonGroup
          value={i18n.language || "en"}
          exclusive
          onChange={handleLanguageChange}
          size="small"
          aria-label="Select language"
          sx={{
            "& .MuiToggleButton-root": {
              fontSize: "0.8rem",
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



      {/* Summary Stats */}
      <Paper
        elevation={2}
        sx={{
          p: 4,
          backgroundColor: "info.lighter",
          borderRadius: 3,
          mb: 4,
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="h6" color="text.secondary" sx={{ fontSize: '1.1rem', fontWeight: 600, mb: 1 }}>
                👥 Total Workers
              </Typography>
              <Typography variant="h4" fontWeight={800} color="primary.main" sx={{ fontSize: '2rem' }}>
                {(summary.currentStats.workers_count || 0).toLocaleString()}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="h6" color="text.secondary" sx={{ fontSize: '1.1rem', fontWeight: 600, mb: 1 }}>
                🛠 Total Jobs
              </Typography>
              <Typography variant="h4" fontWeight={800} color="success.main" sx={{ fontSize: '2rem' }}>
                {(summary.currentStats.jobs_created || 0).toLocaleString()}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="h6" color="text.secondary" sx={{ fontSize: '1.1rem', fontWeight: 600, mb: 1 }}>
                💰 Total Wages
              </Typography>
              <Typography variant="h4" fontWeight={800} color="warning.main" sx={{ fontSize: '2rem' }}>
                ₹{(summary.currentStats.total_wages || 0).toLocaleString()}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="h6" color="text.secondary" sx={{ fontSize: '1.1rem', fontWeight: 600, mb: 1 }}>
                ⏳ Pending Payments
              </Typography>
              <Typography variant="h4" fontWeight={800} color="error.main" sx={{ fontSize: '2rem' }}>
                ₹{(summary.currentStats.pending_payments || 0).toLocaleString()}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Pie Chart */}
      <Paper
        elevation={2}
        sx={{
          p: 3,
          borderRadius: 3,
          backgroundColor: "#fff",
        }}
      >
        <Typography variant="h6" fontWeight={700} mb={3} sx={{ fontSize: '1.2rem' }}>
          📊 Metrics Distribution
        </Typography>
        <Box sx={{ width: "100%", height: { xs: 300, sm: 400 } }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  {
                    name: "👥 Workers",
                    value: summary.currentStats.workers_count || 0,
                    fill: theme.palette.primary.main,
                  },
                  {
                    name: "🛠 Jobs",
                    value: summary.currentStats.jobs_created || 0,
                    fill: theme.palette.success.main,
                  },
                  {
                    name: "💰 Wages",
                    value: summary.currentStats.total_wages || 0,
                    fill: theme.palette.warning.main,
                  },
                  {
                    name: "⏳ Pending",
                    value: summary.currentStats.pending_payments || 0,
                    fill: theme.palette.error.main,
                  },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                <Tooltip
                  formatter={(value) => (value as number).toLocaleString()}
                />
                <Legend />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

    </Box>
  );
};

export default PieChartComparison;