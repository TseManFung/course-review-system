import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

interface Department { departmentId: string; name: string }

type FormValues = {
  courseId: string;
  departmentId: string;
  name: string;
  description?: string;
  credits: number;
};

const CourseCreate: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existsDialog, setExistsDialog] = useState<{ open: boolean; courseId: string | null }>({ open: false, courseId: null });

  const { register, handleSubmit, formState, watch, setValue } = useForm<FormValues>({
    defaultValues: { courseId: '', departmentId: '', name: '', description: '', credits: 3 },
    mode: 'onBlur',
  });

  useEffect(() => {
    let active = true;
    const loadDeps = async () => {
      try {
        const res = await api.get('/department', { params: { page: 1, limit: 500 } });
        if (!active) return;
        setDepartments(res.data?.rows || []);
      } catch (e: any) {
        // 可能為權限不足
      }
    };
    loadDeps();
    return () => { active = false; };
  }, []);

  const checkCourseExists = async (cid: string) => {
    try {
      const res = await api.get('/course/check', { params: { courseId: cid } });
      return !!res.data?.exists;
    } catch {
      return false;
    }
  };

  const onSubmit = async (data: FormValues) => {
    setError(null);
    if (data.courseId.trim().length < 6) {
      setError('courseId 長度需 >= 6');
      return;
    }
    if (data.name.trim().length > 100) {
      setError('name 最多 100 字');
      return;
    }
    if (data.credits < 0 || data.credits > 6) {
      setError('credits 需介於 0 到 6');
      return;
    }
    const exists = await checkCourseExists(data.courseId.trim());
    if (exists) {
      setExistsDialog({ open: true, courseId: data.courseId.trim() });
      return;
    }

    try {
      setLoading(true);
      await api.post('/course', {
        courseId: data.courseId.trim(),
        departmentId: data.departmentId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        credits: Number(data.credits),
      });
      navigate('/search');
    } catch (e: any) {
      setError(e?.response?.data?.error || '建立課程失敗');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = formState.isValid;

  if (!user || Number(user.accessLevel) !== 0) {
    return <Alert severity="warning">此頁需要管理員權限。</Alert>;
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h5">建立課程</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ maxWidth: 720 }}>
        <Stack spacing={2}>
          <TextField
            label="courseId"
            fullWidth
            {...register('courseId', { required: '必填', minLength: { value: 6, message: '至少 6 字' } })}
            error={!!formState.errors.courseId}
            helperText={formState.errors.courseId?.message}
          />

          <FormControl fullWidth>
            <InputLabel id="dep-label">departmentId</InputLabel>
            <Select
              labelId="dep-label"
              label="departmentId"
              value={watch('departmentId')}
              onChange={(e) => setValue('departmentId', e.target.value as string, { shouldValidate: true })}
              required
            >
              {departments.map((d) => (
                <MenuItem key={d.departmentId} value={d.departmentId}>{d.departmentId} — {d.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="name"
            fullWidth
            {...register('name', { required: '必填', maxLength: { value: 100, message: '最多 100 字' } })}
            error={!!formState.errors.name}
            helperText={formState.errors.name?.message}
          />

          <TextField
            label="description"
            fullWidth
            multiline
            minRows={3}
            {...register('description')}
          />

          <TextField
            label="credits"
            type="number"
            inputProps={{ min: 0, max: 6 }}
            {...register('credits', { required: '必填', min: { value: 0, message: '最小 0' }, max: { value: 6, message: '最大 6' }, valueAsNumber: true })}
            error={!!formState.errors.credits}
            helperText={formState.errors.credits?.message}
          />

          <Stack direction="row" spacing={2}>
            <Button type="submit" variant="contained" disabled={loading || !canSubmit}>建立</Button>
            <Button variant="outlined" onClick={() => navigate(-1)}>返回</Button>
          </Stack>
        </Stack>
      </Box>

      <Dialog open={existsDialog.open} onClose={() => setExistsDialog({ open: false, courseId: null })}>
        <DialogTitle>課程已存在</DialogTitle>
        <DialogContent>
          <DialogContentText>
            課程 {existsDialog.courseId} 已存在。你要前往該課程資訊頁面，或關閉對話框重新輸入？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExistsDialog({ open: false, courseId: null })}>重新輸入</Button>
          <Button onClick={() => navigate(`/course/${existsDialog.courseId}`)} variant="contained">前往課程</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default CourseCreate;
