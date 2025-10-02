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
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

interface Department { departmentId: string; name: string }

type FormValues = {
  firstName: string;
  lastName: string;
  email?: string;
  departmentId: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const InstructorCreate: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existsDialog, setExistsDialog] = useState<boolean>(false);

  const { register, handleSubmit, formState, watch, setValue } = useForm<FormValues>({
    defaultValues: { firstName: '', lastName: '', email: '', departmentId: '' },
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

  const checkEmailExists = async (email?: string) => {
    if (!email) return false;
    try {
      const res = await api.get('/instructor/check', { params: { email } });
      return !!res.data?.exists;
    } catch {
      return false;
    }
  };

  const onSubmit = async (data: FormValues) => {
    setError(null);
    if (data.firstName.trim().length > 50 || data.lastName.trim().length > 50) {
      setError('firstName/lastName 最多 50 字');
      return;
    }
    if (data.email && !EMAIL_REGEX.test(data.email)) {
      setError('Email 格式不正確');
      return;
    }
    const exists = await checkEmailExists(data.email?.trim());
    if (exists) {
      setExistsDialog(true);
      return;
    }

    try {
      setLoading(true);
      await api.post('/instructor', {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email?.trim() || null,
        departmentId: data.departmentId,
      });
      // 成功後導航：若來源是「撰寫評論」頁面，返回上一頁（常見流程），否則回首頁或搜尋。
      if (location.state?.from === 'review-create') navigate(-1);
      else navigate('/');
    } catch (e: any) {
      setError(e?.response?.data?.error || '建立教師失敗');
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
      <Typography variant="h5">建立教師</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ maxWidth: 720 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="firstName"
              fullWidth
              {...register('firstName', { required: '必填', maxLength: { value: 50, message: '最多 50 字' } })}
              error={!!formState.errors.firstName}
              helperText={formState.errors.firstName?.message}
            />
            <TextField
              label="lastName"
              fullWidth
              {...register('lastName', { required: '必填', maxLength: { value: 50, message: '最多 50 字' } })}
              error={!!formState.errors.lastName}
              helperText={formState.errors.lastName?.message}
            />
          </Stack>

          <TextField
            label="email (可選)"
            fullWidth
            {...register('email')}
            error={!!formState.errors.email}
            helperText={formState.errors.email?.message}
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

          <Stack direction="row" spacing={2}>
            <Button type="submit" variant="contained" disabled={loading || !canSubmit}>建立</Button>
            <Button variant="outlined" onClick={() => navigate(-1)}>返回</Button>
          </Stack>
        </Stack>
      </Box>

      <Dialog open={existsDialog} onClose={() => setExistsDialog(false)}>
        <DialogTitle>Email 已存在</DialogTitle>
        <DialogContent>
          <DialogContentText>
            此 Email 已經有對應的教師，請重新輸入或清空 Email 後再試。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExistsDialog(false)} autoFocus>重新輸入</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default InstructorCreate;
