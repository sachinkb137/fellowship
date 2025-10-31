import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import InfoIcon from '@mui/icons-material/Info';
import { geolocationService } from '../services/GeolocationService';
import { District } from '../types';
import { useTranslation } from 'react-i18next';

interface GeolocationPromptProps {
  open: boolean;
  onDistrictDetected: (district: District) => void;
  onSkip: () => void;
}

export const GeolocationPrompt: React.FC<GeolocationPromptProps> = ({
  open: controlledOpen,
  onDistrictDetected,
  onSkip
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(controlledOpen);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    setOpen(controlledOpen);
  }, [controlledOpen]);

  const detectDistrict = async () => {
    setLoading(true);
    setError(null);

    try {
      const district = await geolocationService.detectDistrict();

      if (district) {
        onDistrictDetected(district);
        setOpen(false);
      } else {
        setError(t('locationError'));
      }
    } catch (err: any) {
      const errorMessage = err?.message || t('connectionError');

      // Handle specific geolocation errors
      if (err?.code === 1) {
        setError(t('locationDenied'));
        setPermissionDenied(true);
      } else if (err?.code === 3) {
        setError(t('locationTimeout'));
      } else if (errorMessage.includes('unavailable')) {
        setError(t('connectionError'));
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    onSkip();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
        }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <LocationOnIcon sx={{ fontSize: 28, color: 'primary.main' }} />
          <Typography variant="h6">{t('findYourDistrict')}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Educational message for rural users */}
        <Card sx={{ mb: 2, bgcolor: '#f5f5f5', border: '2px solid #e0e0e0' }}>
          <CardContent sx={{ py: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <InfoIcon sx={{ color: 'primary.main', flexShrink: 0, mt: 0.25 }} />
              <Box>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                  {t('helpUsFind')}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  {t('findYourDistrictDesc')}
                </Typography>
              </Box>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, mb: 1 }}>
              <strong>{t('privacySecurity')}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.8 }}>
              {t('privacyPoint1')}<br />
              {t('privacyPoint2')}<br />
              {t('privacyPoint3')}<br />
              {t('privacyPoint4')}
            </Typography>
          </CardContent>
        </Card>

        {error && (
          <Alert severity={permissionDenied ? 'warning' : 'error'} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
            <CircularProgress size={50} sx={{ mb: 2 }} />
            <Typography color="text.secondary" align="center" fontWeight={600} sx={{ mb: 1 }}>
              {t('findingLocation')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {t('mayTake')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {t('gpsEnabled')}<br />
              {t('goOutdoors')}<br />
              {t('keepSkyVisible')}
            </Typography>
          </Box>
        )}

        {!loading && (
          <Box sx={{ bgcolor: '#fafafa', p: 2.5, borderRadius: 2, textAlign: 'center', border: '1px solid #e0e0e0' }}>
            <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
              {t('readyDetect')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.6 }}>
              {t('permissionDialog')}<br />
              {t('tapAllow')}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined">
          {t('selectManually')}
        </Button>
        <Button
          onClick={detectDistrict}
          variant="contained"
          startIcon={<LocationOnIcon />}
          disabled={loading}
          fullWidth
        >
          {loading ? t('detecting') : t('detectLocation')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GeolocationPrompt;