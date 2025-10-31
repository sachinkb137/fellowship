import React, { useEffect, useState } from "react";
import { Box, Typography, Alert, Collapse, Button } from "@mui/material";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import SignalCellularAltIcon from "@mui/icons-material/SignalCellularAlt";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";

const OfflineBanner: React.FC = () => {
  const { t } = useTranslation();
  const [offline, setOffline] = useState(!navigator.onLine);
  const [visible, setVisible] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => {
      setOffline(true);
      setVisible(true);
    };
    const handleOnline = () => {
      setOffline(false);
      // Keep visible for a few seconds after coming back online
      setTimeout(() => setVisible(false), 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return (
    <Collapse in={visible}>
      {offline ? (
        <Alert
          severity="warning"
          icon={<WifiOffIcon />}
          sx={{
            py: 1.5,
            px: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: 0,
            backgroundColor: "#fff3cd",
            borderBottom: "2px solid #ffc107",
          }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => setVisible(false)}
              sx={{ ml: 2 }}
            >
              <CloseIcon fontSize="small" />
            </Button>
          }
        >
          <Typography variant="body2" fontWeight={600}>
            {t('youAreOffline')}
          </Typography>
        </Alert>
      ) : (
        <Alert
          severity="success"
          icon={<SignalCellularAltIcon />}
          sx={{
            py: 1.5,
            px: 2,
            borderRadius: 0,
            backgroundColor: "#d4edda",
            borderBottom: "2px solid #28a745",
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            {t('backOnline')}
          </Typography>
        </Alert>
      )}
    </Collapse>
  );
};

export default OfflineBanner;
