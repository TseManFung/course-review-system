import React from 'react';
import { Stack, TextField, DialogActions, Button, Typography } from '@mui/material';
import type { EntityKind } from './types';

interface FormProps {
  active: EntityKind;
  currentRow?: any | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

export const CreateForm: React.FC<FormProps> = ({ active, onSubmit, onCancel }) => {
  if (active === 'department') {
    return (
      <Stack component="form" onSubmit={onSubmit} spacing={2}>
        <TextField name="departmentId" label="departmentId" required />
        <TextField name="name" label="name" required />
        <DialogActions>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="contained">Submit</Button>
        </DialogActions>
      </Stack>
    );
  }
  if (active === 'semester') {
    return (
      <Stack component="form" onSubmit={onSubmit} spacing={2}>
        <TextField name="semesterId" label="semesterId (YYYYsem1-3)" required />
        <TextField name="name" label="name" required />
        <DialogActions>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="contained">Submit</Button>
        </DialogActions>
      </Stack>
    );
  }
  if (active === 'encouragement') {
    return (
      <Stack component="form" onSubmit={onSubmit} spacing={2}>
        <TextField name="content" label="content" required multiline minRows={3} inputProps={{ maxLength: 248 }} />
        <DialogActions>
          <Button onClick={onCancel}>Cancel</Button>
            <Button type="submit" variant="contained">Submit</Button>
        </DialogActions>
      </Stack>
    );
  }
  return <Typography>This module does not support creation</Typography>;
};

export const EditForm: React.FC<FormProps> = ({ active, currentRow, onSubmit, onCancel }) => {
  if (!currentRow) return null;
  if (active === 'department') {
    return (
      <Stack component="form" onSubmit={onSubmit} spacing={2}>
        <TextField label="departmentId" value={currentRow.departmentId} disabled />
        <TextField name="name" label="name" defaultValue={currentRow.name} required />
        <DialogActions>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="contained">Save</Button>
        </DialogActions>
      </Stack>
    );
  }
  if (active === 'semester') {
    return (
      <Stack component="form" onSubmit={onSubmit} spacing={2}>
        <TextField label="semesterId" value={currentRow.semesterId} disabled />
        <TextField name="name" label="name" defaultValue={currentRow.name} required />
        <DialogActions>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="contained">Save</Button>
        </DialogActions>
      </Stack>
    );
  }
  if (active === 'course') {
    return (
      <Stack component="form" onSubmit={onSubmit} spacing={2}>
        <TextField label="courseId" value={currentRow.courseId} disabled />
        <TextField name="departmentId" label="departmentId" defaultValue={currentRow.departmentId} />
        <TextField name="name" label="name" defaultValue={currentRow.name} />
        <TextField name="description" label="description" defaultValue={currentRow.description} multiline minRows={3} />
        <TextField name="credits" label="credits" type="number" defaultValue={currentRow.credits} />
        <DialogActions>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="contained">Save</Button>
        </DialogActions>
      </Stack>
    );
  }
  if (active === 'instructor') {
    return (
      <Stack component="form" onSubmit={onSubmit} spacing={2}>
        <TextField label="instructorId" value={currentRow.instructorId} disabled />
        <TextField name="firstName" label="firstName" defaultValue={currentRow.firstName} />
        <TextField name="lastName" label="lastName" defaultValue={currentRow.lastName} />
        <TextField name="email" label="email" defaultValue={currentRow.email} />
        <TextField name="departmentId" label="departmentId" defaultValue={currentRow.departmentId} />
        <DialogActions>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="contained">Save</Button>
        </DialogActions>
      </Stack>
    );
  }
  if (active === 'encouragement') {
    return (
      <Stack component="form" onSubmit={onSubmit} spacing={2}>
        <TextField label="encouragementId" value={currentRow.encouragementId} disabled />
        <TextField name="content" label="content" defaultValue={currentRow.content} multiline minRows={3} />
        <DialogActions>
          <Button onClick={onCancel}>取消</Button>
          <Button type="submit" variant="contained">儲存</Button>
        </DialogActions>
      </Stack>
    );
  }
  return <Typography>No edit form for this module</Typography>;
};
