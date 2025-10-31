import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StopIcon from '@mui/icons-material/Stop';
import { useSpeech } from '../hooks/useSpeech';
import { useTranslation } from 'react-i18next';

interface ReadAloudButtonProps {
  text: string;
  ariaLabel?: string;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

/**
 * Button component for reading text aloud
 * Uses text-to-speech API to speak content in the current language
 */
export const ReadAloudButton: React.FC<ReadAloudButtonProps> = ({
  text,
  ariaLabel = 'Read aloud',
  size = 'small',
  showLabel = false,
}) => {
  const { t } = useTranslation();
  const { speak, stop, isSpeaking, isSupported } = useSpeech();

  if (!isSupported) return null;

  const handleClick = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  };

  return (
    <Tooltip title={isSpeaking ? t('stopSpeaking') : t('readAloud')}>
      <IconButton
        onClick={handleClick}
        size={size}
        color={isSpeaking ? 'primary' : 'default'}
        aria-label={ariaLabel}
        sx={{
          animation: isSpeaking ? 'pulse 1.5s ease-in-out infinite' : 'none',
          '@keyframes pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.7 },
          },
        }}
      >
        {isSpeaking ? <StopIcon /> : <VolumeUpIcon />}
        {showLabel && (
          <span style={{ marginLeft: '4px', fontSize: '0.8rem' }}>
            {isSpeaking ? t('stopSpeaking') : t('readAloud')}
          </span>
        )}
      </IconButton>
    </Tooltip>
  );
};

export default ReadAloudButton;