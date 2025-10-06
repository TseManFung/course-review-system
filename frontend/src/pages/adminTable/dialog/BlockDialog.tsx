import { Dialog, DialogTitle, DialogActions, Button } from '@mui/material';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const BlockDialog: React.FC<Props> = ({ open, onClose, onConfirm }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Block/Unblock user</DialogTitle>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button variant="contained" onClick={onConfirm}>Confirm</Button>
    </DialogActions>
  </Dialog>
);
