import React, { useEffect, useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import { useTranslation } from "react-i18next";

interface VoiceControlProps {
  text: string;
  onCommand?: (command: string) => void;
  lang?: string;
}

export const VoiceControl: React.FC<VoiceControlProps> = ({
  text,
  onCommand,
  lang = "hi-IN",
}) => {
  const { t } = useTranslation();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = lang;
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onresult = (e: any) => {
        const command = e.results[0][0].transcript;
        if (onCommand) onCommand(command);
      };

      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      setRecognition(rec);
    }
  }, [lang, onCommand]);

  const toggleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u);
    setIsSpeaking(true);
  };

  const toggleListen = () => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  return (
    <>
      <Tooltip title={isSpeaking ? t('stopSpeaking') : t('readAloud')}>
        <IconButton onClick={toggleSpeak} color={isSpeaking ? "primary" : "default"}>
          {isSpeaking ? <VolumeUpIcon /> : <VolumeOffIcon />}
        </IconButton>
      </Tooltip>

      <Tooltip title={isListening ? t('stopListening') : t('voiceCommand')}>
        <IconButton onClick={toggleListen} color={isListening ? "primary" : "default"}>
          {isListening ? <MicIcon /> : <MicOffIcon />}
        </IconButton>
      </Tooltip>
    </>
  );
};
