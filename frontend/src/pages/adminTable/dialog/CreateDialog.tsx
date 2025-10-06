import { Dialog, DialogTitle, DialogContent } from '@mui/material';
import { CreateForm } from '../Forms';
import type { EntityKind } from '../types';

interface Props {
  open: boolean;
  active: EntityKind;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const CreateDialog: React.FC<Props> = ({ open, active, onClose, onSubmit }) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>New {active}</DialogTitle>
    <DialogContent>
      <CreateForm active={active} onSubmit={onSubmit} onCancel={onClose} />
    </DialogContent>
  </Dialog>
);
