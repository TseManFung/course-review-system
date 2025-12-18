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
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
// import { useAuth } from '../context/AuthContext';

interface Department { departmentId: string; name: string }

type FormValues = {
  firstName: string;
  lastName: string;
  email?: string;
  departmentId: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const InstructorCreate: React.FC = () => {
  // const { user } = useAuth(); // Not used currently
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
      setError('firstName/lastName max length is 50');
      return;
    }
    if (data.email && !EMAIL_REGEX.test(data.email)) {
      setError('Invalid email format');
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
      // After success: if coming from review-create, go back; otherwise home/search.
      if (location.state?.from === 'review-create') navigate(-1);
      else navigate('/');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to create instructor');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = formState.isValid;


  return (
    <Box p={2} maxWidth={900} mx="auto">
      <Typography variant="h5" gutterBottom>Create instructor</Typography>
      <Card variant="outlined">
        <CardContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack component="form" spacing={3} onSubmit={handleSubmit(onSubmit)}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="firstName"
                fullWidth
                {...register('firstName', { required: 'Required', maxLength: { value: 50, message: 'Max 50 chars' } })}
                error={!!formState.errors.firstName}
                helperText={formState.errors.firstName?.message}
              />
              <TextField
                label="lastName"
                fullWidth
                {...register('lastName', { required: 'Required', maxLength: { value: 50, message: 'Max 50 chars' } })}
                error={!!formState.errors.lastName}
                helperText={formState.errors.lastName?.message}
              />
            </Stack>

            <TextField
              label="email (optional)"
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

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => navigate(-1)}>Back</Button>
              <Button type="submit" variant="contained" disabled={loading || !canSubmit}>Create</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={existsDialog} onClose={() => setExistsDialog(false)}>
        <DialogTitle>Email already exists</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This email already has a mapped instructor. Please change or clear it and try again.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExistsDialog(false)} autoFocus>Edit form</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InstructorCreate;
