import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { useTranslation } from 'react-i18next';

interface MetricExplainerProps {
  open: boolean;
  onClose: () => void;
}

export const MetricExplainer: React.FC<MetricExplainerProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HelpOutlineIcon color="primary" />
        <Typography variant="h6">{t("understanding")}</Typography>
      </DialogTitle>

      <DialogContent>
        {/* Workers Explanation */}
        <Card sx={{ mb: 2, bgcolor: '#e3f2fd' }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              {t("workersExplainerTitle")}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t("workersExplainerDesc")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("workersExplainerHint")}
            </Typography>
          </CardContent>
        </Card>

        {/* Wages Explanation */}
        <Card sx={{ mb: 2, bgcolor: '#f3e5f5' }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              {t("wagesExplainerTitle")}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t("wagesExplainerDesc")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("wagesExplainerHint")}
            </Typography>
          </CardContent>
        </Card>

        {/* Jobs Explanation */}
        <Card sx={{ mb: 2, bgcolor: '#e8f5e9' }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              {t("jobsExplainerTitle")}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t("jobsExplainerDesc")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("jobsExplainerHint")}
            </Typography>
          </CardContent>
        </Card>

        {/* Trend Explanation */}
        <Card sx={{ mb: 2, bgcolor: '#fff3e0' }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
              {t("trendExplainerTitle")}
            </Typography>
            <List dense sx={{ pl: 2 }}>
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <TrendingUpIcon sx={{ color: '#4caf50', fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText
                  primary={<Typography variant="body2" fontWeight={600}>{t("improvingTrend")}</Typography>}
                  secondary={<Typography variant="caption">{t("improvingHint")}</Typography>}
                />
              </ListItem>
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <TrendingDownIcon sx={{ color: '#f44336', fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText
                  primary={<Typography variant="body2" fontWeight={600}>{t("decliningTrend")}</Typography>}
                  secondary={<Typography variant="caption">{t("decliningHint")}</Typography>}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>

        {/* Comparison Explanation */}
        <Card sx={{ bgcolor: '#fce4ec' }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CompareArrowsIcon />
              {t("comparisonExplainerTitle")}
            </Typography>
            <List dense sx={{ pl: 2 }}>
              <ListItem disableGutters>
                <ListItemText
                  primary={<Typography variant="body2" fontWeight={600}>{t("betterThanAvg")}</Typography>}
                  secondary={<Typography variant="caption">{t("betterThanAvgHint")}</Typography>}
                />
              </ListItem>
              <ListItem disableGutters sx={{ mt: 1 }}>
                <ListItemText
                  primary={<Typography variant="body2" fontWeight={600}>{t("lowerThanAvg")}</Typography>}
                  secondary={<Typography variant="caption">{t("lowerThanAvgHint")}</Typography>}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained" fullWidth>
          {t("gotIt")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MetricExplainer;