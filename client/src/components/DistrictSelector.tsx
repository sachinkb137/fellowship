import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
  IconButton,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { District } from '../types';
import { useTranslation } from 'react-i18next';
import LanguageToggle from './LanguageToggle';

interface DistrictSelectorProps {
  onSelect: (district: District) => void;
}

export const DistrictSelector: React.FC<DistrictSelectorProps> = ({ onSelect }) => {
  const [open, setOpen] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);
  const [filteredDistricts, setFilteredDistricts] = useState<District[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  // use react-query for districts list with retries and caching
  const { data: districtsData, isLoading: qLoading, error: qError, refetch } = useQuery(
    'districts',
    async () => {
      const res = await fetch('/api/v1/districts');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    {
      retry: 2,
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 60,
      onSuccess: (data) => {
        setDistricts(data);
        setFilteredDistricts(data);
        try { localStorage.setItem('districts_cache_v1', JSON.stringify({ ts: Date.now(), data })); } catch (e) {}
      }
    }
  );

  useEffect(() => {
    // fall back to cached if query failed
    if (districtsData) return;
    if (qError) {
      try {
        const cached = localStorage.getItem('districts_cache_v1');
        if (cached) {
          const parsed = JSON.parse(cached);
          setDistricts(parsed.data || []);
          setFilteredDistricts(parsed.data || []);
          setError('Showing cached district list (may be outdated)');
        }
      } catch (e) {
        // ignore
      }
    }
  }, [districtsData, qError]);

  useEffect(() => {
    const filtered = districts.filter(d => 
      d.name_en.toLowerCase().includes(search.toLowerCase()) ||
      (d.name_local && d.name_local.toLowerCase().includes(search.toLowerCase()))
    );
    setFilteredDistricts(filtered);
  }, [search, districts]);

  // fetchDistricts retained for manual refetch if needed
  const fetchDistricts = async () => { refetch(); };

  const handleLocationDetect = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Try nearby endpoint with retries and fall back to selecting manually
          const nearbyUrl = `/api/v1/districts/nearby?lat=${position.coords.latitude}&lon=${position.coords.longitude}`;
          const fetchNearby = async (url: string, attempts = 3) => {
            try {
              const res = await fetch(url);
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return await res.json();
            } catch (err) {
              if (attempts <= 1) throw err;
              await new Promise((r) => setTimeout(r, 300));
              return fetchNearby(url, attempts - 1);
            }
          };

          const district = await fetchNearby(nearbyUrl, 3);
          if (district && district.id) {
            onSelect(district);
            setOpen(false);
          } else {
            setError('Could not detect district. Please choose manually.');
          }
        } catch (err) {
          setError('Failed to detect district from location');
          console.error('Error detecting district:', err);
        }
      },
      (err) => {
        setError('Failed to get location. Please select manually.');
        console.error('Geolocation error:', err);
      }
    );
  };

  return (
    <>
      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={() => setOpen(true)}
        startIcon={<LocationOnIcon />}
      >
        {t('selectDistrict')}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" component="div">{t('chooseDistrict')}</Typography>
            <LanguageToggle />
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleLocationDetect}
              startIcon={<LocationOnIcon />}
            >
              Detect My Location
            </Button>
          </Box>

          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search districts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 2 }}
          />

          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            { (qLoading || loading) ? (
              <ListItem>
                <ListItemText primary="Loading districts..." />
              </ListItem>
            ) : filteredDistricts.length === 0 ? (
              <ListItem>
                <ListItemText primary="No districts found" />
              </ListItem>
            ) : (
              filteredDistricts.map((district) => (
                <ListItemButton
                  key={district.id}
                  onClick={() => {
                    onSelect(district);
                    setOpen(false);
                  }}
                >
                  <ListItemText
                    primary={district.name_en}
                    secondary={district.name_local}
                  />
                </ListItemButton>
              ))
            )}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
};