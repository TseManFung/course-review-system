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
      setError(e?.response?.data?.error || '登入失敗');
    }
  };

  const onSubmitRegister = async (data: RegisterForm) => {
    setError(null);
    try {
      if (!PASSWORD_REGEX.test(data.password)) {
        setError('密碼需包含大小寫及特殊字元，且長度至少 8');
        return;
      }
      await registerUser(data);
      // 註冊成功後，可提示使用者前往信箱驗證（若後端採用信件流程）。
      setMode('login');
    } catch (e: any) {
      setError(e?.response?.data?.error || '註冊失敗');
    }
  };

  // 已登入時抓取隨機加油句子
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
    // 已登入：顯示大型搜尋區域 + 隨機加油句子
    return (
      <Stack spacing={3}>
        <Typography variant="h5">歡迎回來，{user.firstName}！</Typography>
        <Box component="form" onSubmit={onSearch}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              size="medium"
              placeholder="搜尋課程 / 代碼 / 教師"
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
            <Button variant="contained" type="submit">搜尋</Button>
          </Stack>
        </Box>

        <Paper elevation={0} sx={{
          p: 3,
          borderRadius: 2,
          background: (theme) => theme.palette.mode === 'light'
            ? 'linear-gradient(135deg, #e3f2fd 0%, #fce4ec 100%)'
            : 'linear-gradient(135deg, #263238 0%, #37474f 100%)',
        }}>
          <Typography variant="subtitle1" sx={{ opacity: 0.8, mb: 1 }}>每日加油句子</Typography>
          <Typography variant="h6">{loadingEnc ? '載入中…' : encouragement}</Typography>
        </Paper>
      </Stack>
    );
  }

  // 未登入：顯示登入/註冊（原有內容）
  return (
    <Stack spacing={3}>
      <Typography variant="h5">歡迎使用課程評價系統</Typography>
      <Box>
        <Stack direction="row" spacing={2}>
          <Button variant={mode === 'login' ? 'contained' : 'text'} onClick={() => setMode('login')}>登入</Button>
          <Button variant={mode === 'register' ? 'contained' : 'text'} onClick={() => setMode('register')}>註冊</Button>
        </Stack>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      <Divider />
      {mode === 'login' ? (
        <Box component="form" onSubmit={loginForm.handleSubmit(onSubmitLogin)} sx={{ maxWidth: 420 }}>
          <Stack spacing={2}>
            <TextField label="使用者帳號" fullWidth {...loginForm.register('userId', { required: '必填' })} error={!!loginForm.formState.errors.userId} helperText={loginForm.formState.errors.userId?.message} />
            <TextField label="密碼" type="password" fullWidth {...loginForm.register('password', { required: '必填' })} error={!!loginForm.formState.errors.password} helperText={loginForm.formState.errors.password?.message} />
            <Button type="submit" variant="contained">登入</Button>
          </Stack>
        </Box>
      ) : (
        <Box component="form" onSubmit={registerForm.handleSubmit(onSubmitRegister)} sx={{ maxWidth: 560 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="使用者帳號" fullWidth {...registerForm.register('userId', { required: '必填' })} error={!!registerForm.formState.errors.userId} helperText={registerForm.formState.errors.userId?.message} />
              <TextField label="Email" type="email" fullWidth {...registerForm.register('email', { required: '必填' })} error={!!registerForm.formState.errors.email} helperText={registerForm.formState.errors.email?.message} />
            </Stack>
            <TextField label="密碼" type="password" fullWidth {...registerForm.register('password', { required: '必填', pattern: { value: PASSWORD_REGEX, message: '需含大小寫及特殊字元，至少 8 碼' } })} error={!!registerForm.formState.errors.password} helperText={registerForm.formState.errors.password?.message} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="名" fullWidth {...registerForm.register('firstName', { required: '必填' })} error={!!registerForm.formState.errors.firstName} helperText={registerForm.formState.errors.firstName?.message} />
              <TextField label="姓" fullWidth {...registerForm.register('lastName', { required: '必填' })} error={!!registerForm.formState.errors.lastName} helperText={registerForm.formState.errors.lastName?.message} />
            </Stack>
            <Button type="submit" variant="contained">註冊</Button>
          </Stack>
        </Box>
      )}
    </Stack>
  );
};

export default Home;
