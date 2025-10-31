import React, { useState } from "react";
import { ToggleButton, ToggleButtonGroup, Button, Box, Tooltip } from "@mui/material";
import { useTranslation } from "react-i18next";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import StopIcon from "@mui/icons-material/Stop";
import SpeechService from "../services/SpeechService";

const LanguageToggle: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported] = useState(SpeechService.isSupported());

  const handleChange = (_: any, lang: string | null) => {
    if (lang) {
      SpeechService.stop();
      setIsSpeaking(false);
      i18n.changeLanguage(lang);
    }
  };

  const handleSpeak = async () => {
    try {
      const currentLang = i18n.language || "en";
      const languageNames: { [key: string]: string } = {
        en: "English",
        hi: "हिंदी (Hindi)",
      };

      const textToSpeak = languageNames[currentLang] || currentLang;

      setIsSpeaking(true);
      await SpeechService.speak(textToSpeak, currentLang);
      setIsSpeaking(false);
    } catch (error) {
      console.error("Speech error:", error);
      setIsSpeaking(false);
    }
  };

  const handleStopSpeech = () => {
    SpeechService.stop();
    setIsSpeaking(false);
  };

  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
      <ToggleButtonGroup
        value={i18n.language || "en"}
        exclusive
        onChange={handleChange}
        size="small"
        aria-label="Select language"
        sx={{ 
          "& .MuiToggleButton-root": {
            fontSize: "0.9rem",
            fontWeight: 600,
            px: 1.5,
            py: 0.75
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

      {speechSupported && (
        <Tooltip title={isSpeaking ? "Stop Speaking" : "Hear Language"}>
          <Button
            variant={isSpeaking ? "contained" : "outlined"}
            size="small"
            onClick={isSpeaking ? handleStopSpeech : handleSpeak}
            sx={{
              minWidth: "40px",
              p: 0.75,
              color: isSpeaking ? "white" : "primary.main",
              backgroundColor: isSpeaking ? "primary.main" : "transparent",
              border: isSpeaking ? "none" : "1px solid",
              borderColor: "primary.main",
              "&:hover": {
                backgroundColor: isSpeaking ? "primary.dark" : "action.hover",
              },
            }}
            aria-label={isSpeaking ? "Stop speaking" : "Speak language"}
          >
            {isSpeaking ? (
              <StopIcon sx={{ fontSize: "1.2rem" }} />
            ) : (
              <VolumeUpIcon sx={{ fontSize: "1.2rem" }} />
            )}
          </Button>
        </Tooltip>
      )}
    </Box>
  );
};

export default LanguageToggle;
