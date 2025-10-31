import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import SpeechService from '../services/SpeechService';

export const useSpeech = () => {
  const { i18n } = useTranslation();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported] = useState(SpeechService.isSupported());

  const speak = useCallback(
    async (text: string) => {
      try {
        setIsSpeaking(true);
        const lang = i18n.language || 'en';
        await SpeechService.speak(text, lang);
        setIsSpeaking(false);
      } catch (error) {
        console.error('Speech error:', error);
        setIsSpeaking(false);
      }
    },
    [i18n.language]
  );

  const stop = useCallback(() => {
    SpeechService.stop();
    setIsSpeaking(false);
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
  };
};

export default useSpeech;