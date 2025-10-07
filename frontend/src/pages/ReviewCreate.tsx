import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
  CircularProgress,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import type { SelectChangeEvent } from '@mui/material/Select';
import Rating from '@mui/material/Rating';
import Tooltip from '@mui/material/Tooltip';
import { useForm, Controller, useWatch } from 'react-hook-form';
import api from '../api';
import LinearProgress from '@mui/material/LinearProgress';
import { analyze as analyzeQualityDetailed } from '../utils/commentQuality';
import { useAuth } from '../context/AuthContext';

type OfferingRow = {
  courseId: string;
  semesterId: string;
  semesterName: string;
  instructorId: string | null; // Snowflake / BIGINT 以字串表示，避免精度問題
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

type SemesterEntry = {
  semesterId: string;
  semesterName: string;
};

type InstructorEntry = {
  instructorId: string; // 統一字串型別
  firstName: string;
  lastName: string;
  email?: string | null;
};

type FormValues = {
  courseId: string;
  semesterId: string;
  instructorIds: string[]; // 多位教師
  contentRating: number | null;
  teachingRating: number | null;
  gradingRating: number | null;
  workloadRating: number | null;
  comment: string; // 必填評論
};

// Basic frontend semantic / quality heuristics for comment
// Prevent obviously meaningless or low-effort inputs (supports zh / en mixed)
// Removed inline analyzeCommentQuality (moved to utils/commentQuality.ts)

const ReviewCreate: React.FC = () => {
  const navigate = useNavigate();
  const { courseId = '' } = useParams();
  const location = useLocation();
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
      instructorIds: [],
  contentRating: null,
  teachingRating: null,
  gradingRating: null,
  workloadRating: null,
  comment: '',
    },
  });

  // Live watch of comment for dynamic quality feedback
  const liveComment = useWatch({ control, name: 'comment' });
  const MIN_SUBMIT_SCORE = 40; // form accept threshold
  const quality = analyzeQualityDetailed(liveComment || '');
  const qualityColor = quality.ok ? 'success' : (quality.score >= MIN_SUBMIT_SCORE ? 'warning' : 'error');

  // Students only
  useEffect(() => {
    if (!user) return; // 等待狀態載入
    if (user && user.accessLevel !== 10000) {
      navigate(`/course/${courseId}`);
    }
  }, [user, navigate, courseId]);

  // Load course offerings -> initial semester list (only those with offerings)
  useEffect(() => {
    let mounted = true;
    if (!courseId) return;
    (async () => {
      try {
        const { data } = await api.get<OfferingRow[]>(`/course/${courseId}/offerings`);
        if (!mounted) return;
        const off = data || [];
        setOfferings(off);
        // 產生唯一學期清單（已按後端 DESC 排序）
        const seen = new Set<string>();
        const sems: SemesterEntry[] = [];
        for (const row of off) {
          if (!seen.has(row.semesterId)) {
            seen.add(row.semesterId);
            sems.push({ semesterId: row.semesterId, semesterName: row.semesterName });
          }
        }
        setSemesters(sems);
        const first = sems[0]?.semesterId || '';
        setSelectedSemesterId(first);
        setValue('semesterId', first);
        // 不再顯示最新學期教師 chip，以自動完成搜尋取代
      } catch {
        // 忽略錯誤，保持空清單（允許手動輸入學期）
      }
    })();
    return () => {
      mounted = false;
    };
  }, [courseId, setValue]);

  // 取得所有學期（允許使用者選擇任何學期，而不只限於該課程已有 offering 的）
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get<{ total: number; rows: { semesterId: string; name: string }[] }>(`/semester`, { params: { page: 1, limit: 500 } });
        if (!mounted) return;
        const rows = data?.rows || [];
        setSemesters(() => {
          const map = new Map<string, SemesterEntry>();
          for (const r of rows) {
              map.set(r.semesterId, { semesterId: r.semesterId, semesterName: r.name });
            
          }
          // 依 semesterId 逆序 (假設 YYYYsemX 字串比較可行)
          return Array.from(map.values()).sort((a,b)=> b.semesterId.localeCompare(a.semesterId));
        });
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  // For selected semester, get existing instructors (from offerings)
  const semesterInstructors: InstructorEntry[] = useMemo(() => {
    const byId = new Map<string | number, InstructorEntry>();
    offerings
      .filter((o) => o.semesterId === selectedSemesterId && o.instructorId)
      .forEach((o) => {
        const key = o.instructorId as string | number;
        if (!byId.has(key)) {
          byId.set(key, {
            instructorId: String(key),
            firstName: o.firstName || '',
            lastName: o.lastName || '',
            email: o.email || null,
          });
        }
      });
    return Array.from(byId.values());
  }, [offerings, selectedSemesterId]);

  // 舊的合併與手動搜尋已移除，改用 debounce + Autocomplete 後端查詢

  // When switching semester, clear selected instructor
  useEffect(() => {
    setValue('instructorIds', []);
  }, [selectedSemesterId, setValue]);

  // debounce 搜尋計時器
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(() => {
      (async () => {
        try {
          setLoadingInstructors(true);
          const { data } = await api.get<InstructorEntry[]>(`/instructor/search`, { params: { query: q } });
          setSearchResults(data || []);
        } finally { setLoadingInstructors(false); }
      })();
    }, 400); // 400ms debounce
    return () => clearTimeout(handle);
  }, [searchQuery]);

  // Rating validation (1-10 integer)
  const validateRating = (v: number | null) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 10;

  // Tooltip descriptions for each rating category
  const ratingDescriptions = {
    content: `The content reflects the student's evaluation of the quality of the course content, ranging from 1 to 10, where 1 indicates extremely poor and 10 indicates excellent. This rating assesses the teaching materials, course design, depth, and relevance of the content. For example, students may rate based on whether the course covers practical knowledge, if the materials are clear and understandable, and if the content aligns with the course objectives.`,
    teaching: `The teaching reflects the student's evaluation of the instructor's teaching performance, ranging from 1 to 10, where 1 indicates extremely poor and 10 indicates excellent. This rating focuses on the instructor’s teaching style, clarity of explanations, interactivity, and support provided to students. For example, students may rate based on whether the instructor clearly conveys concepts, actively responds to questions, and inspires interest in learning.`,
    workload: `The workload reflects the student’s evaluation of the intensity of the course workload, ranging from 1 to 10, where 1 indicates an extremely light workload and 10 indicates an extremely heavy workload. This rating assesses whether the volume and difficulty of assignments, projects, readings, or other tasks are reasonable and aligned with the course credits and learning objectives. For example, students may rate based on whether the workload is excessive, reasonably distributed, or impacts the learning experience.`,
    grading: `The grading reflects the student’s perception of the fairness of the course’s grading criteria, ranging from 1 to 10, where 1 indicates extremely unfair and 10 indicates highly fair. This rating evaluates whether the grading standards for assignments, exams, or projects are transparent, consistent, and fairly reflect students’ efforts and performance. For example, students may rate based on whether grading criteria are clear, consistently applied, and free from bias.`,
  } as const;

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
      instructorIds: values.instructorIds || [],
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
                    required: true                    
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

            {/* Instructor search & selection: autocomplete (multiple) */}
            <Controller
              name="instructorIds"
              control={control}
              render={({ field }) => {
                const valueArray: string[] = Array.isArray(field.value) ? field.value : [];
                const selectedSet = new Set(valueArray.map(String));
                const selectedObjects: InstructorEntry[] = valueArray
                  .map(id => searchResults.find(o => String(o.instructorId) === String(id)) || semesterInstructors.find(o => String(o.instructorId) === String(id)))
                  .filter(Boolean) as InstructorEntry[];
                const merged = [...selectedObjects];
                for (const r of searchResults) {
                  if (!selectedSet.has(String(r.instructorId))) merged.push(r);
                }
                return (
                  <Autocomplete
                    multiple
                    options={merged}
                    loading={loadingInstructors}
                    inputValue={searchQuery}
                    onInputChange={(_, val, reason) => {
                      // MUI will fire onInputChange also when option selected (reason === 'reset') - keep last typed query or clear
                      if (reason === 'input') setSearchQuery(val);
                      if (reason === 'clear') setSearchQuery('');
                    }}
                    getOptionLabel={(o) => `${o.lastName} ${o.firstName}` + (o.email ? ` · ${o.email}` : '')}
                    value={selectedObjects}
                    onChange={(_, vals) => field.onChange(vals.map(v => String(v.instructorId)))}
                    filterOptions={(x) => x}
                    isOptionEqualToValue={(opt, val) => String(opt.instructorId) === String(val.instructorId)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Search & select instructors (optional)"
                        placeholder="Type keyword to search"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {loadingInstructors ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          )
                        }}
                        fullWidth
                      />
                    )}
                    noOptionsText={searchQuery.trim() ? 'No results' : 'Type to search'}
                  />
                );
              }}
            />
            <Box>
              <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/instructor/create', { state: { from: location.pathname } })}>Create new instructor</Button>
            </Box>

            {/* Four ratings (1-10) */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Ratings (1-10)
              </Typography>
              <Stack spacing={2}>
                <Controller
                  name="contentRating"
                  control={control}
                  rules={{ validate: (v) => validateRating(v) || 'Required' }}
                  render={({ field }) => (
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Tooltip title={<Box maxWidth={380}>{ratingDescriptions.content}</Box>} arrow enterDelay={400}>
                        <Box minWidth={140} sx={{ cursor: 'help' }}>Content</Box>
                      </Tooltip>
                      <Rating
                        max={10}
                        precision={1}
                        value={field.value}
                        onChange={(_, v) => field.onChange(v === null ? null : v)}
                      />
                    </Stack>
                  )}
                />
                <Controller
                  name="teachingRating"
                  control={control}
                  rules={{ validate: (v) => validateRating(v) || 'Required' }}
                  render={({ field }) => (
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Tooltip title={<Box maxWidth={380}>{ratingDescriptions.teaching}</Box>} arrow enterDelay={400}>
                        <Box minWidth={140} sx={{ cursor: 'help' }}>Teaching</Box>
                      </Tooltip>
                      <Rating max={10} precision={1} value={field.value} onChange={(_, v) => field.onChange(v === null ? null : v)} />
                    </Stack>
                  )}
                />
                <Controller
                  name="gradingRating"
                  control={control}
                  rules={{ validate: (v) => validateRating(v) || 'Required' }}
                  render={({ field }) => (
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Tooltip title={<Box maxWidth={380}>{ratingDescriptions.grading}</Box>} arrow enterDelay={400}>
                        <Box minWidth={140} sx={{ cursor: 'help' }}>Grading fairness</Box>
                      </Tooltip>
                      <Rating max={10} precision={1} value={field.value} onChange={(_, v) => field.onChange(v === null ? null : v)} />
                    </Stack>
                  )}
                />
                <Controller
                  name="workloadRating"
                  control={control}
                  rules={{ validate: (v) => validateRating(v) || 'Required' }}
                  render={({ field }) => (
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Tooltip title={<Box maxWidth={380}>{ratingDescriptions.workload}</Box>} arrow enterDelay={400}>
                        <Box minWidth={140} sx={{ cursor: 'help' }}>Workload</Box>
                      </Tooltip>
                      <Rating max={10} precision={1} value={field.value} onChange={(_, v) => field.onChange(v === null ? null : v)} />
                    </Stack>
                  )}
                />
              </Stack>
              {(errors.contentRating || errors.teachingRating || errors.gradingRating || errors.workloadRating) && (
                <Typography color="error" variant="body2" mt={1}>
                  Please select ratings (1-10) for all four items.
                </Typography>
              )}
            </Box>

            {/* Comment */}
            <Controller
              name="comment"
              control={control}
              rules={{
                validate: (v) => {
                  const val = (v || '').trim();
                  if (val.length === 0) return 'Comment is required';
                  if (val.length > 10000) return 'Max 10000 characters';
                  const res = analyzeQualityDetailed(val);
                  if (res.score < MIN_SUBMIT_SCORE) {
                    return res.message || 'Comment needs more detail';
                  }
                  return true; // Acceptable (even if not full pass >=80)
                }
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Comment (max 10000 chars, required)"
                  placeholder="Share your experience and suggestions..."
                  multiline
                  minRows={4}
                  inputProps={{ maxLength: 10000 }}
                  fullWidth
                  error={!!errors.comment}
                  helperText={(errors.comment?.message as string) || `${field.value?.trim().length || 0}/10000`}
                />
              )}
            />
            <Box>
              <Stack spacing={0.5} mt={1}>
                <LinearProgress
                  variant="determinate"
                  value={quality.score}
                  color={qualityColor as any}
                  sx={{ height: 8, borderRadius: 1, bgcolor: 'action.hover' }}
                />
                <Typography variant="caption" color={quality.ok ? 'success.main' : (qualityColor === 'warning' ? 'warning.main' : 'error.main')}>
                  {quality.ok ? '✔ Passed quality check' : `Quality: ${quality.score}/100 — ${quality.message}`}
                </Typography>
              </Stack>
            </Box>
            {errors.comment && !errors.comment.message && (
              <Typography color="error" variant="body2">Comment is required.</Typography>
            )}

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={quality.score < MIN_SUBMIT_SCORE || isSubmitting || !selectedSemesterId}>
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
