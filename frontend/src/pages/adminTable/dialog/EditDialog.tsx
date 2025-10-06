import { Dialog, DialogTitle, DialogContent } from '@mui/material';
import { EditForm } from '../Forms';
import type { EntityKind } from '../types';

interface Props {
  open: boolean;
  active: EntityKind;
  currentRow: any | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const EditDialog: React.FC<Props> = ({ open, active, currentRow, onClose, onSubmit }) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>Edit {active}</DialogTitle>
    <DialogContent>
      <EditForm active={active} currentRow={currentRow} onSubmit={onSubmit} onCancel={onClose} />
    </DialogContent>
  </Dialog>
);
