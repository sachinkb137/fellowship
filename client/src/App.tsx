import React, { useState, useEffect } from "react";
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

function AppInner() {
  const { t, i18n } = useTranslation();
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [summary, setSummary] = useState<DistrictSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGeolocation, setShowGeolocation] = useState(false);
  const [geolocationAttempted, setGeolocationAttempted] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const summaryQuery = useQuery(
    ["districtSummary", selectedDistrict?.id],
    async () => {
      if (!selectedDistrict) return null;
      const res = await fetchWithRetry(`/api/v1/districts/${selectedDistrict.id}/summary`);
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
          await saveSummary(`summary:${selectedDistrict?.id}`, { ts: Date.now(), data });
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

  // Geolocation auto-detect on app load
  useEffect(() => {
    if (geolocationAttempted || selectedDistrict) return;

    const checkGeolocation = async () => {
      if (!geolocationService.isSupported()) {
        setGeolocationAttempted(true);
        return;
      }

      const savedPreference = localStorage.getItem('geolocation_preference');
      if (savedPreference === 'skip') {
        setGeolocationAttempted(true);
        return;
      }

      const permission = await geolocationService.checkPermission();
      
      if (permission === 'granted' || permission === 'prompt') {
        setShowGeolocation(true);
      }

      setGeolocationAttempted(true);
    };

    checkGeolocation();
  }, [geolocationAttempted, selectedDistrict]);

  const playAudio = async (text?: string) => {
    try {
      const currentLang = i18n.language || "en";
      await SpeechService.speak(text || "Showing data", currentLang);
    } catch (error) {
      console.error("Speech error:", error);
    }
  };

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
            <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              🌾 {t('appTitle') || 'Our Voice'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.95rem', fontWeight: 500 }}>
              MGNREGA Transparency Portal
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <LanguageToggle />
            {selectedDistrict && (
              <Button
                size="large"
                onClick={() => setSelectedDistrict(null)}
                sx={{ color: "white", fontSize: '1rem', fontWeight: 600 }}
              >
                Change District
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      <OfflineBanner />

      <GeolocationPrompt
        open={showGeolocation}
        onDistrictDetected={(district) => {
          setSelectedDistrict(district);
          setShowGeolocation(false);
        }}
        onSkip={() => {
          localStorage.setItem('geolocation_preference', 'skip');
          setShowGeolocation(false);
        }}
      />

      <Box sx={{ px: { xs: 1, sm: 2 }, py: 4 }}>
        {/* Welcome Screen */}
        {!selectedDistrict && (
          <Fade in={!selectedDistrict} timeout={500}>
            <Box textAlign="center" py={6}>
              <Typography variant="h3" mb={4} sx={{ fontSize: { xs: '3rem', sm: '4rem' }, fontWeight: 800 }}>
                🌾 {t('appTitle') || 'MGNREGA'}
              </Typography>
              <Typography mb={6} color="text.secondary" sx={{ fontSize: { xs: '1.3rem', sm: '1.5rem' }, lineHeight: 1.8 }}>
                {t('selectDistrict') || 'Select your district'}
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 4, fontSize: '1.1rem', p: 2 }}>
                  {error}
                </Alert>
              )}

              <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: "600px", mx: "auto" }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<LocationOnIcon sx={{ fontSize: '2rem' }} />}
                  onClick={handleAutoDetect}
                  disabled={isLoadingLocation}
                  fullWidth
                  sx={{ py: 3, fontSize: '1.3rem', fontWeight: 600 }}
                >
                  {isLoadingLocation ? "🔄 Detecting..." : "🔍 Detect My Location"}
                </Button>

                <DistrictSelector onSelect={setSelectedDistrict} />
              </Box>

              <Paper sx={{ mt: 6, p: 4, backgroundColor: "info.lighter", textAlign: "left", borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={700} mb={2} sx={{ fontSize: '1.4rem' }}>
                  ℹ️ What is MGNREGA?
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, fontSize: '1.1rem' }}>
                  This app shows **work and money** given to village workers. You can see how many people got jobs, how much they earned, and when they will get paid.
                </Typography>
              </Paper>
            </Box>
          </Fade>
        )}

        {/* Data Display */}
        {selectedDistrict && summary && summary.currentStats && !summaryQuery.isFetching && (
          <Fade in={!!selectedDistrict && !!summary} timeout={500}>
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
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
                  <Box>
                    <Typography variant="h3" fontWeight={800} mb={1} sx={{ fontSize: { xs: '2rem', sm: '2.5rem' } }}>
                      {summary.district.name_en}
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.95, fontSize: '1.1rem' }}>
                      {summary.district.name_local || `District Code: ${summary.district.district_code}`}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", gap: 2 }}>
                    <VoiceControl
                      text={`Current MGNREGA performance for ${summary.district.name_en}`}
                    />
                    <Button
                      size="large"
                      onClick={() => summaryQuery.refetch()}
                      disabled={summaryQuery.isFetching}
                      sx={{ color: "white", fontSize: '1.1rem', fontWeight: 600, py: 1.5 }}
                      startIcon={<RefreshIcon sx={{ fontSize: '1.8rem' }} />}
                    >
                      Refresh
                    </Button>
                  </Box>
                </Box>
              </Paper>

              {/* Navigation Tabs */}
              <NavBar activeTab={activeTab} onTabChange={(e, newValue) => setActiveTab(newValue)} />

              {/* Tab Content */}
              <Box sx={{ mt: 4, px: { xs: 1, sm: 0 } }}>
                {/* Metrics Tab */}
                {activeTab === 0 && (
                  <Box>
                    <Grid container spacing={4} mb={4}>
                      <Grid item xs={12}>
                        <MetricCard
                          title="👥 Workers Helped"
                          value={summary.currentStats?.workers_count?.toLocaleString() || "—"}
                          trend={summary.trends?.workers || "stable"}
                          comparison={summary.stateComparison?.workers || "equal"}
                          explanation="People who received work this month"
                          onPlayAudio={() =>
                            playAudio(
                              `Workers helped: ${summary.currentStats?.workers_count || "not available"}`
                            )
                          }
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <MetricCard
                          title="🛠 Jobs Created"
                          value={summary.currentStats?.jobs_created?.toLocaleString() || "—"}
                          trend={summary.trends?.jobs || "stable"}
                          comparison={summary.stateComparison?.jobs || "equal"}
                          explanation="New jobs created this month"
                          onPlayAudio={() =>
                            playAudio(
                              `Jobs created: ${summary.currentStats?.jobs_created || "not available"}`
                            )
                          }
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <MetricCard
                          title="💰 Wages Paid"
                          value={`₹${summary.currentStats?.total_wages?.toLocaleString() || "—"}`}
                          trend={summary.trends?.wages || "stable"}
                          comparison={summary.stateComparison?.wages || "equal"}
                          explanation="Total wages paid to workers this month"
                          onPlayAudio={() =>
                            playAudio(
                              `Total wages paid: rupees ${summary.currentStats?.total_wages || "not available"}`
                            )
                          }
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <MetricCard
                          title="📊 Person Days"
                          value={summary.currentStats?.person_days?.toLocaleString() || "—"}
                          trend="stable"
                          comparison="equal"
                          explanation="Total person-days of work generated"
                          onPlayAudio={() =>
                            playAudio(
                              `Person days: ${summary.currentStats?.person_days || "not available"}`
                            )
                          }
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <MetricCard
                          title="⏳ Pending Payments"
                          value={`₹${summary.currentStats?.pending_payments?.toLocaleString() || "—"}`}
                          trend="stable"
                          comparison="equal"
                          explanation="Outstanding wage payments"
                          onPlayAudio={() =>
                            playAudio(
                              `Pending payments: rupees ${summary.currentStats?.pending_payments || "not available"}`
                            )
                          }
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* Trends Tab */}
                {activeTab === 1 && (
                  <Box>
                    <TimeSeriesChart data={summary.timeSeries || []} />
                  </Box>
                )}

                {/* Comparison Tab */}
                {activeTab === 2 && (
                  <Box>
                    <ComparativeView comparisons={summary.comparisons || []} />
                  </Box>
                )}

                {/* Pie Charts Tab */}
                {activeTab === 3 && (
                  <Box>
                    <PieChartComparison summary={summary} />
                  </Box>
                )}
              </Box>
            </Box>
          </Fade>
        )}

        {/* Loading State */}
        {summaryQuery.isFetching && (
          <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" my={6}>
            <CircularProgress size={60} />
            <Typography mt={2} color="text.secondary">
              Loading district data...
            </Typography>
          </Box>
        )}

        {/* Error State */}
        {error && selectedDistrict && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>

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

      {/* Floating Language Selector */}
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
