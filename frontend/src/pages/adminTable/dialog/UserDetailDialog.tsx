import { Dialog, DialogTitle, DialogContent, Divider, Typography, Box } from '@mui/material';

interface Props {
  open: boolean;
  onClose: () => void;
  detailData: any | null;
}

export const UserDetailDialog: React.FC<Props> = ({ open, onClose, detailData }) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
    <DialogTitle>User details</DialogTitle>
    <DialogContent>
      {detailData ? (
        <Box>
          <Typography variant="subtitle1">{detailData.user.userId} — {detailData.user.email}</Typography>
          <Typography variant="body2">{detailData.user.firstName} {detailData.user.lastName} | accessLevel: {detailData.user.accessLevel} | loginFail: {detailData.user.loginFail}</Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2">Reviews: {detailData.reviews?.length ?? 0}</Typography>
          <Box component="ul">
            {(detailData.reviews || []).map((r: any) => (
              <li key={r.reviewId}>
                [{r.createdAt}] {r.courseId} {r.semesterId} — content:{r.contentRating} teaching:{r.teachingRating} grading:{r.gradingRating} workload:{r.workloadRating}{r.comment ? ` — ${r.comment}` : ''}
              </li>
            ))}
          </Box>
        </Box>
      ) : 'Loading...'}
    </DialogContent>
  </Dialog>
);
