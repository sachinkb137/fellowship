import React, { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Tooltip,
  useTheme,
  LinearProgress,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { useTranslation } from "react-i18next";
import { DistrictSummary } from "../types";

interface Props {
  comparisons: NonNullable<DistrictSummary["comparisons"]>;
}

const ComparativeView: React.FC<Props> = ({ comparisons }) => {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!comparisons || comparisons.length === 0) return null;

  const handleLanguageChange = (_: any, lang: string | null) => {
    if (lang) {
      i18n.changeLanguage(lang);
    }
  };

  // Categorize comparisons
  const performanceMetrics = comparisons.filter((c) =>
    ["Rank", "Performance", "Status"].some((keyword) => c.label?.includes(keyword))
  );

  const comparisonMetrics = comparisons.filter((c) =>
    ["vs", "compared", "average"].some((keyword) => c.label?.toLowerCase().includes(keyword))
  );

  const renderMetricCard = (c: typeof comparisons[0], index: number) => {
    const isHovered = hoveredIndex === index;

    return (
      <Card
        key={index}
        onMouseEnter={() => setHoveredIndex(index)}
        onMouseLeave={() => setHoveredIndex(null)}
        sx={{
          height: "100%",
          transition: "all 0.3s ease",
          transform: isHovered ? "translateY(-4px)" : "translateY(0)",
          boxShadow: isHovered ? theme.shadows[8] : theme.shadows[1],
          cursor: "pointer",
          backgroundColor: isHovered ? "primary.lighter" : "background.paper",
          border: `1px solid ${isHovered ? theme.palette.primary.main : theme.palette.divider}`,
        }}
      >
        <CardContent sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.secondary"
              sx={{ flex: 1 }}
            >
              {c.label}
            </Typography>
            {c.note && (
              <Tooltip title={c.note}>
                <InfoIcon sx={{ fontSize: 16, color: "info.main" }} />
              </Tooltip>
            )}
          </Box>

          <Typography
            variant="h5"
            fontWeight={800}
            sx={{
              color: "primary.main",
              mb: 1,
              fontSize: "1.8rem",
            }}
          >
            {c.value}
          </Typography>

          {c.note && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                mt: "auto",
                lineHeight: 1.4,
                fontStyle: "italic",
              }}
            >
              {c.note}
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Paper elevation={1} sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
              📊 Performance Comparison & Metrics
            </Typography>
            <Typography variant="caption" color="text.secondary">
              How this district performs compared to state averages
            </Typography>
          </Box>
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
      </Box>

      {/* Performance Metrics */}
      {performanceMetrics.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
            📈 Key Performance Indicators
          </Typography>
          <Grid container spacing={1.5}>
            {performanceMetrics.map((c, idx) => (
              <Grid item xs={12} sm={6} key={idx}>
                {renderMetricCard(c, idx)}
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Comparison Metrics */}
      {comparisonMetrics.length > 0 && (
        <Box>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
            ⚖️ Comparative Analysis
          </Typography>
          <Grid container spacing={1.5}>
            {comparisonMetrics.map((c, idx) => (
              <Grid item xs={12} sm={6} md={4} key={idx}>
                {renderMetricCard(c, performanceMetrics.length + idx)}
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* All comparisons if no categorization */}
      {performanceMetrics.length === 0 && comparisonMetrics.length === 0 && (
        <Grid container spacing={1.5}>
          {comparisons.map((c, idx) => (
            <Grid item xs={12} sm={6} md={4} key={idx}>
              {renderMetricCard(c, idx)}
            </Grid>
          ))}
        </Grid>
      )}

      {/* Summary Footer */}
      <Paper
        elevation={0}
        sx={{
          backgroundColor: "info.lighter",
          p: 1.5,
          borderRadius: 1,
          mt: 2,
          border: `1px solid ${theme.palette.info.light}`,
        }}
      >
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          <InfoIcon sx={{ fontSize: 18, color: "info.main", flexShrink: 0, mt: 0.25 }} />
          <Box>
            <Typography variant="caption" fontWeight={600} display="block" mb={0.5}>
              About These Metrics
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
              These comparisons help you understand how your district's MGNREGA performance
              stacks up against state and national averages. Higher numbers are generally better,
              indicating more employment opportunities and wage payments.
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Paper>
  );
};

export default ComparativeView;
