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
  value?: number | string | null;
  numFix?: number;
}

const RatingComponent: React.FC<RatingProps> = ({ label, value, numFix = 2 }) => {
  // 後端平均可能是 number 或 string，或為 0 / null
  let num: number | undefined;
  if (value === 0 || value === '0') {
    num = 0;
  } else if (typeof value === 'number' && !Number.isNaN(value)) {
    num = value;
  } else if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) num = parsed;
  }
  const hasValue = typeof num === 'number';
  const display = hasValue ? num!.toFixed(numFix) : '—';
  const bg = bgFor(num);
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
