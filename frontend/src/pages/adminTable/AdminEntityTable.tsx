import React from 'react';
import { Card, CardContent, Stack, Typography, TextField, Button, FormControl, InputLabel, Select, MenuItem, Box } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import type { EntityKind } from './types';

interface Props {
  active: EntityKind;
  columns: GridColDef[];
  rows: any[];
  loading: boolean;
  total: number;
  page: number; // 1-based
  pageSize: number;
  pageSizes: readonly number[];
  search: string;
  onSearchChange: (v: string) => void;
  onSearchSubmit: () => void;
  onPaginationChange: (page: number, pageSize: number) => void;
}

export const AdminEntityTable: React.FC<Props> = ({
  active, columns, rows, loading, total, page, pageSize, pageSizes,
  search, onSearchChange, onSearchSubmit, onPaginationChange
}) => {
  return (
    <Card>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Typography variant="h6">{active.toUpperCase()}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField size="small" placeholder="Search..." value={search} onChange={(e) => onSearchChange(e.target.value)} />
            <Button variant="outlined" onClick={() => { onSearchSubmit(); }}>Search</Button>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="psize">Rows</InputLabel>
              <Select labelId="psize" label="Rows" value={pageSize} onChange={(e) => { onPaginationChange(1, Number(e.target.value)); }}>
                {pageSizes.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
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
            pageSizeOptions={pageSizes as unknown as number[]}
            paginationModel={{ page: page - 1, pageSize }}
            onPaginationModelChange={(model) => {
              const nextPage = (model.page ?? 0) + 1;
              const nextSize = model.pageSize ?? pageSize;
              onPaginationChange(nextPage, nextSize);
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};
