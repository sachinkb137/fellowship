import React, { useState, useEffect } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

interface VoiceControlProps {
  text: string;
  onCommand?: (command: string) => void;
}

export const VoiceControl: React.FC<VoiceControlProps> = ({ text, onCommand }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [synthesis, setSynthesis] = useState<SpeechSynthesis | null>(null);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Initialize speech synthesis
    if (window.speechSynthesis) {
      setSynthesis(window.speechSynthesis);
    }

    // Initialize speech recognition
    if ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.lang = 'hi-IN'; // Set to Hindi, can be made configurable
      recognitionInstance.interimResults = false;

      recognitionInstance.onresult = (event: any) => {
        const command = event.results[0][0].transcript;
        if (onCommand) {
          onCommand(command);
        }
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }

    return () => {
      if (synthesis) {
        synthesis.cancel();
      }
      if (recognition) {
        recognition.abort();
      }
    };
  }, []);

  const toggleSpeech = () => {
    if (!synthesis) return;

    if (isSpeaking) {
      synthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN'; // Set to Hindi, can be made configurable
      utterance.onend = () => setIsSpeaking(false);
      synthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const toggleListening = () => {
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
      <Tooltip title={isSpeaking ? 'Stop Speaking' : 'Read Aloud'}>
        <IconButton onClick={toggleSpeech} color={isSpeaking ? 'primary' : 'default'}>
          {isSpeaking ? <VolumeUpIcon /> : <VolumeOffIcon />}
        </IconButton>
      </Tooltip>

      <Tooltip title={isListening ? 'Stop Listening' : 'Start Voice Command'}>
        <IconButton onClick={toggleListening} color={isListening ? 'primary' : 'default'}>
          {isListening ? <MicIcon /> : <MicOffIcon />}
        </IconButton>
      </Tooltip>
    </>
  );
};