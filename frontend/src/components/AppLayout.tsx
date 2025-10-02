import { AppBar, Box, Container, IconButton, Toolbar, Typography, Button, TextField, InputAdornment, Menu, MenuItem, Avatar, Stack } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { Link, useNavigate } from 'react-router-dom';
import { useThemeMode } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useMemo, useState } from 'react';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mode, toggle } = useThemeMode();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const open = useMemo(() => Boolean(anchorEl), [anchorEl]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', flexDirection: 'column' }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component={Link} to="/" sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}>
            課程評價系統
          </Typography>
          <Box component="form" onSubmit={onSearch} sx={{ mr: 2, display: { xs: 'none', sm: 'block' }, width: 360, maxWidth: '40vw' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="搜尋課程 / 代碼 / 教師"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Box>
          {user && Number(user.accessLevel) === 0 && (
            <Button color="inherit" component={Link} to="/admin" sx={{ mr: 1 }}>管理頁面</Button>
          )}
          {user ? (
            <>
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar sx={{ width: 28, height: 28 }}>
                  {user.firstName?.[0]?.toUpperCase() || '?'}
                </Avatar>
                <Button color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
                  {user.firstName} {user.lastName}
                </Button>
              </Stack>
              <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
                <MenuItem component={Link} to="/profile" onClick={() => setAnchorEl(null)}>更改個人資料</MenuItem>
                <MenuItem component={Link} to="/profile#reviews" onClick={() => setAnchorEl(null)}>評論歷史</MenuItem>
                <MenuItem onClick={() => { toggle(); setAnchorEl(null); }}>切換主題</MenuItem>
                <MenuItem onClick={() => { logout(); setAnchorEl(null); }}>登出</MenuItem>
              </Menu>
            </>
          ) : (
            <Button color="inherit" component={Link} to="/">登入 / 註冊</Button>
          )}
          <IconButton color="inherit" onClick={toggle} sx={{ ml: 1 }} aria-label="toggle theme">
            {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 3, flex: 1 }}>{children}</Container>
    </Box>
  );
};

export default AppLayout;
