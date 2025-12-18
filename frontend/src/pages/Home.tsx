import { useEffect, useState } from 'react';
import { Box, Button, Divider, Stack, TextField, Typography, Alert, InputAdornment, Paper } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;

type LoginForm = { userId: string; password: string };
type RegisterForm = { userId: string; email: string; password: string; firstName: string; lastName: string };

const Home: React.FC = () => {
  const { user, login, register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [encouragement, setEncouragement] = useState<string>('');
  const [loadingEnc, setLoadingEnc] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loginForm = useForm<LoginForm>({ defaultValues: { userId: '', password: '' } });
  const registerForm = useForm<RegisterForm>({ defaultValues: { userId: '', email: '', password: '', firstName: '', lastName: '' } });

  const onSubmitLogin = async (data: LoginForm) => {
    setError(null);
    try {
      await login(data);
    } catch (e: any) {
  setError(e?.response?.data?.error || 'Login failed');
    }
  };

  const onSubmitRegister = async (data: RegisterForm) => {
    setError(null);
    try {
      if (!PASSWORD_REGEX.test(data.password)) {
        setError('Password must include upper/lower case and special char, and be at least 8 characters');
        return;
      }
      await registerUser(data);
      setMode('login');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Register failed');
    }
  };

  useEffect(() => {
    let active = true;
    const fetchEnc = async () => {
      if (!user) return;
      setLoadingEnc(true);
      try {
        const res = await api.get('/encouragement/random');
        if (!active) return;
        setEncouragement(res.data?.content || '祝你有個愉快的一天！');
      } catch {
        if (!active) return;
        setEncouragement('祝你有個愉快的一天！');
      } finally {
        if (active) setLoadingEnc(false);
      }
    };
    fetchEnc();
    return () => { active = false; };
  }, [user]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/search?query=${encodeURIComponent(q)}` : '/search');
  };

  if (user) {
    return (
      <Stack spacing={3}>
        <Typography variant="h5">Welcome back, {user.firstName}!</Typography>
        <Box component="form" onSubmit={onSearch}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              size="medium"
              placeholder="Search courses / code / instructor"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
            <Button variant="contained" type="submit">Search</Button>
          </Stack>
        </Box>

        <Paper elevation={0} sx={{
          p: 3,
          borderRadius: 2,
          background: (theme) => theme.palette.mode === 'light'
            ? 'linear-gradient(135deg, #e3f2fd 0%, #fce4ec 100%)'
            : 'linear-gradient(135deg, #263238 0%, #37474f 100%)',
        }}>
          <Typography variant="subtitle1" sx={{ opacity: 0.8, mb: 1 }}>Daily encouragement</Typography>
          <Typography variant="h6">{loadingEnc ? 'Loading…' : encouragement}</Typography>
        </Paper>
      </Stack>
    );
  }

  // Not logged-in: show login/register
  return (
    <Stack spacing={3}>
      <Typography variant="h5">Welcome to Course Review System</Typography>
      <Box>
        <Stack direction="row" spacing={2}>
          <Button variant={mode === 'login' ? 'contained' : 'text'} onClick={() => setMode('login')}>Login</Button>
          <Button variant={mode === 'register' ? 'contained' : 'text'} onClick={() => setMode('register')}>Register</Button>
        </Stack>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      <Divider />
      {mode === 'login' ? (
        <Box component="form" onSubmit={loginForm.handleSubmit(onSubmitLogin)} >
          <Stack spacing={2}>
            <TextField label="User ID" fullWidth {...loginForm.register('userId', { required: 'Required' })} error={!!loginForm.formState.errors.userId} helperText={loginForm.formState.errors.userId?.message} />
            <TextField label="Password" type="password" fullWidth {...loginForm.register('password', { required: 'Required' })} error={!!loginForm.formState.errors.password} helperText={loginForm.formState.errors.password?.message} />
            <Button type="submit" variant="contained">Login</Button>
          </Stack>
        </Box>
      ) : (
        <Box component="form" onSubmit={registerForm.handleSubmit(onSubmitRegister)} >
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Email" type="email" fullWidth {...registerForm.register('email', { required: 'Required' })} error={!!registerForm.formState.errors.email} helperText={registerForm.formState.errors.email?.message} />
            </Stack>
            <TextField label="Password" type="password" fullWidth {...registerForm.register('password', { required: 'Required', pattern: { value: PASSWORD_REGEX, message: 'Must include upper/lower case, special char, at least 8 chars' } })} error={!!registerForm.formState.errors.password} helperText={registerForm.formState.errors.password?.message} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="First name" fullWidth {...registerForm.register('firstName', { required: 'Required' })} error={!!registerForm.formState.errors.firstName} helperText={registerForm.formState.errors.firstName?.message} />
              <TextField label="Last name" fullWidth {...registerForm.register('lastName', { required: 'Required' })} error={!!registerForm.formState.errors.lastName} helperText={registerForm.formState.errors.lastName?.message} />
            </Stack>
            <Button type="submit" variant="contained">Register</Button>
          </Stack>
        </Box>
      )}
    </Stack>
  );
};

export default Home;
