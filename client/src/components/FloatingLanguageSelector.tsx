import React, { useState } from "react";
import { Box, IconButton, Tooltip, Fab, Fade, ToggleButton, ToggleButtonGroup, Paper } from "@mui/material";
import { useTranslation } from "react-i18next";
import LanguageIcon from "@mui/icons-material/Language";
import CloseIcon from "@mui/icons-material/Close";

const FloatingLanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (_: any, lang: string | null) => {
    if (lang) {
      i18n.changeLanguage(lang);
      setIsOpen(false);
    }
  };

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: { xs: 20, sm: 30 },
        right: { xs: 20, sm: 30 },
        zIndex: 999,
      }}
    >
      {/* Language Options Menu */}
      <Fade in={isOpen} timeout={300}>
        <Paper
          elevation={4}
          sx={{
            position: "absolute",
            bottom: 70,
            right: 0,
            p: 2,
            borderRadius: 2,
            backgroundColor: "background.paper",
            mb: 1,
          }}
        >
          <ToggleButtonGroup
            value={i18n.language || "en"}
            exclusive
            onChange={handleChange}
            orientation="vertical"
            size="small"
            sx={{
              "& .MuiToggleButton-root": {
                fontSize: "0.95rem",
                fontWeight: 600,
                px: 2,
                py: 1,
                width: "100%",
                justifyContent: "flex-start",
              },
            }}
          >
            <ToggleButton value="en" aria-label="English">
              🇬🇧 English
            </ToggleButton>
            <ToggleButton value="hi" aria-label="Hindi">
              🇮🇳 हिंदी (Hindi)
            </ToggleButton>
          </ToggleButtonGroup>
        </Paper>
      </Fade>

      {/* Floating Button */}
      <Tooltip title={isOpen ? "Close" : "Select Language 🌐"}>
        <Fab
          color="primary"
          onClick={() => setIsOpen(!isOpen)}
          sx={{
            width: 56,
            height: 56,
            boxShadow: 4,
            "&:hover": {
              boxShadow: 6,
            },
          }}
        >
          {isOpen ? (
            <CloseIcon sx={{ fontSize: 28 }} />
          ) : (
            <LanguageIcon sx={{ fontSize: 28 }} />
          )}
        </Fab>
      </Tooltip>
    </Box>
  );
};

export default FloatingLanguageSelector;