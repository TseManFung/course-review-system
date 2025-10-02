import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Pagination,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

type MyReview = {
  reviewId: string | number;
  userId: string;
  courseId: string;
  semesterId: string;
  contentRating: number;
  teachingRating: number;
  gradingRating: number;
  workloadRating: number;
  createdAt: string;
  comment?: string | null;
};

const PAGE_SIZE = 30;

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [reviews, setReviews] = useState<MyReview[]>([]);

  const load = async () => {
    const { data } = await api.get<{ total: number; rows: MyReview[] }>(`/review/my`, { params: { page, limit: PAGE_SIZE } });
    setTotal(data.total);
    setReviews(data.rows || []);
  };

  useEffect(() => { load(); }, [page]);

  useEffect(() => {
    if (location.hash === '#reviews') {
      const el = document.getElementById('reviews');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location]);

  const onPwdSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const oldPassword = String(fd.get('oldPassword') || '');
    const newPassword = String(fd.get('newPassword') || '');
    const confirmPassword = String(fd.get('confirmPassword') || '');
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
    if (!regex.test(newPassword)) return alert('新密碼格式不符：至少 8 碼，含大小寫與特殊字元');
    if (newPassword !== confirmPassword) return alert('新密碼與確認不一致');
    await api.patch('/user/password', { oldPassword, newPassword, confirmPassword });
    setPwdOpen(false);
  };

  const onDeleteConfirm = async () => {
    await api.patch('/user/delete', {});
    setDelOpen(false);
    logout();
  };

  return (
    <Box p={2} maxWidth={1000} mx="auto">
  <Typography variant="h5" gutterBottom>Profile</Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
  <CardHeader title="Basic info" />
        <CardContent>
          {user ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Typography><b>Student ID:</b> {user.userId}</Typography>
              <Typography><b>Email:</b> {user.email}</Typography>
              <Typography><b>First Name:</b> {user.firstName}</Typography>
              <Typography><b>Last Name:</b> {user.lastName}</Typography>
            </Box>
          ) : (
            <Typography>Not logged in</Typography>
          )}
          {user && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mt={2}>
              <Button variant="contained" onClick={() => setPwdOpen(true)}>Change password</Button>
              <Button variant="outlined" color="error" onClick={() => setDelOpen(true)}>Delete account</Button>
            </Stack>
          )}
        </CardContent>
      </Card>

  <Card id="reviews" variant="outlined">
        <CardHeader title="Review history" subheader={`${total} total`} />
        <CardContent>
          {reviews.length === 0 ? (
            <Typography>No reviews yet</Typography>
          ) : (
            <Stack spacing={2}>
              {reviews.map((r) => (
                <Box key={r.reviewId} p={2} borderRadius={1} bgcolor={(theme) => theme.palette.mode === 'light' ? '#fafafa' : '#1e1e1e'}>
                  <Typography variant="subtitle1">{r.courseId} — {r.semesterId}（{new Date(r.createdAt).toLocaleString()}）</Typography>
                  <Typography variant="body2">content: {r.contentRating} / teaching: {r.teachingRating} / grading: {r.gradingRating} / workload: {r.workloadRating}</Typography>
                  {r.comment && <Typography variant="body2" mt={1}>{r.comment}</Typography>}
                </Box>
              ))}
              <Stack alignItems="center" mt={1}>
                <Pagination
                  count={Math.max(1, Math.ceil(total / PAGE_SIZE))}
                  page={page}
                  onChange={(_, p) => setPage(p)}
                  color="primary"
                />
              </Stack>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* 更改密碼對話框 */}
      <Dialog open={pwdOpen} onClose={() => setPwdOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Change password</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={onPwdSubmit} sx={{ mt: 1 }}>
            <Stack spacing={2}>
              <TextField name="oldPassword" label="Old password" type="password" required />
              <TextField name="newPassword" label="New password" type="password" required helperText="At least 8 chars, include upper/lower case and special char" />
              <TextField name="confirmPassword" label="Confirm new password" type="password" required />
              <DialogActions sx={{ px: 0 }}>
                <Button onClick={() => setPwdOpen(false)}>Cancel</Button>
                <Button type="submit" variant="contained">Submit</Button>
              </DialogActions>
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>

      {/* 刪除帳戶對話框 */}
      <Dialog open={delOpen} onClose={() => setDelOpen(false)}>
        <DialogTitle>Delete account</DialogTitle>
        <DialogContent>
          <Typography>This is a logical delete. Your account will be disabled (negative accessLevel). Continue?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelOpen(false)}>Cancel</Button>
          <Button onClick={onDeleteConfirm} color="error" variant="contained">Confirm delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;
