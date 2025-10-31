import React from 'react';
import { useTranslation } from 'react-i18next';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

const LanguageToggle: React.FC = () => {
  const { i18n } = useTranslation();

  const handleChange = (_: any, lang: string | null) => {
    if (lang) i18n.changeLanguage(lang);
  };

  return (
    <ToggleButtonGroup
      value={i18n.language}
      exclusive
      onChange={handleChange}
      size="small"
      sx={{ ml: 1 }}
    >
      <ToggleButton value="en">EN</ToggleButton>
      <ToggleButton value="hi">HI</ToggleButton>
    </ToggleButtonGroup>
  );
};

export default LanguageToggle;
