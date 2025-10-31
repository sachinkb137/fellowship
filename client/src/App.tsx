import React, { useState, useEffect } from "react";
import { ThemeProvider } from "@mui/material/styles";
import {
  Box,
  Container,
  Typography,
  CssBaseline,
  CircularProgress,
  Grid,
} from "@mui/material";
import { QueryClient, QueryClientProvider, useQuery } from "react-query";
import theme from "./theme";

import { MetricCard } from "./components/MetricCard";
import { DistrictSelector } from "./components/DistrictSelector";
import { VoiceControl } from "./components/VoiceControl";
import TimeSeriesChart from "./components/TimeSeriesChart";
import ComparativeView from "./components/ComparativeView";
import OfflineBanner from "./components/OfflineBanner";

import { District, DistrictSummary } from "./types";

const queryClient = new QueryClient();

function App() {
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [summary, setSummary] = useState<DistrictSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summaryQuery = useQuery(
    ["districtSummary", selectedDistrict?.id],
    async () => {
      if (!selectedDistrict) return null;
      const res = await fetch(`/api/v1/districts/${selectedDistrict.id}/summary`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    {
      enabled: !!selectedDistrict,
      retry: 2,
      staleTime: 1000 * 60 * 2,
      onSuccess: async (data) => {
        setSummary(data);
        try {
          const key = `summary:${selectedDistrict?.id}`;
          const { saveSummary } = await import("./lib/idb");
          await saveSummary(key, { ts: Date.now(), data });
        } catch (e) {
          console.debug("IndexedDB save error", e);
        }
      },
      onError: () => {
        setError("Failed to load district data");
      },
    }
  );

  useEffect(() => {
    setLoading(summaryQuery.isFetching);
  }, [summaryQuery.isFetching]);

  // Load cached summary if offline
  useEffect(() => {
    const tryLoadCached = async () => {
      if (!selectedDistrict || !summaryQuery.isError) return;
      try {
        const { loadSummary } = await import("./lib/idb");
        const cached = await loadSummary(`summary:${selectedDistrict.id}`);
        if (cached?.data) {
          setSummary(cached.data);
          setError("⚠ Showing cached data");
        }
      } catch (e) {
        console.debug("IndexedDB load error", e);
      }
    };
    tryLoadCached();
  }, [summaryQuery.isError, selectedDistrict]);

  // Auto detect district
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(
          `/api/v1/districts/nearby?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
        );
        if (!res.ok) return;
        const d = await res.json();
        setSelectedDistrict(d);
      } catch (e) {
        console.debug("Auto detect failed", e);
      }
    });
  }, []);

  const handleVoiceCommand = (command: string) => {
    if (command.toLowerCase().includes("refresh")) {
      summaryQuery.refetch();
    }
  };

  const playAudio = () => console.log("Audio triggered");

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />

        {/* HEADER */}
        <Box
          sx={{
            backgroundColor: "primary.main",
            color: "white",
            py: 2,
            boxShadow: 3,
            position: "sticky",
            top: 0,
            zIndex: 1100,
          }}
        >
          <Container maxWidth="sm" sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              🌾 Our Voice • Our Rights
            </Typography>

            {selectedDistrict && (
              <Box sx={{ minWidth: 130 }}>
                <DistrictSelector onSelect={setSelectedDistrict} compact />
              </Box>
            )}
          </Container>
        </Box>

        <OfflineBanner />

        {/* MAIN */}
        <Container maxWidth="sm" sx={{ py: 4 }}>
          {!selectedDistrict && (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="h4" sx={{ mb: 3 }}>
                MGNREGA Performance
              </Typography>
              <Typography sx={{ mb: 3 }}>
                Select your district to view detailed insights.
              </Typography>
              <DistrictSelector onSelect={setSelectedDistrict} />
            </Box>
          )}

          {selectedDistrict && !loading && summary && (
            <>
              <Box
                sx={{
                  mb: 3,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 2,
                  borderRadius: 3,
                  background: "#fafafa",
                  boxShadow: 2,
                }}
              >
                <Box>
                  <Typography variant="h5">{selectedDistrict.name_en}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedDistrict.name_local}
                  </Typography>
                </Box>

                <VoiceControl
                  text={`Current MGNREGA performance for ${selectedDistrict.name_en}`}
                  onCommand={handleVoiceCommand}
                />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <MetricCard
                    title="👥 Workers Helped"
                    value={summary.currentStats?.workers_count?.toLocaleString() || "—"}
                    explanation="People who received work this month"
                    trend="up"
                    comparison="above"
                    onPlayAudio={playAudio}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <MetricCard
                    title="🛠 Jobs Created"
                    value={summary.currentStats?.jobs_created?.toLocaleString() || "—"}
                    trend="up"
                    comparison="above"
                    explanation="New jobs created"
                    onPlayAudio={playAudio}
                  />
                </Grid>

                <Grid item xs={12}>
                  <MetricCard
                    title="💰 Total Wages Paid"
                    value={`₹${summary.currentStats?.total_wages?.toLocaleString() || "—"}`}
                    trend="up"
                    comparison="above"
                    explanation="Total amount paid"
                    onPlayAudio={playAudio}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TimeSeriesChart data={summary.timeSeries || []} />
                </Grid>

                <Grid item xs={12}>
                  <ComparativeView comparisons={summary.comparisons || []} />
                </Grid>
              </Grid>
            </>
          )}

          {loading && (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Typography color="error" align="center" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </Container>

        {/* FOOTER */}
        <Box
          sx={{
            width: "100%",
            py: 2,
            textAlign: "center",
            backgroundColor: "#f5f5f5",
            mt: 4,
            borderTop: "1px solid #ddd",
          }}
        >
          <Typography variant="caption">
            Built with ❤️ for Rural India • MGNREGA Transparency Portal
          </Typography>
        </Box>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
