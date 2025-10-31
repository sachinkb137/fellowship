import React from "react";
import { Box, Typography, Button, Paper, Container, Alert } from "@mui/material";
import ErrorIcon from "@mui/icons-material/Error";
import RefreshIcon from "@mui/icons-material/Refresh";
import HomeIcon from "@mui/icons-material/Home";
import { useTranslation } from "react-i18next";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return {
      hasError: true,
      errorMessage: error?.message || "An unexpected error occurred",
    };
  }

  componentDidCatch(error: any, info: any) {
    console.error("ErrorBoundary caught:", error, info);
    if (error?.stack) {
      console.error("Stack trace:", error.stack);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return <ErrorBoundaryContent errorMessage={this.state.errorMessage} onReload={this.handleReload} onHome={this.handleHome} />;
    }
    return this.props.children;
  }
}

interface ErrorBoundaryContentProps {
  errorMessage?: string;
  onReload: () => void;
  onHome: () => void;
}

const ErrorBoundaryContent: React.FC<ErrorBoundaryContentProps> = ({ errorMessage, onReload, onHome }) => {
  const { t } = useTranslation();

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: "center",
            borderRadius: 3,
            backgroundColor: "#fff",
          }}
        >
          <Box sx={{ mb: 2 }}>
            <ErrorIcon sx={{ fontSize: 64, color: "error.main" }} />
          </Box>

          <Typography variant="h5" fontWeight={700} gutterBottom>
            {t("somethingWentWrong")}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ my: 2, mb: 3 }}>
            {t("unexpectedError")}
          </Typography>

          <Alert severity="info" sx={{ mb: 3, textAlign: "left" }}>
            <Typography variant="caption">
              <strong>{t("errorDetails")}</strong> {errorMessage}
            </Typography>
          </Alert>

          <Box sx={{ display: "flex", gap: 1, flexDirection: { xs: "column", sm: "row" } }}>
            <Button
              variant="contained"
              fullWidth
              onClick={onReload}
              startIcon={<RefreshIcon />}
            >
              {t("reloadPage")}
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={onHome}
              startIcon={<HomeIcon />}
            >
              {t("goHome")}
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
            {t("persistsContact")}
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};
