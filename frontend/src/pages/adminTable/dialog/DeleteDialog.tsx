import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteDialog: React.FC<Props> = ({ open, onClose, onConfirm }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Confirm delete</DialogTitle>
    <DialogContent>This will perform a logical delete (or 501 if not supported by schema).</DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button color="error" variant="contained" onClick={onConfirm}>Delete</Button>
    </DialogActions>
  </Dialog>
);
