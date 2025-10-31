import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  useTheme
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { useTranslation } from 'react-i18next';

interface MetricCardProps {
  title: string;
  localLabel?: string;
  value: string | number;
  trend: 'up' | 'down' | 'stable';
  comparison: 'above' | 'below' | 'equal';
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

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon sx={{ color: theme.palette.success.main }} />;
      case 'down':
        return <TrendingDownIcon sx={{ color: theme.palette.error.main }} />;
      default:
        return <TrendingFlatIcon sx={{ color: theme.palette.warning.main }} />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return theme.palette.success.main;
      case 'down':
        return theme.palette.error.main;
      default:
        return theme.palette.warning.main;
    }
  };

  const { t } = useTranslation();

  return (
    <Card sx={{ width: '100%', mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" component="div">
              {title}
            </Typography>
            {localLabel && (
              <Typography variant="body2" color="text.secondary">
                {localLabel}
              </Typography>
            )}
          </Box>
          <IconButton onClick={onPlayAudio} aria-label="Play explanation">
            <VolumeUpIcon />
          </IconButton>
        </Box>

        <Typography variant="h3" component="div" sx={{ my: 2, fontWeight: 700 }}>
          {value}
        </Typography>

        <Box display="flex" alignItems="center" gap={1}>
          {getTrendIcon()}
          <Typography
            variant="body2"
            color={getTrendColor()}
          >
            {trend === 'up' ? t('improving') : trend === 'down' ? t('declining') : t('stable')}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {comparison === 'above' 
            ? t('aboveState')
            : comparison === 'below'
            ? t('belowState')
            : t('atState')}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {explanation}
        </Typography>
      </CardContent>
    </Card>
  );
};