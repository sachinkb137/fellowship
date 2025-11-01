import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import RefreshIcon from "@mui/icons-material/Refresh";
import { District } from "../types";
import LanguageToggle from "./LanguageToggle";
import { fetchWithRetry } from "../lib/fetchWithRetry";

interface Props {
  onSelect: (district: District) => void;
  compact?: boolean; // optional prop used in header
}

export const DistrictSelector: React.FC<Props> = ({ onSelect, compact = false }) => {
  const [open, setOpen] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);
  const [filtered, setFiltered] = useState<District[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDistricts = async () => {
    setLoading(true);
    setError(null);
    try {
      // try fetching with retries
      const res = await fetchWithRetry("/api/districts", {}, 3, 300);
      const data = await res.json();
      setDistricts(data);
      setFiltered(data);
      try {
        localStorage.setItem("districts_cache_v1", JSON.stringify({ ts: Date.now(), data }));
      } catch {}
    } catch (err: any) {
      // fallback to cache
      try {
        const cached = localStorage.getItem("districts_cache_v1");
        if (cached) {
          const parsed = JSON.parse(cached);
          setDistricts(parsed.data || []);
          setFiltered(parsed.data || []);
          setError("Showing cached list (may be old)");
        } else {
          setError("Failed to load districts");
        }
      } catch {
        setError("Failed to load districts");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadDistricts();
  }, [open]);

  useEffect(() => {
    const s = search.trim().toLowerCase();
    if (!s) return setFiltered(districts);
    setFiltered(
      districts.filter(
        (d) =>
          d.name_en.toLowerCase().includes(s) ||
          (d.name_local && d.name_local.toLowerCase().includes(s)) ||
          (d.district_code && d.district_code.toString().includes(s))
      )
    );
  }, [search, districts]);

  const detectLocation = () => {
    setError(null);
    setLoading(true);
    if (!navigator.geolocation) {
      setError("Geolocation not supported in your browser");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const url = `/api/districts/nearby?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`;
          const res = await fetchWithRetry(url, {}, 3, 300);
          const district = await res.json();
          if (district && district.id) {
            onSelect(district);
            setOpen(false);
          } else {
            setError("Could not detect district from location. Please select manually.");
            setLoading(false);
          }
        } catch (err) {
          setError("Failed to detect district. Please try again or select manually.");
          setLoading(false);
        }
      },
      (err) => {
        if (err.code === 1) {
          setError("📍 Location permission denied. Enable location in browser settings to use auto-detection.");
        } else if (err.code === 2) {
          setError("📍 Position unavailable. Try enabling GPS if on a mobile device.");
        } else if (err.code === 3) {
          setError("📍 Location request timed out. Please try again.");
        } else {
          setError("📍 Could not access your location. Please select manually.");
        }
        setLoading(false);
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  };

  // compact button for header use
  if (compact) {
    return (
      <Button
        variant="contained"
        size="small"
        onClick={() => setOpen(true)}
        aria-label="Select district"
      >
        Select
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={() => setOpen(true)}
        startIcon={<LocationOnIcon />}
        aria-haspopup="dialog"
      >
        Select your district
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">Choose District</Typography>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <LanguageToggle />
              <IconButton onClick={loadDistricts} aria-label="Refresh districts">
                <RefreshIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={detectLocation}
              disabled={loading}
              startIcon={<LocationOnIcon />}
              sx={{ mb: 1 }}
            >
              {loading ? "Detecting your location..." : "📍 Detect My Location"}
            </Button>
          </Box>

          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search districts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 2 }}
            inputProps={{ "aria-label": "Search districts" }}
            disabled={loading}
          />

          {error && (
            <Typography
              color="error"
              sx={{
                mb: 2,
                p: 1.5,
                backgroundColor: "#ffebee",
                borderRadius: 1,
                fontSize: "0.875rem",
                lineHeight: 1.5,
              }}
            >
              {error}
            </Typography>
          )}

          <List sx={{ maxHeight: 360, overflow: "auto" }}>
            {loading ? (
              <ListItem>
                <ListItemText primary="Loading..." />
              </ListItem>
            ) : filtered.length === 0 ? (
              <ListItem>
                <ListItemText primary="No districts found" />
              </ListItem>
            ) : (
              filtered.map((district) => (
                <ListItemButton
                  key={district.id}
                  onClick={() => {
                    onSelect(district);
                    setOpen(false);
                  }}
                >
                  <ListItemText primary={district.name_en} secondary={district.name_local} />
                </ListItemButton>
              ))
            )}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
};
