import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  useTheme,
  Tooltip,
  Collapse,
  Divider,
  Chip,
  Paper,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoIcon from "@mui/icons-material/Info";
import { useTranslation } from "react-i18next";

interface MetricCardProps {
  title: string;
  localLabel?: string;
  value: string | number;
  trend: "up" | "down" | "stable";
  comparison: "above" | "below" | "equal";
  explanation: string;
  onPlayAudio: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  localLabel,
  value,
  trend,
  comparison,
  explanation,
  onPlayAudio,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();

  const trendIcon = {
    up: <TrendingUpIcon sx={{ color: theme.palette.success.main, fontSize: 24 }} />,
    down: <TrendingDownIcon sx={{ color: theme.palette.error.main, fontSize: 24 }} />,
    stable: <TrendingFlatIcon sx={{ color: theme.palette.warning.main, fontSize: 24 }} />,
  }[trend];

  const comparisonText =
    comparison === "above"
      ? t("aboveAvg")
      : comparison === "below"
      ? t("belowAvg")
      : t("atAvg");

  const comparisonColor =
    comparison === "above"
      ? "success"
      : comparison === "below"
      ? "error"
      : "warning";

  const trendText =
    trend === "up"
      ? t("improving")
      : trend === "down"
      ? t("declining")
      : t("stable");

  return (
    <Card
      sx={{
        width: "100%",
        mb: 3,
        transition: "all 0.3s ease",
        "&:hover": {
          boxShadow: 6,
          transform: "translateY(-4px)",
        },
        borderLeft: `6px solid ${
          trend === "up"
            ? theme.palette.success.main
            : trend === "down"
            ? theme.palette.error.main
            : theme.palette.warning.main
        }`,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header Row */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box flex={1}>
            <Typography variant="h5" fontWeight={800} sx={{ fontSize: { xs: "1.3rem", sm: "1.5rem" }, mb: 0.5 }}>
              {title}
            </Typography>
            {localLabel && (
              <Typography variant="body2" color="text.secondary" display="block" sx={{ fontSize: "1rem" }}>
                {localLabel}
              </Typography>
            )}
          </Box>

          <Box display="flex" gap={1}>
            <Tooltip title={t("readAloud")}>
              <IconButton
                onClick={onPlayAudio}
                size="large"
                aria-label={`${t("readAloudTooltip")} ${title}`}
                sx={{
                  "&:hover": { backgroundColor: "action.hover" },
                }}
              >
                <VolumeUpIcon fontSize="large" />
              </IconButton>
            </Tooltip>
            <Tooltip title={expanded ? t("showLess") : t("showMore")}>
              <IconButton
                onClick={() => setExpanded(!expanded)}
                size="large"
                sx={{
                  transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.3s ease",
                }}
              >
                <ExpandMoreIcon fontSize="large" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Main Value */}
        <Typography
          variant="h2"
          component="div"
          sx={{
            my: 3,
            fontWeight: 900,
            color: "primary.main",
            fontSize: { xs: "2.5rem", sm: "3.5rem" },
          }}
        >
          {value}
        </Typography>

        {/* Trend & Comparison - Main Row */}
        <Box display="flex" gap={2} mb={2} flexWrap="wrap">
          <Chip
            icon={trendIcon}
            label={trendText}
            variant="outlined"
            size="medium"
            color={trend === "up" ? "success" : trend === "down" ? "error" : "warning"}
            sx={{ fontSize: "1rem", p: 1 }}
          />
          <Chip
            label={comparisonText}
            variant="outlined"
            size="medium"
            color={comparisonColor}
            sx={{ fontSize: "1rem", p: 1 }}
          />
        </Box>

        {/* Brief Explanation */}
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2, fontSize: "1.1rem", lineHeight: 1.6 }}>
          {explanation}
        </Typography>

        {/* Expanded Details */}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider sx={{ my: 2 }} />
          <Paper
            elevation={0}
            sx={{
              backgroundColor: "action.hover",
              p: 2,
              borderRadius: 2,
              display: "flex",
              gap: 2,
            }}
          >
            <InfoIcon sx={{ fontSize: 28, color: "info.main", flexShrink: 0, mt: 0.5 }} />
            <Box>
              <Typography variant="h6" fontWeight={700} display="block" mb={1} sx={{ fontSize: "1.1rem" }}>
                {t("whatThisMeans")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, fontSize: "1rem" }}>
                {`${t("understanding")} ${explanation.toLowerCase()}. ${t("trend")} ${trend === "up" ? "✅" : trend === "down" ? "⚠️" : "➡️"}. ${comparison === "above" ? t("betterThanAvg") + " 👆" : comparison === "below" ? t("lowerThanAvg") + " 👇" : t("atAvg") + " ➡️"}.`}
              </Typography>
            </Box>
          </Paper>
        </Collapse>
      </CardContent>
    </Card>
  );
};
