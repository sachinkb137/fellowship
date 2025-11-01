import React, { useState, useEffect, useCallback } from "react";
import { ThemeProvider } from "@mui/material/styles";
import {
  Box,
  Container,
  Typography,
  CssBaseline,
  CircularProgress,
  Grid,
  Alert,
  Button,
  Fade,
  Paper,
} from "@mui/material";
import { QueryClient, QueryClientProvider, useQuery } from "react-query";
import theme from "./theme";
import { useTranslation } from "react-i18next";

import { MetricCard } from "./components/MetricCard";
import { DistrictSelector } from "./components/DistrictSelector";
import { VoiceControl } from "./components/VoiceControl";
import TimeSeriesChart from "./components/TimeSeriesChart";
import ComparativeView from "./components/ComparativeView";
import OfflineBanner from "./components/OfflineBanner";
import GeolocationPrompt from "./components/GeolocationPrompt";
import LanguageToggle from "./components/LanguageToggle";
import FloatingLanguageSelector from "./components/FloatingLanguageSelector";
import { NavBar } from "./components/NavBar";
import PieChartComparison from "./components/PieChartComparison";
import { District, DistrictSummary } from "./types";
import { fetchWithRetry } from "./lib/fetchWithRetry";
import { saveSummary, loadSummary } from "./lib/idb";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { geolocationService } from "./services/GeolocationService";
import SpeechService from "./services/SpeechService";
import RefreshIcon from "@mui/icons-material/Refresh";
import LocationOnIcon from "@mui/icons-material/LocationOn";

const queryClient = new QueryClient();

// ✅ Use the global API URL set in vite.config.ts
const API_BASE_URL =
  typeof __API_URL__ !== "undefined"
    ? __API_URL__
    : "http://localhost:3000";

