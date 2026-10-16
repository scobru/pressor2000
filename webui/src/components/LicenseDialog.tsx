// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 scobru
import React from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Link as MuiLink,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { DISPLAY_VERSION } from '../version';
import { openUrl } from '../bridge/juce';

import licensesRaw from '../assets/licenses.json';

type LicenseCheckerEntry = {
  licenses?: string | string[];
  publisher?: string;
  url?: string;
  repository?: string;
};

type LicensesMap = Record<string, LicenseCheckerEntry>;

function mapToRows(data: LicensesMap) {
  return Object.entries(data).map(([pkgAndVersion, info]) => {
    const at = pkgAndVersion.lastIndexOf('@');
    const name = at > 0 ? pkgAndVersion.slice(0, at) : pkgAndVersion;
    const version = at > 0 ? pkgAndVersion.slice(at + 1) : '';
    const licenses = Array.isArray(info.licenses) ? info.licenses.join(', ') : info.licenses || '';
    return {
      key: pkgAndVersion,
      name,
      version,
      licenses,
      publisher: info.publisher || '',
      repository: info.repository || info.url || '',
    };
  });
}

export interface LicenseDialogProps {
  open: boolean;
  onClose: () => void;
}

export const LicenseDialog: React.FC<LicenseDialogProps> = ({ open, onClose }) => {
  const data: LicensesMap = licensesRaw as unknown as LicensesMap;
  const rows = React.useMemo(() => mapToRows(data), [data]);

  const handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    event.preventDefault();
    openUrl(url);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      slotProps={{
        paper: {
          sx: {
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#12151f',
            border: '1px solid #222938',
            borderRadius: 2,
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8)',
          },
        },
      }}
    >
      <DialogContent sx={{ fontSize: '0.80rem', display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minHeight: 0, p: 2.5 }}>
        <Box sx={{ textAlign: 'center', py: 0.5 }}>
          <Typography variant='h6' sx={{ fontWeight: 800, letterSpacing: '1px', fontSize: '1.35rem', color: '#00d2ff', textShadow: '0 0 12px rgba(0, 210, 255, 0.4)' }}>
            PRESSOR 2000
          </Typography>
          <Typography variant='caption' sx={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
            v{DISPLAY_VERSION}
          </Typography>
          <Typography variant='body2' sx={{ mt: 0.5, fontSize: '0.82rem', color: '#f8fafc' }}>
            Maintained by{' '}
            <MuiLink
              href='https://github.com/scobru'
              onClick={(e) => handleLinkClick(e, 'https://github.com/scobru')}
              sx={{ cursor: 'pointer', color: '#00d2ff', fontWeight: 600 }}
            >
              scobru
            </MuiLink>
          </Typography>
          <Typography variant='body2' sx={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Built with JUCE 8 • Ultra Low Latency DSP
          </Typography>
          <Typography variant='caption' sx={{ display: 'block', mt: 0.75, fontSize: '0.72rem', color: '#64748b' }}>
            Licensed under{' '}
            <MuiLink
              href='https://www.gnu.org/licenses/agpl-3.0.html'
              onClick={(e) => handleLinkClick(e, 'https://www.gnu.org/licenses/agpl-3.0.html')}
              sx={{ cursor: 'pointer', color: '#00d2ff' }}
            >
              GNU AGPLv3 or later
            </MuiLink>
            {' — '}
            <MuiLink
              href='https://github.com/scobru/pressor2000'
              onClick={(e) => handleLinkClick(e, 'https://github.com/scobru/pressor2000')}
              sx={{ cursor: 'pointer', color: '#00d2ff' }}
            >
              Source on GitHub
            </MuiLink>
          </Typography>
          <Typography variant='caption' sx={{ display: 'block', mt: 0.5, fontSize: '0.66rem', lineHeight: 1.35, fontStyle: 'italic', maxWidth: 480, mx: 'auto', color: '#64748b' }}>
            This program is distributed WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
          </Typography>
        </Box>

        <Divider sx={{ my: 0.5, borderColor: '#222938' }} />

        <Typography variant='subtitle2' sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          Core Libraries
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, pl: 1, mb: 0.5 }}>
          {[
            { name: 'JUCE', license: 'AGPLv3 / Commercial', url: 'https://juce.com/' },
            { name: 'VST3 SDK', license: 'MIT', url: 'https://github.com/steinbergmedia/vst3sdk' },
            { name: 'CLAP SDK', license: 'MIT', url: 'https://github.com/free-audio/clap' },
            { name: 'AAX SDK', license: 'GPLv3 / Commercial (Avid)', url: 'https://developer.avid.com/aax' },
          ].map((lib) => (
            <Box key={lib.name} sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, fontSize: '0.75rem' }}>
              <MuiLink
                href={lib.url}
                onClick={(e) => handleLinkClick(e, lib.url)}
                sx={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', minWidth: 130, color: '#00d2ff' }}
              >
                {lib.name}
              </MuiLink>
              <Typography variant='caption' sx={{ fontSize: '0.70rem', color: '#94a3b8' }}>
                {lib.license}
              </Typography>
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 0.5, borderColor: '#222938' }} />

        <Typography variant='subtitle2' sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          Frontend Dependencies
        </Typography>

        <TableContainer component={Paper} variant='outlined' sx={{ flex: 1, minHeight: 100, overflow: 'auto', backgroundColor: '#0b0e14', border: '1px solid #222938' }}>
          <Table
            size='small'
            stickyHeader
            sx={{
              '& th, & td': { fontSize: '0.72rem', lineHeight: 1.2, py: 0.5, px: 1, borderColor: '#222938' },
              '& thead th': { fontWeight: 700, backgroundColor: '#141721', color: '#00d2ff' },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Package</TableCell>
                <TableCell>License</TableCell>
                <TableCell>Publisher</TableCell>
                <TableCell>Repository</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography variant='body2' sx={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Package information available in release bundle.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.key} hover sx={{ '&:hover': { backgroundColor: 'rgba(0, 210, 255, 0.05)' } }}>
                    <TableCell>
                      <Typography variant='body2' sx={{ fontWeight: 600, fontSize: '0.78rem', color: '#f8fafc' }}>
                        {r.name}
                      </Typography>
                      <Typography variant='caption' sx={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                        {r.version}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#94a3b8' }}>{r.licenses}</TableCell>
                    <TableCell sx={{ color: '#94a3b8' }}>{r.publisher}</TableCell>
                    <TableCell sx={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.repository ? (
                        <MuiLink
                          href={r.repository}
                          onClick={(e) => handleLinkClick(e, r.repository)}
                          sx={{ cursor: 'pointer', color: '#00d2ff' }}
                        >
                          {r.repository}
                        </MuiLink>
                      ) : (
                        <Typography variant='caption' sx={{ color: '#64748b' }}>
                          -
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1, borderTop: '1px solid #222938', backgroundColor: '#0e121a' }}>
        <Button onClick={onClose} variant='contained' size='small' sx={{ py: 0.35, px: 2, fontSize: '0.80rem', backgroundColor: '#00d2ff', color: '#090c12', fontWeight: 700, '&:hover': { backgroundColor: '#38bdf8' } }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LicenseDialog;
