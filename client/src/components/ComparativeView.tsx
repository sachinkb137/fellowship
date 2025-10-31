import React from 'react';
import { Box, Typography, Grid, Paper } from '@mui/material';

interface Comp {
  label: string;
  value: string | number;
  note?: string;
}

interface Props {
  comparisons: Comp[];
}

const ComparativeView: React.FC<Props> = ({ comparisons }) => {
  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>How this district compares</Typography>
      <Grid container spacing={1}>
        {comparisons.map((c, idx) => (
          <Grid item xs={12} sm={4} key={idx}>
            <Paper sx={{ p: 1 }} elevation={1}>
              <Typography variant="body2" color="text.secondary">{c.label}</Typography>
              <Typography variant="h6">{c.value}</Typography>
              {c.note && <Typography variant="caption" color="text.secondary">{c.note}</Typography>}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ComparativeView;
