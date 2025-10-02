import { Box, Tooltip, Typography } from '@mui/material';

const bgFor = (v?: number) => {
  if (v == null) return '#9e9e9e';
  if (v >= 8) return '#4caf50';
  if (v >= 5) return '#ff9800';
  return '#f44336';
};

const labelMap: Record<string, string> = {
  content: 'Content Quality',
  teaching: 'Teaching Quality',
  grading: 'Grading Fairness',
  workload: 'Workload Intensity',
};

export interface RatingProps {
  label: 'content' | 'teaching' | 'grading' | 'workload';
  value?: number | null;
}

const RatingComponent: React.FC<RatingProps> = ({ label, value }) => {
  const v = typeof value === 'number' ? value : undefined;
  const display = v != null ? v.toFixed(2) : '—';
  const bg = bgFor(v);
  const text = labelMap[label] || label;
  return (
    <Tooltip title={text} arrow>
      <Box sx={{
        px: 1,
        py: 0.5,
        bgcolor: bg,
        borderRadius: 1,
        minWidth: 64,
        textAlign: 'center',
      }}>
        <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>{display} / 10</Typography>
      </Box>
    </Tooltip>
  );
};

export default RatingComponent;
