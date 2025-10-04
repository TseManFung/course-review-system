import {
  AppBar,
  Box,
  Container,
  IconButton,
  Toolbar,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Avatar,
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useThemeMode } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useMemo, useState } from "react";

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { resolvedMode, toggle } = useThemeMode();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const open = useMemo(() => Boolean(anchorEl), [anchorEl]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  const showSearch = !!user && location.pathname !== "/";

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh", flexDirection: "column" }}>
      <AppBar position="static" color="primary">
        <Toolbar sx={{ position: "relative" }}>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ color: "inherit", textDecoration: "none", mr: 2 }}
          >
            Course Review System
          </Typography>
          {showSearch && (
            <Box
              component="form"
              onSubmit={onSearch}
              sx={[
                {
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: { xs: "60%", sm: 420 },
                  maxWidth: "50vw",
                  display: { xs: "none", sm: "block" },
                  bgcolor: "#fff",
                  borderRadius: 2,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
                  px: 1,
                  py: 0.5,
                  transition:
                    "background-color 0.25s ease, box-shadow 0.25s ease",
                },
                (theme) =>
                  theme.applyStyles("dark", {
                    bgcolor: "#000",
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.15)",
                  }),
              ]}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="Search courses / code / instructor"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                variant="outlined"
                sx={[
                  (theme) =>
                    theme.applyStyles("dark", {
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "#000",
                        color: "#fff",
                      },
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(255,255,255,0.3)",
                      },
                      "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                        {
                          borderColor: "#fff",
                        },
                      "& .MuiSvgIcon-root": { color: "#fff" },
                      "& input::placeholder": {
                        color: "rgba(255,255,255,0.6)",
                      },
                    }),
                ]}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {user ? (
              <>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar sx={{ width: 28, height: 28 }}>
                    {user.firstName?.[0]?.toUpperCase() || "?"}
                  </Avatar>
                  <Button
                    color="inherit"
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                  >
                    {user.firstName} {user.lastName}
                  </Button>
                </Stack>
                <Menu
                  anchorEl={anchorEl}
                  open={open}
                  onClose={() => setAnchorEl(null)}
                >
                  <MenuItem
                    component={Link}
                    to="/profile"
                    onClick={() => setAnchorEl(null)}
                  >
                    Profile
                  </MenuItem>
                  {Number(user.accessLevel) === 10000 && (
                    <MenuItem
                      component={Link}
                      to="/profile#reviews"
                      onClick={() => setAnchorEl(null)}
                    >
                      My reviews
                    </MenuItem>
                  )}
                  {Number(user.accessLevel) === 0 && (
                    <MenuItem
                      component={Link}
                      to="/admin"
                      onClick={() => setAnchorEl(null)}
                    >
                      Admin
                    </MenuItem>
                  )}
                  <MenuItem
                    onClick={() => {
                      logout();
                      setAnchorEl(null);
                    }}
                  >
                    Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button color="inherit" component={Link} to="/">
                Log in / Sign up
              </Button>
            )}
            <IconButton
              color="inherit"
              onClick={toggle}
              sx={{ ml: 1 }}
              aria-label="toggle theme"
            >
              {resolvedMode === "dark" ? (
                <Brightness7Icon />
              ) : (
                <Brightness4Icon />
              )}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 3, flex: 1 }}>{children}</Container>
    </Box>
  );
};

export default AppLayout;