function AppInner() {
  const { t, i18n } = useTranslation();
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [summary, setSummary] = useState<DistrictSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGeolocation, setShowGeolocation] = useState(false);
  const [geolocationAttempted, setGeolocationAttempted] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // ✅ Data fetching with offline fallback
  const summaryQuery = useQuery(
    ["districtSummary", selectedDistrict?.id],
    async () => {
      if (!selectedDistrict) return null;
      const res = await fetchWithRetry(
        `/api/districts/${selectedDistrict.id}/summary`
      );
      return res.json();
    },
    {
      enabled: !!selectedDistrict,
      retry: 2,
      staleTime: 1000 * 60 * 2,
      onSuccess: async (data: DistrictSummary) => {
        setSummary(data);
        setError(null);
        try {
          await saveSummary(`summary:${selectedDistrict?.id}`, {
            ts: Date.now(),
            data,
          });
        } catch {}
      },
      onError: async () => {
        setError("⚠ Showing cached data (live API failed)");
        if (!selectedDistrict) return;
        try {
          const cached = await loadSummary(`summary:${selectedDistrict.id}`);
          if (cached?.data) setSummary(cached.data);
        } catch {}
      },
    }
  );

  // ✅ Geolocation auto-detect
  useEffect(() => {
    if (geolocationAttempted || selectedDistrict) return;

    const checkGeolocation = async () => {
      if (!geolocationService.isSupported()) {
        setGeolocationAttempted(true);
        return;
      }

      const savedPreference = localStorage.getItem("geolocation_preference");
      if (savedPreference === "skip") {
        setGeolocationAttempted(true);
        return;
      }

      const permission = await geolocationService.checkPermission();
      if (permission === "granted" || permission === "prompt") {
        setShowGeolocation(true);
      }

      setGeolocationAttempted(true);
    };

    checkGeolocation();
  }, [geolocationAttempted, selectedDistrict]);

  // ✅ Voice synthesis handler
  const playAudio = useCallback(async (text?: string) => {
    try {
      const currentLang = i18n.language || "en";
      await SpeechService.speak(text || "Showing data", currentLang);
    } catch (error) {
      console.error("Speech error:", error);
    }
  }, [i18n.language]);

  // ✅ Location detection (manual trigger)
  const handleAutoDetect = async () => {
    setIsLoadingLocation(true);
    try {
      const district = await geolocationService.detectDistrict();
      if (district) {
        setSelectedDistrict(district);
      } else {
        setError("Could not detect your location. Please select manually.");
      }
    } catch (err) {
      setError("Location detection failed. Please try again or select manually.");
    } finally {
      setIsLoadingLocation(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#fafafa" }}>
      {/* Header */}
      <Box
        sx={{
          backgroundColor: "primary.main",
          color: "white",
          py: 3,
          px: 2,
          boxShadow: 4,
          position: "sticky",
          top: 0,
          zIndex: 1100,
        }}
      >
        <Box
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}
        >
          <Box>
            <Typography variant="h4" fontWeight={800}>
              🌾 {t("appTitle") || "Our Voice • Our Rights"}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              MGNREGA Transparency Portal
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <LanguageToggle />
            {selectedDistrict && (
              <Button
                size="large"
                onClick={() => setSelectedDistrict(null)}
                sx={{ color: "white", fontWeight: 600 }}
              >
                Change District
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      <OfflineBanner />

      {/* Geolocation modal */}
      <GeolocationPrompt
        open={showGeolocation}
        onDistrictDetected={(district) => {
          setSelectedDistrict(district);
          setShowGeolocation(false);
        }}
        onSkip={() => {
          localStorage.setItem("geolocation_preference", "skip");
          setShowGeolocation(false);
        }}
      />

      <Container sx={{ py: 4 }}>
        {/* Welcome Screen */}
        {!selectedDistrict && (
          <Fade in timeout={400}>
            <Box textAlign="center" py={6}>
              <Typography variant="h3" mb={3}>
                🌾 {t("appTitle")}
              </Typography>
              <Typography mb={4} color="text.secondary">
                {t("selectDistrict")}
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 600, mx: "auto" }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<LocationOnIcon />}
                  onClick={handleAutoDetect}
                  disabled={isLoadingLocation}
                  fullWidth
                >
                  {isLoadingLocation ? "🔄 Detecting..." : "🔍 Detect My Location"}
                </Button>

                <DistrictSelector onSelect={setSelectedDistrict} />
              </Box>
            </Box>
          </Fade>
        )}

        {/* Data Display */}
        {selectedDistrict && summary && summary.currentStats && !summaryQuery.isFetching && (
          <Fade in timeout={400}>
            <Box>
              {/* District Header */}
              <Paper
                elevation={3}
                sx={{
                  mb: 4,
                  p: 4,
                  borderRadius: 3,
                  background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
                  color: "white",
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Box>
                    <Typography variant="h3" fontWeight={800}>
                      {summary.district.name_en}
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9 }}>
                      {summary.district.name_local || `District Code: ${summary.district.district_code}`}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <VoiceControl
                      text={`Current MGNREGA performance for ${summary.district.name_en}`}
                    />
                    <Button
                      onClick={() => summaryQuery.refetch()}
                      disabled={summaryQuery.isFetching}
                      startIcon={<RefreshIcon />}
                      sx={{ color: "white", fontWeight: 600 }}
                    >
                      Refresh
                    </Button>
                  </Box>
                </Box>
              </Paper>

              {/* Navigation */}
              <NavBar activeTab={activeTab} onTabChange={(_, val) => setActiveTab(val)} />

              {/* Tabs */}
              <Box sx={{ mt: 4 }}>
                {activeTab === 0 && (
                  <Grid container spacing={4}>
                    <Grid item xs={12} sm={6}>
                      <MetricCard
                        title="👥 Workers Helped"
                        value={summary.currentStats.workers_count?.toLocaleString() || "—"}
                        trend={summary.trends?.workers || "stable"}
                        comparison={summary.stateComparison?.workers || "equal"}
                        explanation="People who received work this month"
                        onPlayAudio={() => playAudio(`Workers helped: ${summary.currentStats.workers_count}`)}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <MetricCard
                        title="🛠 Jobs Created"
                        value={summary.currentStats.jobs_created?.toLocaleString() || "—"}
                        trend={summary.trends?.jobs || "stable"}
                        comparison={summary.stateComparison?.jobs || "equal"}
                        explanation="New jobs created this month"
                        onPlayAudio={() => playAudio(`Jobs created: ${summary.currentStats.jobs_created}`)}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <MetricCard
                        title="💰 Wages Paid"
                        value={`₹${summary.currentStats.total_wages?.toLocaleString() || "—"}`}
                        trend={summary.trends?.wages || "stable"}
                        comparison={summary.stateComparison?.wages || "equal"}
                        explanation="Total wages paid to workers"
                        onPlayAudio={() => playAudio(`Wages paid: ₹${summary.currentStats.total_wages}`)}
                      />
                    </Grid>
                  </Grid>
                )}

                {activeTab === 1 && <TimeSeriesChart data={summary.timeSeries || []} />}
                {activeTab === 2 && <ComparativeView comparisons={summary.comparisons || []} />}
                {activeTab === 3 && <PieChartComparison summary={summary} />}
              </Box>
            </Box>
          </Fade>
        )}

        {/* Loading */}
        {summaryQuery.isFetching && (
          <Box textAlign="center" mt={6}>
            <CircularProgress size={60} />
            <Typography mt={2} color="text.secondary">
              Loading district data...
            </Typography>
          </Box>
        )}

        {/* Error */}
        {error && selectedDistrict && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Container>

      {/* Footer */}
      <Box
        sx={{
          width: "100%",
          py: 2,
          textAlign: "center",
          backgroundColor: "white",
          mt: 4,
          borderTop: "1px solid #e0e0e0",
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Built with ❤️ for Rural India • MGNREGA Transparency Portal
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          © 2024 • Data sourced from data.gov.in
        </Typography>
      </Box>

      <FloatingLanguageSelector />
    </Box>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary>
          <AppInner />
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
