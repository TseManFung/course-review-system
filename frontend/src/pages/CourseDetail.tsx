import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  List,
  ListItem,
  ListItemText,
  Pagination,
  Stack,
  Typography,
} from '@mui/material';
import RatingComponent from '../components/RatingComponent';
import api from '../api';
import { useAuth } from '../context/AuthContext';

interface CourseBase {
  courseId: string;
  name: string;
  departmentId: string;
  departmentName: string;
  credits: number;
  status: string;
  description?: string | null;
}

interface OfferingRow {
  courseId: string;
  semesterId: string;
  semesterName: string;
  instructorId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

interface Stats {
  contentRating: number | null;
  teachingRating: number | null;
  gradingRating: number | null;
  workloadRating: number | null;
  count: number;
}

interface ReviewRow {
  reviewId: string;
  userId: string;
  courseId: string;
  semesterId: string;
  contentRating: number;
  teachingRating: number;
  gradingRating: number;
  workloadRating: number;
  createdAt: string;
  status: string;
  comment?: string | null;
}

const LIMIT = 30;

const CourseDetail: React.FC = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<CourseBase | null>(null);
  const [offerings, setOfferings] = useState<OfferingRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [page, setPage] = useState(1);
  const total = stats?.count || 0;

  const semesterNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of offerings) {
      if (o.semesterId && o.semesterName) map.set(String(o.semesterId), o.semesterName);
    }
    return map;
  }, [offerings]);

  useEffect(() => {
    if (!courseId) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [detailRes, offeringsRes] = await Promise.all([
          api.get(`/course/${courseId}`),
          api.get(`/course/${courseId}/offerings`),
        ]);
        if (!active) return;
        const d = detailRes.data;
        setCourse(d?.course || null);
        setStats(d?.stats || null);
        const mergedOfferings: OfferingRow[] = Array.isArray(d?.offerings) ? d.offerings : [];
        const extraOfferings: OfferingRow[] = Array.isArray(offeringsRes.data) ? offeringsRes.data : [];
        // merge arrays (avoid duplicates by key semesterId+instructorId)
        const key = (o: OfferingRow) => `${o.semesterId}|${o.instructorId ?? ''}`;
        const map = new Map<string, OfferingRow>();
        for (const o of [...mergedOfferings, ...extraOfferings]) map.set(key(o), o);
        setOfferings([...map.values()]);
      } catch (e: any) {
        if (!active) return;
        setError(e?.response?.data?.error || 'Failed to load course');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    let active = true;
    const loadReviews = async () => {
      try {
        const res = await api.get(`/course/${courseId}/reviews`, { params: { page, limit: LIMIT } });
        if (!active) return;
        setReviews(res.data?.reviews || []);
        // average includes count
        setStats((prev) => ({ ...(prev || { contentRating: null, teachingRating: null, gradingRating: null, workloadRating: null, count: 0 }), ...(res.data?.average || {}) }));
      } catch (e) {
        if (!active) return;
        // keep previous
      }
    };
    loadReviews();
    return () => { active = false; };
  }, [courseId, page]);

  const start = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const end = Math.min(total, page * LIMIT);

  return (
    <Container sx={{ py: 3 }}>
  {loading && <Typography>Loading…</Typography>}
      {error && <Typography color="error">{error}</Typography>}
      {!loading && course && (
        <Stack spacing={3}>
          {/* 基本資訊與統計 */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' }, gap: 2 }}>
            <Box>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">{course.courseId}</Typography>
                  <Typography variant="h5" sx={{ mb: 1 }}>{course.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Department: {course.departmentName} · Credits: {course.credits}</Typography>
                  {course.description && (
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{course.description}</Typography>
                  )}
                </CardContent>
              </Card>
            </Box>
            <Box>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Review stats</Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    <RatingComponent label="content" value={stats?.contentRating ?? undefined} />
                    <RatingComponent label="teaching" value={stats?.teachingRating ?? undefined} />
                    <RatingComponent label="grading" value={stats?.gradingRating ?? undefined} />
                    <RatingComponent label="workload" value={stats?.workloadRating ?? undefined} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>Total reviews: {stats?.count ?? 0}</Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* 開設資訊 */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Offerings</Typography>
              {offerings.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No offerings yet</Typography>
              ) : (
                <List>
                  {Array.from(
                    offerings.reduce((acc, o) => {
                      const key = String(o.semesterId);
                      if (!acc.has(key)) acc.set(key, [] as OfferingRow[]);
                      acc.get(key)!.push(o);
                      return acc;
                    }, new Map<string, OfferingRow[]>())
                  ).map(([semId, list]) => (
                    <ListItem key={semId} alignItems="flex-start" divider>
                      <ListItemText
                        primary={semesterNameById.get(semId) || `Semester ${semId}`}
                        secondary={
                          list.filter(x => x.firstName || x.lastName).length > 0
                            ? list.map(x => `${x.lastName ?? ''}${x.firstName ?? ''}`).join(', ')
                            : '(No instructors)'
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>

          {/* Create review button (students only) */}
          {user && Number(user.accessLevel) === 10000 && (
            <Box>
              <Button variant="contained" onClick={() => navigate(`/course/${courseId}/review/create`)}>Write a review</Button>
            </Box>
          )}

          {/* 評論列表 */}
          <Card>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="subtitle1">Reviews</Typography>
                {total > 0 && (
                  <Typography variant="body2" color="text.secondary">Showing {start} to {end} of {total} reviews</Typography>
                )}
              </Stack>
              {reviews.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No reviews yet</Typography>
              ) : (
                <List>
                  {reviews.map((rv) => (
                    <ListItem key={rv.reviewId} alignItems="flex-start" divider>
                      <Box sx={{ width: '100%' }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
                          <Typography variant="subtitle2" color="text.secondary">
                            {semesterNameById.get(String(rv.semesterId)) || `Semester ${rv.semesterId}`}
                          </Typography>
                          <Stack direction="row" spacing={1}>
                            <RatingComponent label="content" value={rv.contentRating} />
                            <RatingComponent label="teaching" value={rv.teachingRating} />
                            <RatingComponent label="grading" value={rv.gradingRating} />
                            <RatingComponent label="workload" value={rv.workloadRating} />
                          </Stack>
                        </Stack>
                        {rv.comment && (
                          <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{rv.comment}</Typography>
                        )}
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="caption" color="text.secondary">{new Date(rv.createdAt).toLocaleString()}</Typography>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
              {total > 0 && (
                <Box display="flex" justifyContent="center" sx={{ mt: 2 }}>
                  <Pagination
                    count={Math.max(1, Math.ceil(total / LIMIT))}
                    page={page}
                    onChange={(_, p) => setPage(p)}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}
    </Container>
  );
};

export default CourseDetail;
