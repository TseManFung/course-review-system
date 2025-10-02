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
            Course Review System
          </Typography>
          <Box component="form" onSubmit={onSearch} sx={{ mr: 2, display: { xs: 'none', sm: 'block' }, width: 360, maxWidth: '40vw' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search courses / code / instructor"
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
            <Button color="inherit" component={Link} to="/admin" sx={{ mr: 1 }}>Admin</Button>
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
                <MenuItem component={Link} to="/profile" onClick={() => setAnchorEl(null)}>Profile</MenuItem>
                <MenuItem component={Link} to="/profile#reviews" onClick={() => setAnchorEl(null)}>My reviews</MenuItem>
                <MenuItem onClick={() => { toggle(); setAnchorEl(null); }}>Toggle theme</MenuItem>
                <MenuItem onClick={() => { logout(); setAnchorEl(null); }}>Logout</MenuItem>
              </Menu>
            </>
          ) : (
            <Button color="inherit" component={Link} to="/">Log in / Sign up</Button>
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
