import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Box, Card, CardActionArea, CardContent, Container, FormControl, InputLabel, MenuItem, Pagination, Select, Stack, Typography, Button } from '@mui/material';
import RatingComponent from '../components/RatingComponent';
import api from '../api';

interface Row {
  courseId: string;
  name: string;
  avgContentRating?: number;
  avgTeachingRating?: number;
  avgGradingRating?: number;
  avgWorkloadRating?: number;
  avgTotal?: number;
  reviewCount: number;
}

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const SearchResults: React.FC = () => {
  const qs = useQuery();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = qs.get('q') || qs.get('query') || '';
  const page = Number(qs.get('page') || '1');
  const limit = Number(qs.get('limit') || '10');
  const sort = qs.get('sort') || 'latest';

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/course/search', {
          params: { query, page, limit, sort },
          signal: controller.signal,
        });
        setRows(res.data?.rows || []);
        setTotal(res.data?.total || 0);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [query, page, limit, sort]);

  const onChangePage = (_: any, p: number) => {
    const np = new URLSearchParams({ q: query, page: String(p), limit: String(limit), sort });
    navigate(`/search?${np.toString()}`);
  };
  const onChangeLimit = (val: number) => {
    const np = new URLSearchParams({ q: query, page: '1', limit: String(val), sort });
    navigate(`/search?${np.toString()}`);
  };
  const onChangeSort = (val: string) => {
    const np = new URLSearchParams({ q: query, page: '1', limit: String(limit), sort: val });
    navigate(`/search?${np.toString()}`);
  };

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);

  return (
    <Container sx={{ py: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6">Search results</Typography>
        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="sort-label">Sort</InputLabel>
            <Select labelId="sort-label" value={sort} label="Sort" onChange={(e) => onChangeSort(e.target.value)}>
              <MenuItem value="reviews">Review count</MenuItem>
              <MenuItem value="latest">Latest</MenuItem>
              <MenuItem value="rating">Avg rating</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="limit-label">Per page</InputLabel>
            <Select labelId="limit-label" value={String(limit)} label="Per page" onChange={(e) => onChangeLimit(Number(e.target.value))}>
              <MenuItem value="10">10</MenuItem>
              <MenuItem value="20">20</MenuItem>
              <MenuItem value="50">50</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      {loading && <Typography>Loading…</Typography>}
      {error && <Typography color="error">{error}</Typography>}

      {!loading && rows.length === 0 && (
        <Box textAlign="center" sx={{ py: 6 }}>
          <Typography sx={{ mb: 2 }}>No results found</Typography>
          <Button variant="contained" component={Link} to="/course/create">Create a course</Button>
        </Box>
      )}

      <Stack spacing={2}>
        {rows.map((r) => (
          <Card key={r.courseId}>
            <CardActionArea component={Link} to={`/course/${r.courseId}`}>
              <CardContent>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">{r.courseId}</Typography>
                    <Typography variant="h6">{r.name}</Typography>
                    <Typography variant="caption" color="text.secondary">評論數量：{r.reviewCount || 0}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <RatingComponent label="content" value={r.avgContentRating} />
                    <RatingComponent label="teaching" value={r.avgTeachingRating} />
                    <RatingComponent label="grading" value={r.avgGradingRating} />
                    <RatingComponent label="workload" value={r.avgWorkloadRating} />
                  </Stack>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>

      {total > 0 && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between" sx={{ mt: 2 }}>
          <Typography variant="body2">Showing {start} to {end} of {total} rows</Typography>
          <Pagination count={Math.max(1, Math.ceil(total / limit))} page={page} onChange={onChangePage} />
        </Stack>
      )}
    </Container>
  );
};

export default SearchResults;
