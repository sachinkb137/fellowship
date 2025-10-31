import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";

const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <Box
      sx={{
        backgroundColor: "#ffcc00",
        color: "#000",
        py: 1,
        textAlign: "center",
        position: "sticky",
        top: 64,
        zIndex: 2000,
        fontWeight: 600,
      }}
    >
      <Typography>You are offline — showing last saved data</Typography>
    </Box>
  );
};

export default OfflineBanner;
