import { useEffect, useState } from 'react';
import {
  Alert,
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
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import api from '../api';
// import { useAuth } from '../context/AuthContext';

interface Department { departmentId: string; name: string }

type FormValues = {
  courseId: string;
  departmentId: string;
  name: string;
  description?: string;
  credits: number;
};

const CourseCreate: React.FC = () => {
  // const { user } = useAuth(); // Not currently used; uncomment if permission gating added
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
      setError('courseId length must be >= 6');
      return;
    }
    if (data.name.trim().length > 100) {
      setError('name max length is 100');
      return;
    }
    if (data.credits < 0 || data.credits > 6) {
      setError('credits must be between 0 and 6');
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
      setError(e?.response?.data?.error || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = formState.isValid;

  return (
    <Box p={2} maxWidth={900} mx="auto">
      <Typography variant="h5" gutterBottom>Create course</Typography>
      <Card variant="outlined">
        <CardContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack component="form" spacing={3} onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2}>
              <TextField
                label="courseId"
                fullWidth
                {...register('courseId', { required: 'Required', minLength: { value: 6, message: 'Min 6 chars' } })}
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
                {...register('name', { required: 'Required', maxLength: { value: 100, message: 'Max 100 chars' } })}
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
                inputProps={{ min: 0, max: 120 }}
                {...register('credits', { required: 'Required', min: { value: 0, message: 'Min 0' }, max: { value: 120, message: 'Max 120' }, valueAsNumber: true })}
                error={!!formState.errors.credits}
                helperText={formState.errors.credits?.message}
              />
            </Stack>

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => navigate(-1)}>Back</Button>
              <Button type="submit" variant="contained" disabled={loading || !canSubmit}>Create</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={existsDialog.open} onClose={() => setExistsDialog({ open: false, courseId: null })}>
        <DialogTitle>Course exists</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Course {existsDialog.courseId} already exists. Go to course page, or close and edit form?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExistsDialog({ open: false, courseId: null })}>Edit form</Button>
          <Button onClick={() => navigate(`/course/${existsDialog.courseId}`)} variant="contained">Go to course</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CourseCreate;
