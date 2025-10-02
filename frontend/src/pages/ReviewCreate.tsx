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

  // 僅學生可使用
  useEffect(() => {
    if (!user) return; // 等待狀態載入
    if (user && user.accessLevel !== 10000) {
      navigate(`/course/${courseId}`);
    }
  }, [user, navigate, courseId]);

  // 載入 course offerings -> 學期清單
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
      } catch (e) {
        // 忽略錯誤，保持空清單
      }
    })();
    return () => {
      mounted = false;
    };
  }, [courseId, setValue]);

  // 依據選取學期，取得既有教師（來自 offerings）
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

  // 合併：學期已有教師 + 搜尋結果（去重）
  const mergedInstructorOptions: InstructorEntry[] = useMemo(() => {
    const map = new Map<string | number, InstructorEntry>();
    for (const i of semesterInstructors) map.set(i.instructorId, i);
    for (const i of searchResults) map.set(i.instructorId, i);
    return Array.from(map.values()).sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`));
  }, [semesterInstructors, searchResults]);

  // 搜尋教師
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

  // 監看學期切換，清空（或保留）所選教師
  useEffect(() => {
    setValue('instructorId', '');
  }, [selectedSemesterId, setValue]);

  // Rating 驗證（0-10 整數）
  const validateRating = (v?: number) => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 10;

  const onSubmit = async (values: FormValues) => {
    // 前端驗證
    const ok = [values.contentRating, values.teachingRating, values.gradingRating, values.workloadRating].every(validateRating);
    if (!ok) return;

    // 檢查是否已評論
    const { data: chk } = await api.get<{ exists: boolean }>(`/review/check`, {
      params: { courseId, semesterId: values.semesterId },
    });
    if (chk?.exists) {
      setDupDialogOpen(true);
      return;
    }

    // 提交（後端會自動確保 CourseOffering 存在）
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

  // 若未登入或尚未載入 user 狀態，顯示簡要提示
  if (!user) {
    return (
      <Box p={3}>
        <Typography variant="h6">請先登入以撰寫評論。</Typography>
      </Box>
    );
  }

  return (
    <Box p={2} maxWidth={900} mx="auto">
      <Typography variant="h5" gutterBottom>
        創建課程評論
      </Typography>

      <Card variant="outlined">
        <CardContent>
          <Stack component="form" spacing={3} onSubmit={handleSubmit(onSubmit)}>
            {/* 課程與學期 */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Course ID" value={courseId} fullWidth disabled />

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
            </Stack>

            {/* 教師搜尋與選擇（僅 UI） */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
              <TextField
                label="搜索教師（姓名或電郵）"
                placeholder="e.g. John, Lee, john@..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                fullWidth
              />
              <Button variant="outlined" onClick={() => runSearch(searchQuery)} disabled={loadingInstructors}>
                {loadingInstructors ? '搜尋中...' : '刷新教師列表'}
              </Button>
              <Button variant="contained" color="secondary" onClick={() => navigate('/instructor/create', { state: { from: location.pathname } })}>
                創建教師
              </Button>
            </Stack>

            <FormControl fullWidth>
              <InputLabel id="instructorId-label">Instructor（可選，用於參考）</InputLabel>
              <Controller
                name="instructorId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    labelId="instructorId-label"
                    label="Instructor（可選，用於參考）"
                  >
                    <MenuItem value="">
                      <em>未選擇</em>
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

            {/* 四個評分（0-10） */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                評分（0-10）
              </Typography>
              <Stack spacing={2}>
                <Controller
                  name="contentRating"
                  control={control}
                  rules={{ validate: validateRating }}
                  render={({ field }) => (
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box minWidth={140}>內容評分</Box>
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
                      <Box minWidth={140}>教學評分</Box>
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
                      <Box minWidth={140}>評核公平</Box>
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
                      <Box minWidth={140}>工作量</Box>
                      <Rating max={10} precision={1} value={field.value} onChange={(_, v) => field.onChange(v ?? 0)} />
                    </Stack>
                  )}
                />
              </Stack>
              {(errors.contentRating || errors.teachingRating || errors.gradingRating || errors.workloadRating) && (
                <Typography color="error" variant="body2" mt={1}>
                  請為四個項目提供 0-10 的整數評分。
                </Typography>
              )}
            </Box>

            {/* 評論內容 */}
            <Controller
              name="comment"
              control={control}
              rules={{
                validate: (v) => (v ? v.trim().length <= 1000 : true),
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="評論內容（最多 1000 字，可留空）"
                  placeholder="分享你的修課體驗與建議..."
                  multiline
                  minRows={4}
                  inputProps={{ maxLength: 1000 }}
                  fullWidth
                />
              )}
            />
            {errors.comment && (
              <Typography color="error" variant="body2">
                評論長度不可超過 1000 字。
              </Typography>
            )}

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => navigate(-1)}>
                取消
              </Button>
              <Button type="submit" variant="contained" disabled={isSubmitting || !selectedSemesterId}>
                提交評論
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* 重複評論對話框 */}
      <Dialog open={dupDialogOpen} onClose={() => setDupDialogOpen(false)}>
        <DialogTitle>已提交過該課程開設的評論</DialogTitle>
        <DialogContent>
          <DialogContentText>
            你已經評論過此課程在所選學期的開設。是否前往查看你的評論歷史？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDupDialogOpen(false)}>留在本頁</Button>
          <Button
            onClick={() => {
              setDupDialogOpen(false);
              navigate('/profile');
            }}
          >
            前往歷史
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReviewCreate;
