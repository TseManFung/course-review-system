import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/AddCircleOutline';
import BlockIcon from '@mui/icons-material/Block';
import api from '../api';
import { useAuth } from '../context/AuthContext';

type EntityKind =
  | 'department'
  | 'semester'
  | 'course'
  | 'review'
  | 'instructor'
  | 'encouragement'
  | 'user';

type PagedResp<T> = { total: number; rows: T[] };

const PAGE_SIZES = [30, 50, 80, 100] as const;

const DRAWER_WIDTH = 260;

const Admin: React.FC = () => {
  const { user } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(true);
  const [active, setActive] = useState<EntityKind>('department');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(30);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog state (create/edit/delete)
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<any | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);

  // Permission: admin only
  useEffect(() => {
    if (!user) return;
    if (user.accessLevel !== 0) {
      // 非管理員，導回首頁
      window.location.href = '/';
    }
  }, [user]);

  // Column config
  const columns: GridColDef[] = useMemo(() => {
    switch (active) {
      case 'department':
        return [
          { field: 'departmentId', headerName: 'departmentId', flex: 1 },
          { field: 'name', headerName: 'name', flex: 2 },
          {
            field: 'actions',
            headerName: 'Actions',
            sortable: false,
            renderCell: (params) => (
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <Stack direction="row" spacing={1}>
                  <IconButton size="small" onClick={() => { setCurrentRow(params.row); setEditOpen(true); }}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => { setCurrentRow(params.row); setDeleteOpen(true); }}><DeleteIcon fontSize="small" /></IconButton>
                </Stack>
              </Box>
            ),
          },
        ];
      case 'semester':
        return [
          { field: 'semesterId', headerName: 'semesterId', flex: 1 },
          { field: 'name', headerName: 'name', flex: 2 },
          {
            field: 'actions', headerName: 'Actions', sortable: false,
            renderCell: (p) => (
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <Stack direction="row" spacing={1}>
                  <IconButton size="small" onClick={() => { setCurrentRow(p.row); setEditOpen(true); }}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => { setCurrentRow(p.row); setDeleteOpen(true); }}><DeleteIcon fontSize="small" /></IconButton>
                </Stack>
              </Box>
            )
          }
        ];
      case 'course':
        return [
          { field: 'courseId', headerName: 'courseId', flex: 1 },
          { field: 'departmentId', headerName: 'departmentId', flex: 1 },
          { field: 'name', headerName: 'name', flex: 1.5 },
          { field: 'description', headerName: 'description', flex: 2 },
          { field: 'credits', headerName: 'credits', flex: 0.6, type: 'number' },
          {
            field: 'actions', headerName: 'Actions', sortable: false,
            renderCell: (p) => (
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <Stack direction="row" spacing={1}>
                  <IconButton size="small" onClick={() => { setCurrentRow(p.row); setEditOpen(true); }}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => { setCurrentRow(p.row); setDeleteOpen(true); }}><DeleteIcon fontSize="small" /></IconButton>
                </Stack>
              </Box>
            )
          }
        ];
      case 'review':
        return [
          { field: 'reviewId', headerName: 'reviewId', flex: 1 },
          { field: 'userId', headerName: 'userId', flex: 1 },
          { field: 'courseId', headerName: 'courseId', flex: 1 },
          { field: 'semesterId', headerName: 'semesterId', flex: 1 },
          { field: 'contentRating', headerName: 'content', flex: 0.6 },
          { field: 'teachingRating', headerName: 'teaching', flex: 0.6 },
          { field: 'gradingRating', headerName: 'grading', flex: 0.6 },
          { field: 'workloadRating', headerName: 'workload', flex: 0.6 },
          { field: 'comment', headerName: 'comment', flex: 2 },
          { field: 'createdAt', headerName: 'createdAt', flex: 1 },
          {
            field: 'actions', headerName: 'Actions', sortable: false,
            renderCell: (p) => (
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <Stack direction="row" spacing={1}>
                  <IconButton size="small" color="error" onClick={() => { setCurrentRow(p.row); setDeleteOpen(true); }}><DeleteIcon fontSize="small" /></IconButton>
                </Stack>
              </Box>
            )
          }
        ];
      case 'instructor':
        return [
          { field: 'instructorId', headerName: 'instructorId', flex: 1 },
          { field: 'firstName', headerName: 'firstName', flex: 1 },
          { field: 'lastName', headerName: 'lastName', flex: 1 },
          { field: 'email', headerName: 'email', flex: 1.5 },
          { field: 'departmentId', headerName: 'departmentId', flex: 1 },
          {
            field: 'actions', headerName: 'Actions', sortable: false,
            renderCell: (p) => (
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <Stack direction="row" spacing={1}>
                  <IconButton size="small" onClick={() => { setCurrentRow(p.row); setEditOpen(true); }}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => { setCurrentRow(p.row); setDeleteOpen(true); }}><DeleteIcon fontSize="small" /></IconButton>
                </Stack>
              </Box>
            )
          }
        ];
      case 'encouragement':
        return [
          { field: 'encouragementId', headerName: 'encouragementId', flex: 1 },
          { field: 'content', headerName: 'content', flex: 3 },
          {
            field: 'actions', headerName: 'Actions', sortable: false,
            renderCell: (p) => (
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <Stack direction="row" spacing={1}>
                  <IconButton size="small" onClick={() => { setCurrentRow(p.row); setEditOpen(true); }}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => { setCurrentRow(p.row); setDeleteOpen(true); }}><DeleteIcon fontSize="small" /></IconButton>
                </Stack>
              </Box>
            )
          }
        ];
      case 'user':
        return [
          { field: 'userId', headerName: 'userId', flex: 1 },
          { field: 'email', headerName: 'email', flex: 1.5 },
          { field: 'firstName', headerName: 'firstName', flex: 1 },
          { field: 'lastName', headerName: 'lastName', flex: 1 },
          { field: 'accessLevel', headerName: 'accessLevel', flex: 0.8 },
          { field: 'loginFail', headerName: 'loginFail', flex: 0.8 },
          { field: 'createdAt', headerName: 'createdAt', flex: 1 },
          { field: 'updatedAt', headerName: 'updatedAt', flex: 1 },
          {
            field: 'actions', headerName: 'Actions', sortable: false,
            renderCell: (p) => (
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <Stack direction="row" spacing={1}>
                  <IconButton size="small" onClick={() => { setCurrentRow(p.row); setBlockOpen(true); }}><BlockIcon fontSize="small" /></IconButton>
                  <Button size="small" onClick={() => handleUserDetail(p.row)}>Detail</Button>
                </Stack>
              </Box>
            )
          }
        ];
      default:
        return [];
    }
  }, [active]);

  // Data loading
  const loadData = async () => {
    try {
      setLoading(true);
      const params = { page, limit: pageSize, search: search || undefined } as any;
      let url = '';
      switch (active) {
        case 'department': url = '/department'; break;
        case 'semester': url = '/semester'; break;
        case 'course': url = '/course'; break;
        case 'review': url = '/review'; break;
        case 'instructor': url = '/instructor'; break;
        case 'encouragement': url = '/encouragement'; break;
        case 'user': url = '/user'; break;
      }
      const { data } = await api.get<PagedResp<any>>(url, { params });
      setTotal(data.total);
      setRows((data.rows || []).map((r: any, idx: number) => ({
        id:
          r.id
          ?? r.reviewId
          ?? r.courseId
          ?? r.semesterId
          ?? r.instructorId
          ?? r.departmentId
          ?? r.encouragementId
          ?? r.userId
          ?? idx,
        ...r
      })));
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [active, page, pageSize]);

  const refresh = () => loadData();

  // Event: switch entity
  const switchTo = (k: EntityKind) => { setActive(k); setPage(1); setSearch(''); };

  // Action: user detail
  async function handleUserDetail(row: any) {
    setCurrentRow(row);
    const { data } = await api.get(`/user/${row.userId}/details`);
    setDetailData(data);
    setDetailOpen(true);
  }

  // Action: delete (logical)
  async function handleDeleteConfirm() {
    if (!currentRow) return;
    const id = currentRow.reviewId ?? currentRow.courseId ?? currentRow.semesterId ?? currentRow.departmentId ?? currentRow.instructorId ?? currentRow.encouragementId;
    const base = active;
    const endpoint = base === 'review' ? `/review/${id}/delete`
      : base === 'course' ? `/course/${id}/delete`
      : base === 'semester' ? `/semester/${id}/delete`
      : base === 'department' ? `/department/${id}/delete`
      : base === 'instructor' ? `/instructor/${id}/delete`
      : base === 'encouragement' ? `/encouragement/${id}/delete`
      : '';
    if (!endpoint) return;
    await api.patch(endpoint, {});
    setDeleteOpen(false);
    refresh();
  }

  // Action: create
  async function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (active === 'department') {
      await api.post('/department', { departmentId: form.get('departmentId'), name: form.get('name') });
    } else if (active === 'semester') {
      await api.post('/semester', { semesterId: form.get('semesterId'), name: form.get('name') });
    } else if (active === 'encouragement') {
      await api.post('/encouragement', { content: form.get('content') });
    }
    setCreateOpen(false);
    refresh();
  }

  // Action: edit
  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!currentRow) return;
    const form = new FormData(e.currentTarget);
    if (active === 'department') {
      await api.patch(`/department/${currentRow.departmentId}`, { name: form.get('name') });
    } else if (active === 'semester') {
      await api.patch(`/semester/${currentRow.semesterId}`, { name: form.get('name') });
    } else if (active === 'course') {
      await api.patch(`/course/${currentRow.courseId}`, {
        departmentId: form.get('departmentId') || undefined,
        name: form.get('name') || undefined,
        description: form.get('description') || undefined,
        credits: form.get('credits') ? Number(form.get('credits')) : undefined,
      });
    } else if (active === 'instructor') {
      await api.patch(`/instructor/${currentRow.instructorId}`, {
        firstName: form.get('firstName') || undefined,
        lastName: form.get('lastName') || undefined,
        email: form.get('email') || undefined,
        departmentId: form.get('departmentId') || undefined,
      });
    } else if (active === 'encouragement') {
      await api.patch(`/encouragement/${currentRow.encouragementId}`, { content: form.get('content') || undefined });
    }
    setEditOpen(false);
    refresh();
  }

  // Action: block/unblock
  async function handleBlockConfirm() {
    if (!currentRow) return;
    const blocked = currentRow.accessLevel < 0;
    if (blocked) {
      await api.patch(`/user/${currentRow.userId}/block`, { block: false, restoreLevel: 10000 });
    } else {
      await api.patch(`/user/${currentRow.userId}/block`, { block: true });
    }
    setBlockOpen(false);
    refresh();
  }

  const renderCreateForm = () => {
    if (active === 'department') {
      return (
        <Stack component="form" onSubmit={handleCreateSubmit} spacing={2}>
          <TextField name="departmentId" label="departmentId" required />
          <TextField name="name" label="name" required />
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Submit</Button>
          </DialogActions>
        </Stack>
      );
    }
    if (active === 'semester') {
      return (
        <Stack component="form" onSubmit={handleCreateSubmit} spacing={2}>
          <TextField name="semesterId" label="semesterId (YYYYsem1-3)" required />
          <TextField name="name" label="name" required />
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Submit</Button>
          </DialogActions>
        </Stack>
      );
    }
    if (active === 'encouragement') {
      return (
        <Stack component="form" onSubmit={handleCreateSubmit} spacing={2}>
          <TextField name="content" label="content" required multiline minRows={3} inputProps={{ maxLength: 248 }} />
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Submit</Button>
          </DialogActions>
        </Stack>
      );
    }
  return <Typography>This module does not support creation</Typography>;
  };

  const renderEditForm = () => {
    if (!currentRow) return null;
    if (active === 'department') {
      return (
        <Stack component="form" onSubmit={handleEditSubmit} spacing={2}>
          <TextField label="departmentId" value={currentRow.departmentId} disabled />
          <TextField name="name" label="name" defaultValue={currentRow.name} required />
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </Stack>
      );
    }
    if (active === 'semester') {
      return (
        <Stack component="form" onSubmit={handleEditSubmit} spacing={2}>
          <TextField label="semesterId" value={currentRow.semesterId} disabled />
          <TextField name="name" label="name" defaultValue={currentRow.name} required />
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </Stack>
      );
    }
    if (active === 'course') {
      return (
        <Stack component="form" onSubmit={handleEditSubmit} spacing={2}>
          <TextField label="courseId" value={currentRow.courseId} disabled />
          <TextField name="departmentId" label="departmentId" defaultValue={currentRow.departmentId} />
          <TextField name="name" label="name" defaultValue={currentRow.name} />
          <TextField name="description" label="description" defaultValue={currentRow.description} multiline minRows={3} />
          <TextField name="credits" label="credits" type="number" defaultValue={currentRow.credits} />
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </Stack>
      );
    }
    if (active === 'instructor') {
      return (
        <Stack component="form" onSubmit={handleEditSubmit} spacing={2}>
          <TextField label="instructorId" value={currentRow.instructorId} disabled />
          <TextField name="firstName" label="firstName" defaultValue={currentRow.firstName} />
          <TextField name="lastName" label="lastName" defaultValue={currentRow.lastName} />
          <TextField name="email" label="email" defaultValue={currentRow.email} />
          <TextField name="departmentId" label="departmentId" defaultValue={currentRow.departmentId} />
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </Stack>
      );
    }
    if (active === 'encouragement') {
      return (
        <Stack component="form" onSubmit={handleEditSubmit} spacing={2}>
          <TextField label="encouragementId" value={currentRow.encouragementId} disabled />
          <TextField name="content" label="content" defaultValue={currentRow.content} multiline minRows={3} />
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>取消</Button>
            <Button type="submit" variant="contained">儲存</Button>
          </DialogActions>
        </Stack>
      );
    }
  return <Typography>No edit form for this module</Typography>;
  };

  return (
    // Full-bleed layout: escape potential parent Container max-width 只改這裡，不動外層 Container
    <Box
      sx={{
        display: 'flex',
        position: 'relative',
        left: '50%',
        right: '50%',
        marginLeft: '-50vw',
        marginRight: '-50vw',
        width: '100vw',
        maxWidth: '100vw',
        overflowX: 'hidden'
      }}
    >
  {/* Sidebar */}
      <Drawer
        variant="persistent"
        open={drawerOpen}
        sx={{
          '& .MuiDrawer-paper': {
            top: { xs: 56, sm: 64 }, // offset AppBar height
            height: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
            width: DRAWER_WIDTH,
            boxSizing: 'border-box'
          }
        }}
      >
        <Toolbar sx={{ minWidth: 260 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%">
            <Typography variant="h6">Admin</Typography>
            <IconButton onClick={() => setDrawerOpen(false)}><ChevronLeftIcon /></IconButton>
          </Stack>
        </Toolbar>
        <Divider />
        <Box p={2}>
          <Stack spacing={1}>
            <Button variant={active==='department'?'contained':'text'} onClick={() => switchTo('department')}>Departments</Button>
            <Button variant={active==='semester'?'contained':'text'} onClick={() => switchTo('semester')}>Semesters</Button>
            <Button variant={active==='course'?'contained':'text'} onClick={() => switchTo('course')}>Courses</Button>
            <Button variant={active==='review'?'contained':'text'} onClick={() => switchTo('review')}>Reviews</Button>
            <Button variant={active==='instructor'?'contained':'text'} onClick={() => switchTo('instructor')}>Instructors</Button>
            <Button variant={active==='encouragement'?'contained':'text'} onClick={() => switchTo('encouragement')}>Encouragement</Button>
            <Button variant={active==='user'?'contained':'text'} onClick={() => switchTo('user')}>Users</Button>
          </Stack>

          <Divider sx={{ my: 2 }} />
          <Stack spacing={1}>
            <Typography variant="subtitle2">Create</Typography>
            <Button startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} disabled={!['department','semester','encouragement'].includes(active)}>
              {active === 'department' ? 'New department' : active === 'semester' ? 'New semester' : active === 'encouragement' ? 'New encouragement' : 'Not supported'}
            </Button>
          </Stack>
        </Box>
      </Drawer>

        {!drawerOpen && (
          <IconButton
            onClick={() => setDrawerOpen(true)}
            aria-label="open navigation"
            sx={{
              position: 'fixed',
              top: { xs: 'calc(56px + 8px)', sm: 'calc(64px + 8px)' }, // below AppBar
              left: 8,
              zIndex: (theme) => theme.zIndex.appBar + 1,
              bgcolor: 'background.paper',
              boxShadow: 1,
              '&:hover': { bgcolor: 'action.hover' },
              transition: 'background-color .25s ease'
            }}
          >
            <MenuIcon />
          </IconButton>
        )}

  {/* Main area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 2,
          ml: drawerOpen ? `${DRAWER_WIDTH}px` : 0,
          width: drawerOpen ? `calc(100vw - ${DRAWER_WIDTH}px)` : '100vw',
          transition: (theme) => theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.shorter
          }),
        }}
      >

        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
              <Typography variant="h6">{active.toUpperCase()}</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <TextField size="small" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <Button variant="outlined" onClick={() => { setPage(1); loadData(); }}>Search</Button>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel id="psize">Rows</InputLabel>
                  <Select labelId="psize" label="Rows" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                    {PAGE_SIZES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
            </Stack>

            <Box mt={2} sx={{ height: 560, width: '100%' }}>
              <DataGrid
                loading={loading}
                rows={rows}
                columns={columns}
                pagination
                paginationMode="server"
                rowCount={total}
                pageSizeOptions={PAGE_SIZES as unknown as number[]}
                paginationModel={{ page: page - 1, pageSize }}
                onPaginationModelChange={(model) => {
                  const nextPage = (model.page ?? 0) + 1;
                  const nextSize = model.pageSize ?? pageSize;
                  setPage(nextPage);
                  setPageSize(nextSize);
                }}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>

  {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
  <DialogTitle>New {active}</DialogTitle>
        <DialogContent>{renderCreateForm()}</DialogContent>
      </Dialog>

  {/* Edit dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
  <DialogTitle>Edit {active}</DialogTitle>
        <DialogContent>{renderEditForm()}</DialogContent>
      </Dialog>

  {/* Delete dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Confirm delete</DialogTitle>
        <DialogContent>
          This will perform a logical delete (or 501 if not supported by schema).
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirm}>Delete</Button>
        </DialogActions>
      </Dialog>

  {/* Block/Unblock dialog */}
      <Dialog open={blockOpen} onClose={() => setBlockOpen(false)}>
        <DialogTitle>Block/Unblock user</DialogTitle>
        <DialogActions>
          <Button onClick={() => setBlockOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleBlockConfirm}>Confirm</Button>
        </DialogActions>
      </Dialog>

  {/* User details dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="md">
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
                    [{r.createdAt}] {r.courseId} {r.semesterId} — content:{r.contentRating} teaching:{r.teachingRating} grading:{r.gradingRating} workload:{r.workloadRating}
                    {r.comment ? ` — ${r.comment}` : ''}
                  </li>
                ))}
              </Box>
            </Box>
          ) : 'Loading...'}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Admin;
