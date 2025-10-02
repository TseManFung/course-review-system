import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import Rating from '@mui/material/Rating';
import { useForm, Controller } from 'react-hook-form';
import api from '../api';
import { useAuth } from '../context/AuthContext';

type OfferingRow = {
  courseId: string;
  semesterId: string;
  semesterName: string;
  instructorId: string | number | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

type SemesterEntry = {
  semesterId: string;
  semesterName: string;
};

type InstructorEntry = {
  instructorId: string | number;
  firstName: string;
  lastName: string;
  email?: string | null;
};

type FormValues = {
  courseId: string;
  semesterId: string;
  instructorId?: string; // 僅做 UI 選擇，不會被提交
  contentRating: number;
  teachingRating: number;
  gradingRating: number;
  workloadRating: number;
  comment?: string;
};

const ReviewCreate: React.FC = () => {
  const navigate = useNavigate();
  const { courseId = '' } = useParams();
  const { user } = useAuth();

  // 學期與教師資料
  const [offerings, setOfferings] = useState<OfferingRow[]>([]);
  const [semesters, setSemesters] = useState<SemesterEntry[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InstructorEntry[]>([]);
  const [loadingInstructors, setLoadingInstructors] = useState(false);

  // 重複評論對話框
  const [dupDialogOpen, setDupDialogOpen] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      courseId: courseId,
      semesterId: '',
      instructorId: '',
      contentRating: 5,
      teachingRating: 5,
      gradingRating: 5,
      workloadRating: 5,
      comment: '',
    },
  });

  // Students only
  useEffect(() => {
    if (!user) return; // 等待狀態載入
    if (user && user.accessLevel !== 10000) {
      navigate(`/course/${courseId}`);
    }
  }, [user, navigate, courseId]);

  // Load course offerings -> semester list
  useEffect(() => {
    let mounted = true;
    if (!courseId) return;
    (async () => {
      try {
        const { data } = await api.get<OfferingRow[]>(`/course/${courseId}/offerings`);
        if (!mounted) return;
        setOfferings(data || []);
        // 產生唯一學期清單（已按後端 DESC 排序）
        const seen = new Set<string>();
        const sems: SemesterEntry[] = [];
        for (const row of data) {
          if (!seen.has(row.semesterId)) {
            seen.add(row.semesterId);
            sems.push({ semesterId: row.semesterId, semesterName: row.semesterName });
          }
        }
        setSemesters(sems);
        const first = sems[0]?.semesterId || '';
        setSelectedSemesterId(first);
        setValue('semesterId', first);
      } catch {
        // 忽略錯誤，保持空清單（允許手動輸入學期）
      }
    })();
    return () => {
      mounted = false;
    };
  }, [courseId, setValue]);

  // For selected semester, get existing instructors (from offerings)
  const semesterInstructors: InstructorEntry[] = useMemo(() => {
    const byId = new Map<string | number, InstructorEntry>();
    offerings
      .filter((o) => o.semesterId === selectedSemesterId && o.instructorId)
      .forEach((o) => {
        const key = o.instructorId as string | number;
        if (!byId.has(key)) {
          byId.set(key, {
            instructorId: key,
            firstName: o.firstName || '',
            lastName: o.lastName || '',
            email: o.email || null,
          });
        }
      });
    return Array.from(byId.values());
  }, [offerings, selectedSemesterId]);

  // Merge: existing instructors + search results (dedupe)
  const mergedInstructorOptions: InstructorEntry[] = useMemo(() => {
    const map = new Map<string | number, InstructorEntry>();
    for (const i of semesterInstructors) map.set(i.instructorId, i);
    for (const i of searchResults) map.set(i.instructorId, i);
    return Array.from(map.values()).sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`));
  }, [semesterInstructors, searchResults]);

  // Search instructors
  const runSearch = async (q: string) => {
    const qq = q.trim();
    if (!qq) {
      setSearchResults([]);
      return;
    }
    try {
      setLoadingInstructors(true);
      const { data } = await api.get<InstructorEntry[]>(`/instructor/search`, { params: { query: qq } });
      setSearchResults(data || []);
    } finally {
      setLoadingInstructors(false);
    }
  };

  // When switching semester, clear selected instructor
  useEffect(() => {
    setValue('instructorId', '');
  }, [selectedSemesterId, setValue]);

  // Rating validation (0-10 integer)
  const validateRating = (v?: number) => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 10;

  const onSubmit = async (values: FormValues) => {
  // Frontend validation
    const ok = [values.contentRating, values.teachingRating, values.gradingRating, values.workloadRating].every(validateRating);
    if (!ok) return;

  // Check duplicate review
    const { data: chk } = await api.get<{ exists: boolean }>(`/review/check`, {
      params: { courseId, semesterId: values.semesterId },
    });
    if (chk?.exists) {
      setDupDialogOpen(true);
      return;
    }

  // Submit (backend will ensure CourseOffering exists)
    await api.post(`/review`, {
      courseId,
      semesterId: values.semesterId,
      contentRating: values.contentRating,
      teachingRating: values.teachingRating,
      gradingRating: values.gradingRating,
      workloadRating: values.workloadRating,
      comment: (values.comment || '').trim() || null,
    });

    navigate(`/course/${courseId}`);
  };

  // If not logged in, show a hint
  if (!user) {
    return (
      <Box p={3}>
        <Typography variant="h6">Please log in to write a review.</Typography>
      </Box>
    );
  }

  return (
    <Box p={2} maxWidth={900} mx="auto">
      <Typography variant="h5" gutterBottom>Write a course review</Typography>

      <Card variant="outlined">
        <CardContent>
          <Stack component="form" spacing={3} onSubmit={handleSubmit(onSubmit)}>
            {/* Course and semester */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Course ID" value={courseId} fullWidth disabled />

              {semesters.length > 0 ? (
                <FormControl fullWidth>
                  <InputLabel id="semesterId-label">Semester</InputLabel>
                  <Select
                    labelId="semesterId-label"
                    label="Semester"
                    value={selectedSemesterId}
                    onChange={(e: SelectChangeEvent) => {
                      const sid = e.target.value as string;
                      setSelectedSemesterId(sid);
                      setValue('semesterId', sid, { shouldValidate: true });
                    }}
                  >
                    {semesters.map((s) => (
                      <MenuItem key={s.semesterId} value={s.semesterId}>
                        {s.semesterId} — {s.semesterName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <Controller
                  name="semesterId"
                  control={control}
                  rules={{
                    required: true,
                    pattern: { value: /^[0-9]{4}sem[1-3]$/, message: 'Format should be YYYYsem1-3, e.g. 2024sem1' },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Semester ID (manual)"
                      placeholder="e.g. 2024sem1"
                      fullWidth
                      onChange={(e) => {
                        field.onChange(e);
                        const sid = e.target.value;
                        setSelectedSemesterId(sid);
                      }}
                      error={!!errors.semesterId}
                      helperText={errors.semesterId?.message as string}
                    />
                  )}
                />
              )}
            </Stack>

            {/* Instructor search and selection (UI only) */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
              <TextField
                label="Search instructor (name or email)"
                placeholder="e.g. John, Lee, john@..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                fullWidth
              />
              <Button variant="outlined" onClick={() => runSearch(searchQuery)} disabled={loadingInstructors}>
                {loadingInstructors ? 'Searching...' : 'Refresh instructors'}
              </Button>
              <Button variant="contained" color="secondary" onClick={() => navigate('/instructor/create', { state: { from: location.pathname } })}>
                Create instructor
              </Button>
            </Stack>

            <FormControl fullWidth>
              <InputLabel id="instructorId-label">Instructor (optional)</InputLabel>
              <Controller
                name="instructorId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    labelId="instructorId-label"
                    label="Instructor (optional)"
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {mergedInstructorOptions.map((ins) => (
                      <MenuItem key={String(ins.instructorId)} value={String(ins.instructorId)}>
                        {ins.lastName} {ins.firstName}
                        {ins.email ? ` — ${ins.email}` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>

            {/* Four ratings (0-10) */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Ratings (0-10)
              </Typography>
              <Stack spacing={2}>
                <Controller
                  name="contentRating"
                  control={control}
                  rules={{ validate: validateRating }}
                  render={({ field }) => (
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box minWidth={140}>Content</Box>
                      <Rating max={10} precision={1} value={field.value} onChange={(_, v) => field.onChange(v ?? 0)} />
                    </Stack>
                  )}
                />
                <Controller
                  name="teachingRating"
                  control={control}
                  rules={{ validate: validateRating }}
                  render={({ field }) => (
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box minWidth={140}>Teaching</Box>
                      <Rating max={10} precision={1} value={field.value} onChange={(_, v) => field.onChange(v ?? 0)} />
                    </Stack>
                  )}
                />
                <Controller
                  name="gradingRating"
                  control={control}
                  rules={{ validate: validateRating }}
                  render={({ field }) => (
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box minWidth={140}>Grading fairness</Box>
                      <Rating max={10} precision={1} value={field.value} onChange={(_, v) => field.onChange(v ?? 0)} />
                    </Stack>
                  )}
                />
                <Controller
                  name="workloadRating"
                  control={control}
                  rules={{ validate: validateRating }}
                  render={({ field }) => (
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box minWidth={140}>Workload</Box>
                      <Rating max={10} precision={1} value={field.value} onChange={(_, v) => field.onChange(v ?? 0)} />
                    </Stack>
                  )}
                />
              </Stack>
              {(errors.contentRating || errors.teachingRating || errors.gradingRating || errors.workloadRating) && (
                <Typography color="error" variant="body2" mt={1}>
                  Please provide integer ratings (0-10) for all four items.
                </Typography>
              )}
            </Box>

            {/* Comment */}
            <Controller
              name="comment"
              control={control}
              rules={{
                validate: (v) => (v ? v.trim().length <= 1000 : true),
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Comment (max 1000 chars, optional)"
                  placeholder="Share your experience and suggestions..."
                  multiline
                  minRows={4}
                  inputProps={{ maxLength: 1000 }}
                  fullWidth
                />
              )}
            />
            {errors.comment && (
              <Typography color="error" variant="body2">
                Comment length must not exceed 1000 characters.
              </Typography>
            )}

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={isSubmitting || !selectedSemesterId}>
                Submit review
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Duplicate review dialog */}
      <Dialog open={dupDialogOpen} onClose={() => setDupDialogOpen(false)}>
        <DialogTitle>Review already submitted</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have already submitted a review for this course in the selected semester. Go to your review history?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDupDialogOpen(false)}>Stay here</Button>
          <Button
            onClick={() => {
              setDupDialogOpen(false);
              navigate('/profile');
            }}
          >
            Go to history
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReviewCreate;
