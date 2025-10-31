import React from "react";
import {
  Box,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import PieChartIcon from "@mui/icons-material/PieChart";
import CompareIcon from "@mui/icons-material/Compare";
import { useTranslation } from "react-i18next";

interface NavBarProps {
  activeTab: number;
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
}

export const NavBar: React.FC<NavBarProps> = ({ activeTab, onTabChange }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { t } = useTranslation();

  const tabs = [
    { label: isMobile ? t("metrics") : t("metrics"), icon: <BarChartIcon /> },
    { label: isMobile ? t("trends") : t("trends"), icon: <ShowChartIcon /> },
    { label: isMobile ? t("comp") : t("comparison"), icon: <CompareIcon /> },
    { label: isMobile ? t("charts") : t("pieCharts"), icon: <PieChartIcon /> },
  ];

  return (
    <Box
      sx={{
        borderBottom: `3px solid ${theme.palette.divider}`,
        backgroundColor: "background.paper",
        sticky: "top",
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
      }}
    >
      <Tabs
        value={activeTab}
        onChange={onTabChange}
        variant={isMobile ? "scrollable" : "fullWidth"}
        scrollButtons={isMobile ? "auto" : false}
        sx={{
          "& .MuiTab-root": {
            minHeight: 80,
            textTransform: "none",
            fontSize: { xs: "1rem", sm: "1.1rem" },
            fontWeight: 700,
            py: 2,
            px: 2,
            flex: 1,
          },
          "& .MuiTab-indicator": {
            height: 5,
          },
        }}
      >
        {tabs.map((tab, index) => (
          <Tab
            key={index}
            label={tab.label}
            icon={tab.icon}
            iconPosition="top"
            sx={{
              display: "flex",
              gap: 1,
              flexDirection: "column",
            }}
          />
        ))}
      </Tabs>
    </Box>
  );
};