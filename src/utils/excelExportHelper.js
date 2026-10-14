import XLSX from 'xlsx-js-style';

/**
 * Palet warna & gaya sel resmi PresenTrain
 */
export const EXCEL_STYLES = {
  title: {
    font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: '065F46' } },
    alignment: { vertical: 'center', horizontal: 'left' }
  },
  subtitle: {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '1E293B' } },
    alignment: { vertical: 'center', horizontal: 'left' }
  },
  meta: {
    font: { name: 'Calibri', sz: 9, italic: true, color: { rgb: '64748B' } },
    alignment: { vertical: 'center', horizontal: 'left' }
  },
  headerMain: {
    fill: { fgColor: { rgb: '059669' } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '047857' } },
      bottom: { style: 'thin', color: { rgb: '047857' } },
      left: { style: 'thin', color: { rgb: '047857' } },
      right: { style: 'thin', color: { rgb: '047857' } }
    }
  },
  headerSub: {
    fill: { fgColor: { rgb: '047857' } },
    font: { name: 'Calibri', sz: 9, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '065F46' } },
      bottom: { style: 'thin', color: { rgb: '065F46' } },
      left: { style: 'thin', color: { rgb: '065F46' } },
      right: { style: 'thin', color: { rgb: '065F46' } }
    }
  },
  cellNormal: {
    font: { name: 'Calibri', sz: 10, color: { rgb: '0F172A' } },
    alignment: { vertical: 'center', horizontal: 'left' },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  cellCenter: {
    font: { name: 'Calibri', sz: 10, color: { rgb: '0F172A' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  cellBold: {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0F172A' } },
    alignment: { vertical: 'center', horizontal: 'left' },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  cellHighlight: {
    fill: { fgColor: { rgb: 'F0FDF4' } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '065F46' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  cellTotal: {
    fill: { fgColor: { rgb: 'ECFDF5' } },
    font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: '0F172A' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  statusHadir: {
    fill: { fgColor: { rgb: 'D1FAE5' } },
    font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: '065F46' } },
    alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  statusIzin: {
    fill: { fgColor: { rgb: 'FEF3C7' } },
    font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: '92400E' } },
    alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  statusAbsen: {
    fill: { fgColor: { rgb: 'F1F5F9' } },
    font: { name: 'Calibri', sz: 9.5, color: { rgb: '64748B' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  footer: {
    fill: { fgColor: { rgb: 'E2E8F0' } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0F172A' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '94A3B8' } },
      bottom: { style: 'thin', color: { rgb: '94A3B8' } },
      left: { style: 'thin', color: { rgb: '94A3B8' } },
      right: { style: 'thin', color: { rgb: '94A3B8' } }
    }
  },
  headerAfektif: {
    fill: { fgColor: { rgb: 'FEF08A' } },
    font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: '713F12' } },
    alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'EAB308' } },
      bottom: { style: 'thin', color: { rgb: 'EAB308' } },
      left: { style: 'thin', color: { rgb: 'EAB308' } },
      right: { style: 'thin', color: { rgb: 'EAB308' } }
    }
  },
  headerPsiko: {
    fill: { fgColor: { rgb: '38BDF8' } },
    font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: '0C4A6E' } },
    alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '0284C7' } },
      bottom: { style: 'thin', color: { rgb: '0284C7' } },
      left: { style: 'thin', color: { rgb: '0284C7' } },
      right: { style: 'thin', color: { rgb: '0284C7' } }
    }
  },
  headerOrange: {
    fill: { fgColor: { rgb: 'FB923C' } },
    font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'EA580C' } },
      bottom: { style: 'thin', color: { rgb: 'EA580C' } },
      left: { style: 'thin', color: { rgb: 'EA580C' } },
      right: { style: 'thin', color: { rgb: 'EA580C' } }
    }
  },
  headerGreen: {
    fill: { fgColor: { rgb: '86EFAC' } },
    font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: '14532D' } },
    alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '22C55E' } },
      bottom: { style: 'thin', color: { rgb: '22C55E' } },
      left: { style: 'thin', color: { rgb: '22C55E' } },
      right: { style: 'thin', color: { rgb: '22C55E' } }
    }
  },
  sessionBanner: {
    fill: { fgColor: { rgb: 'F1F5F9' } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0F172A' } },
    alignment: { vertical: 'center', horizontal: 'left' },
    border: {
      top: { style: 'thin', color: { rgb: '94A3B8' } },
      bottom: { style: 'thin', color: { rgb: '94A3B8' } },
      left: { style: 'thin', color: { rgb: '94A3B8' } },
      right: { style: 'thin', color: { rgb: '94A3B8' } }
    }
  },
  metaRight: {
    font: { name: 'Calibri', sz: 9, italic: true, color: { rgb: '334155' } },
    alignment: { vertical: 'center', horizontal: 'right' }
  },
  // Dedicated styles untuk matriks aktivitas forum & rubrik sesi
  sessionBannerEmerald: {
    fill: { fgColor: { rgb: '064E3B' } },
    font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
    border: {
      top: { style: 'thin', color: { rgb: '047857' } },
      bottom: { style: 'thin', color: { rgb: '047857' } },
      left: { style: 'thin', color: { rgb: '047857' } },
      right: { style: 'thin', color: { rgb: '047857' } }
    }
  },
  sessionBannerPenilai: {
    fill: { fgColor: { rgb: '065F46' } },
    font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: 'ECFDF5' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '047857' } },
      bottom: { style: 'thin', color: { rgb: '047857' } },
      left: { style: 'thin', color: { rgb: '047857' } },
      right: { style: 'thin', color: { rgb: '047857' } }
    }
  },
  sessionBannerTime: {
    fill: { fgColor: { rgb: '047857' } },
    font: { name: 'Calibri', sz: 9.5, italic: true, color: { rgb: 'D1FAE5' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '047857' } },
      bottom: { style: 'thin', color: { rgb: '047857' } },
      left: { style: 'thin', color: { rgb: '047857' } },
      right: { style: 'thin', color: { rgb: '047857' } }
    }
  },
  headerAfektifMain: {
    fill: { fgColor: { rgb: 'B45309' } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '92400E' } },
      bottom: { style: 'thin', color: { rgb: '92400E' } },
      left: { style: 'thin', color: { rgb: '92400E' } },
      right: { style: 'thin', color: { rgb: '92400E' } }
    }
  },
  headerAfektifSub: {
    fill: { fgColor: { rgb: 'FEF3C7' } },
    font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: '78350F' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'F59E0B' } },
      bottom: { style: 'thin', color: { rgb: 'F59E0B' } },
      left: { style: 'thin', color: { rgb: 'F59E0B' } },
      right: { style: 'thin', color: { rgb: 'F59E0B' } }
    }
  },
  headerAfektifJml: {
    fill: { fgColor: { rgb: 'FDE68A' } },
    font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: '78350F' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'D97706' } },
      bottom: { style: 'thin', color: { rgb: 'D97706' } },
      left: { style: 'thin', color: { rgb: 'D97706' } },
      right: { style: 'thin', color: { rgb: 'D97706' } }
    }
  },
  headerAfektifAkhir: {
    fill: { fgColor: { rgb: 'D97706' } },
    font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'B45309' } },
      bottom: { style: 'thin', color: { rgb: 'B45309' } },
      left: { style: 'thin', color: { rgb: 'B45309' } },
      right: { style: 'thin', color: { rgb: 'B45309' } }
    }
  },
  headerPsikoMain: {
    fill: { fgColor: { rgb: '0284C7' } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '0369A1' } },
      bottom: { style: 'thin', color: { rgb: '0369A1' } },
      left: { style: 'thin', color: { rgb: '0369A1' } },
      right: { style: 'thin', color: { rgb: '0369A1' } }
    }
  },
  headerPsikoSub: {
    fill: { fgColor: { rgb: 'E0F2FE' } },
    font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: '0369A1' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '38BDF8' } },
      bottom: { style: 'thin', color: { rgb: '38BDF8' } },
      left: { style: 'thin', color: { rgb: '38BDF8' } },
      right: { style: 'thin', color: { rgb: '38BDF8' } }
    }
  },
  headerPsikoJml: {
    fill: { fgColor: { rgb: 'BAE6FD' } },
    font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: '0C4A6E' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '0284C7' } },
      bottom: { style: 'thin', color: { rgb: '0284C7' } },
      left: { style: 'thin', color: { rgb: '0284C7' } },
      right: { style: 'thin', color: { rgb: '0284C7' } }
    }
  },
  headerPsikoAkhir: {
    fill: { fgColor: { rgb: '0369A1' } },
    font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '075985' } },
      bottom: { style: 'thin', color: { rgb: '075985' } },
      left: { style: 'thin', color: { rgb: '075985' } },
      right: { style: 'thin', color: { rgb: '075985' } }
    }
  },
  cellAfektifVal: {
    font: { name: 'Calibri', sz: 10, color: { rgb: '78350F' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  cellAfektifJml: {
    fill: { fgColor: { rgb: 'FEFCE8' } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '78350F' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  cellAfektifAkhir: {
    fill: { fgColor: { rgb: 'FEF3C7' } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '92400E' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  cellPsikoVal: {
    font: { name: 'Calibri', sz: 10, color: { rgb: '0369A1' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  cellPsikoJml: {
    fill: { fgColor: { rgb: 'F0F9FF' } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0369A1' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  cellPsikoAkhir: {
    fill: { fgColor: { rgb: 'E0F2FE' } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '075985' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  }
};

/**
 * Menyimpan workbook XLSX ke browser menggunakan binary array buffer murni
 */
export const downloadWorkbook = (workbook, filename) => {
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

/**
 * Helper untuk membuat Sheet Data Peserta standar
 */
export const createPesertaWorksheet = ({ 
  title = 'DATA PESERTA - RINGKASAN', 
  eventTitle = '', 
  nowStr = '', 
  participants = [],
  includeClassColumn = false,
  classes = []
}) => {
  const sorted = [...participants].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' }));
  
  const headerCols = includeClassColumn 
    ? ['No', 'Nama Lengkap', 'Jenis Kelamin', 'Asal Komisariat', 'Kelas']
    : ['No', 'Nama Lengkap', 'Jenis Kelamin', 'Asal Komisariat'];

  const rows = [
    [title],
    [`Event: ${eventTitle}`],
    [`Waktu Ekspor: ${nowStr}`],
    [], // baris kosong
    headerCols
  ];

  sorted.forEach((p, idx) => {
    const genderStr = p.gender === 'P' ? 'Perempuan' : (p.gender === 'L' ? 'Laki-laki' : '-');
    const instansiStr = p.instansi || '-';
    
    if (includeClassColumn) {
      const clsObj = classes.find(c => String(c.id) === String(p.class_id));
      const className = clsObj ? (clsObj.name || `Kelas ${clsObj.id}`) : (p.className || (p.class_id ? `Kelas ${p.class_id}` : 'Kelas Umum'));
      rows.push([
        idx + 1,
        p.name || '-',
        genderStr,
        instansiStr,
        className
      ]);
    } else {
      rows.push([
        idx + 1,
        p.name || '-',
        genderStr,
        instansiStr
      ]);
    }
  });

  const lastColIdx = headerCols.length - 1;
  rows.push([]);
  
  if (includeClassColumn) {
    rows.push(['TOTAL PESERTA TERDAFTAR:', '', '', '', `${sorted.length} Orang`]);
  } else {
    rows.push(['TOTAL PESERTA TERDAFTAR:', '', '', `${sorted.length} Orang`]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Lebar kolom auto
  const maxNameLen = sorted.reduce((m, p) => Math.max(m, (p.name || '').length), 14);
  const maxInstansiLen = sorted.reduce((m, p) => Math.max(m, (p.instansi || '-').length), 16);
  
  const cols = [
    { wch: 7 },
    { wch: Math.max(26, maxNameLen + 4) },
    { wch: 16 },
    { wch: Math.max(28, maxInstansiLen + 4) }
  ];

  if (includeClassColumn) {
    cols.push({ wch: 20 });
  }

  ws['!cols'] = cols;

  // Merge judul & metadata
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIdx } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastColIdx } },
    { s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: lastColIdx - 1 } }
  ];

  // Styling
  ws['A1'].s = EXCEL_STYLES.title;
  ws['A2'].s = EXCEL_STYLES.subtitle;
  ws['A3'].s = EXCEL_STYLES.meta;

  // Header row = row index 4 (0-based)
  const headerColLetters = includeClassColumn ? ['A5', 'B5', 'C5', 'D5', 'E5'] : ['A5', 'B5', 'C5', 'D5'];
  headerColLetters.forEach(c => {
    if (ws[c]) ws[c].s = EXCEL_STYLES.headerMain;
  });

  // Data rows
  sorted.forEach((_, idx) => {
    const r = idx + 6; // 1-based row number
    if (ws[`A${r}`]) ws[`A${r}`].s = EXCEL_STYLES.cellCenter;
    if (ws[`B${r}`]) ws[`B${r}`].s = EXCEL_STYLES.cellBold;
    if (ws[`C${r}`]) ws[`C${r}`].s = EXCEL_STYLES.cellCenter;
    if (ws[`D${r}`]) ws[`D${r}`].s = EXCEL_STYLES.cellNormal;
    if (includeClassColumn && ws[`E${r}`]) ws[`E${r}`].s = EXCEL_STYLES.cellCenter;
  });

  // Footer row
  const lastRow = rows.length;
  if (ws[`A${lastRow}`]) ws[`A${lastRow}`].s = EXCEL_STYLES.footer;
  const lastCellLetter = includeClassColumn ? 'E' : 'D';
  if (ws[`${lastCellLetter}${lastRow}`]) ws[`${lastCellLetter}${lastRow}`].s = {
    ...EXCEL_STYLES.footer,
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '065F46' } },
    alignment: { vertical: 'center', horizontal: 'center' }
  };

  return ws;
};

/**
 * Helper untuk membuat Workbook Excel lengkap dengan sheet per kelas + sheet Semua Peserta
 */
export const createPesertaPerKelasWorkbook = ({
  eventTitle = '',
  nowStr = '',
  participants = [],
  classes = []
}) => {
  const wb = XLSX.utils.book_new();
  const sanitizeSheetName = (name) => {
    return String(name || 'Sheet')
      .replace(/[\\/?*[\]:]/g, ' ')
      .trim()
      .slice(0, 31);
  };

  // 1. Sheet Utama: Semua Peserta (dengan kolom Kelas)
  const wsAll = createPesertaWorksheet({
    title: 'DATA SELURUH PESERTA',
    eventTitle,
    nowStr,
    participants,
    includeClassColumn: true,
    classes
  });
  XLSX.utils.book_append_sheet(wb, wsAll, 'Semua Peserta');

  // Kelompokkan peserta berdasarkan kelas
  // Kelas terdaftar di classes
  const usedSheetNames = new Set(['Semua Peserta']);

  const getUniqueSheetName = (rawName) => {
    let base = sanitizeSheetName(rawName);
    if (!base) base = 'Kelas';
    let candidate = base;
    let counter = 1;
    while (usedSheetNames.has(candidate.toLowerCase())) {
      const suffix = ` (${counter})`;
      candidate = base.slice(0, 31 - suffix.length) + suffix;
      counter++;
    }
    usedSheetNames.add(candidate.toLowerCase());
    return candidate;
  };

  // Buat sheet untuk tiap kelas yang terdefinisi
  if (Array.isArray(classes) && classes.length > 0) {
    classes.forEach((cls) => {
      const classParticipants = (participants || []).filter(
        p => String(p.class_id) === String(cls.id)
      );
      
      const sheetTitle = cls.name || `Kelas ${cls.id}`;
      const sheetName = getUniqueSheetName(sheetTitle);
      
      const wsClass = createPesertaWorksheet({
        title: `DATA PESERTA - ${sheetTitle.toUpperCase()}`,
        eventTitle,
        nowStr,
        participants: classParticipants,
        includeClassColumn: false,
        classes
      });
      
      XLSX.utils.book_append_sheet(wb, wsClass, sheetName);
    });
  }

  // Cek apakah ada peserta di "Kelas Umum" (tanpa class_id)
  const umumParticipants = (participants || []).filter(p => !p.class_id);
  if (umumParticipants.length > 0 || !classes || classes.length === 0) {
    const sheetName = getUniqueSheetName('Kelas Umum');
    const wsUmum = createPesertaWorksheet({
      title: 'DATA PESERTA - KELAS UMUM',
      eventTitle,
      nowStr,
      participants: umumParticipants,
      includeClassColumn: false,
      classes
    });
    XLSX.utils.book_append_sheet(wb, wsUmum, sheetName);
  }

  // Cek jika ada peserta dengan class_id yang belum tercakup di classes
  const handledClassIds = new Set((classes || []).map(c => String(c.id)));
  const otherParticipants = (participants || []).filter(
    p => p.class_id && !handledClassIds.has(String(p.class_id))
  );

  if (otherParticipants.length > 0) {
    // Kelompokkan id lainnya
    const otherGroups = {};
    otherParticipants.forEach(p => {
      const cid = String(p.class_id);
      if (!otherGroups[cid]) otherGroups[cid] = [];
      otherGroups[cid].push(p);
    });

    Object.entries(otherGroups).forEach(([cid, pList]) => {
      const rawTitle = pList[0]?.className || `Kelas ${cid}`;
      const sheetName = getUniqueSheetName(rawTitle);
      const wsOther = createPesertaWorksheet({
        title: `DATA PESERTA - ${rawTitle.toUpperCase()}`,
        eventTitle,
        nowStr,
        participants: pList,
        includeClassColumn: false,
        classes
      });
      XLSX.utils.book_append_sheet(wb, wsOther, sheetName);
    });
  }

  return wb;
};

/**
 * Helper untuk membuat Sheet Rekap Presensi Matrix (Seluruh Sesi)
 */
export const createPresensiMatrixWorksheet = ({ eventTitle = '', nowStr = '', participants = [], sessions = [] }) => {
  const sorted = [...participants].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' }));
  const totalCols = 5 + sessions.length;

  const headerRow = ['No', 'Nama Lengkap', 'Asal Komisariat'];
  sessions.forEach((s, idx) => {
    headerRow.push(`Sesi ${idx + 1}: ${s.title || ''}`);
  });
  headerRow.push('Total Hadir', 'Persentase (%)');

  const rows = [
    ['REKAPITULASI PRESENSI - RINGKASAN SELURUH SESI'],
    [`Event: ${eventTitle} • Total Peserta Terdaftar: ${sorted.length} Orang`],
    [`Waktu Ekspor: ${nowStr}`],
    [],
    headerRow
  ];

  sorted.forEach((p, idx) => {
    let presentCount = 0;
    const sessionVals = sessions.map(ses => {
      const att = p.attendances?.[ses.id] || 
                  (ses.db_id && p.attendances?.[ses.db_id]) || 
                  (ses.session_code && p.attendances?.[ses.session_code]) ||
                  (typeof ses.id === 'string' && p.attendances?.[ses.id.replace(/\D/g, '')]) ||
                  (ses.db_id && p.attendances?.[`SES-${ses.db_id}`]) ||
                  (ses.db_id && p.attendances?.[`SES-${String(ses.db_id).padStart(2, '0')}`]);
      const rawStatus = (att?.raw_status || att?.status || '').toLowerCase();
      const isPresent = att?.present === true || rawStatus === 'present' || rawStatus === 'hadir';
      const isExcused = !isPresent && (rawStatus === 'permission' || rawStatus === 'izin' || rawStatus === 'sakit' || rawStatus === 'excused' || att?.excuse === true || (p.isExcused && p.excuseReason));
      const isAbsent = !isPresent && !isExcused && (rawStatus === 'absent' || rawStatus === 'tidak hadir' || rawStatus === 'alpa' || p.status === 'Tidak Hadir');
      const excuseNote = att?.note || (isExcused ? (p.excuseReason || 'Izin') : '');
      const attTime = att?.time || '';

      if (isPresent) {
        presentCount++;
        return attTime ? `HADIR (${attTime})` : 'HADIR';
      } else if (isExcused) {
        return excuseNote ? `IZIN (${excuseNote})` : 'IZIN';
      } else if (isAbsent) {
        return att?.note ? `TIDAK HADIR (${att.note})` : 'TIDAK HADIR';
      } else {
        return 'BELUM ABSEN';
      }
    });

    const pct = sessions.length > 0 ? Math.round((presentCount / sessions.length) * 100) : 0;
    rows.push([
      idx + 1,
      p.name || '-',
      p.instansi || '-',
      ...sessionVals,
      presentCount,
      `${pct}%`
    ]);
  });

  // Footer summary per sesi
  const footerRow = ['TOTAL KEHADIRAN PER SESI:', '', ''];
  sessions.forEach(ses => {
    const countPresent = sorted.filter(p => p.attendances?.[ses.id]?.present).length;
    const pctSes = sorted.length > 0 ? Math.round((countPresent / sorted.length) * 100) : 0;
    footerRow.push(`${countPresent} Hadir (${pctSes}%)`);
  });
  footerRow.push(`Total ${sorted.length} Peserta`, '');
  rows.push(footerRow);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Auto cols
  const maxNameLen = sorted.reduce((m, p) => Math.max(m, (p.name || '').length), 14);
  const maxInstansiLen = sorted.reduce((m, p) => Math.max(m, (p.instansi || '-').length), 16);
  ws['!cols'] = [
    { wch: 7 },
    { wch: Math.max(26, maxNameLen + 4) },
    { wch: Math.max(26, maxInstansiLen + 4) },
    ...sessions.map(() => ({ wch: 18 })),
    { wch: 14 },
    { wch: 16 }
  ];

  // Merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
    { s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: 2 } },
    { s: { r: rows.length - 1, c: totalCols - 2 }, e: { r: rows.length - 1, c: totalCols - 1 } }
  ];

  // Styles
  ws['A1'].s = EXCEL_STYLES.title;
  ws['A2'].s = EXCEL_STYLES.subtitle;
  ws['A3'].s = EXCEL_STYLES.meta;

  // Header cells
  for (let c = 0; c < totalCols; c++) {
    const addr = XLSX.utils.encode_cell({ r: 4, c });
    if (ws[addr]) ws[addr].s = EXCEL_STYLES.headerMain;
  }

  // Data rows
  sorted.forEach((p, idx) => {
    const r = idx + 5;
    const aNo = XLSX.utils.encode_cell({ r, c: 0 });
    const aName = XLSX.utils.encode_cell({ r, c: 1 });
    const aInstansi = XLSX.utils.encode_cell({ r, c: 2 });
    if (ws[aNo]) ws[aNo].s = EXCEL_STYLES.cellCenter;
    if (ws[aName]) ws[aName].s = EXCEL_STYLES.cellBold;
    if (ws[aInstansi]) ws[aInstansi].s = EXCEL_STYLES.cellNormal;

    sessions.forEach((_, sIdx) => {
      const c = 3 + sIdx;
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) {
        const val = String(ws[addr].v || '');
        if (val.startsWith('HADIR')) {
          ws[addr].s = EXCEL_STYLES.statusHadir;
        } else if (val.startsWith('IZIN')) {
          ws[addr].s = EXCEL_STYLES.statusIzin;
        } else {
          ws[addr].s = EXCEL_STYLES.statusAbsen;
        }
      }
    });

    const aTot = XLSX.utils.encode_cell({ r, c: totalCols - 2 });
    const aPct = XLSX.utils.encode_cell({ r, c: totalCols - 1 });
    if (ws[aTot]) ws[aTot].s = EXCEL_STYLES.cellTotal;
    if (ws[aPct]) ws[aPct].s = EXCEL_STYLES.cellHighlight;
  });

  // Footer cells
  const lastR = rows.length - 1;
  for (let c = 0; c < totalCols; c++) {
    const addr = XLSX.utils.encode_cell({ r: lastR, c });
    if (ws[addr]) ws[addr].s = EXCEL_STYLES.footer;
  }

  return ws;
};

/**
 * Helper untuk membuat Sheet Presensi 1 Sesi
 */
export const createSingleSessionWorksheet = ({ eventTitle = '', session = {}, nowStr = '', participants = [] }) => {
  const sorted = [...participants].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' }));

  const rows = [
    [`PRESENSI MATERI: ${session.title || 'Sesi'}`],
    [`Waktu Sesi: ${session.time || '-'} • Ruangan: ${session.room || '-'}`],
    [`Waktu Ekspor: ${nowStr}`],
    [],
    ['No', 'Nama Lengkap', 'Asal Komisariat', 'Status Presensi', 'Waktu Masuk', 'Keterangan Khusus']
  ];

  sorted.forEach((p, idx) => {
    const att = p.attendances?.[session.id] || 
                (session.db_id && p.attendances?.[session.db_id]) || 
                (session.session_code && p.attendances?.[session.session_code]) ||
                (typeof session.id === 'string' && p.attendances?.[session.id.replace(/\D/g, '')]) ||
                (session.db_id && p.attendances?.[`SES-${session.db_id}`]) ||
                (session.db_id && p.attendances?.[`SES-${String(session.db_id).padStart(2, '0')}`]);
    const rawStatus = (att?.raw_status || att?.status || '').toLowerCase();
    const isPresent = att?.present === true || rawStatus === 'present' || rawStatus === 'hadir';
    const isExcused = !isPresent && (rawStatus === 'permission' || rawStatus === 'izin' || rawStatus === 'sakit' || rawStatus === 'excused' || att?.excuse === true || (p.isExcused && p.excuseReason));
    const isAbsent = !isPresent && !isExcused && (rawStatus === 'absent' || rawStatus === 'tidak hadir' || rawStatus === 'alpa' || p.status === 'Tidak Hadir');
    const excuseNote = att?.note || (isExcused ? (p.excuseReason || 'Izin') : (isAbsent ? (att?.note || 'Tidak Hadir') : ''));

    let status = 'BELUM ABSEN';
    if (isPresent) status = 'HADIR';
    else if (isExcused) status = 'IZIN';
    else if (isAbsent) status = 'TIDAK HADIR';

    rows.push([
      idx + 1,
      p.name || '-',
      p.instansi || '-',
      status,
      att?.time || '-',
      excuseNote || '-'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  const maxNameLen = sorted.reduce((m, p) => Math.max(m, (p.name || '').length), 14);
  const maxInstansiLen = sorted.reduce((m, p) => Math.max(m, (p.instansi || '-').length), 16);
  ws['!cols'] = [
    { wch: 7 },
    { wch: Math.max(26, maxNameLen + 4) },
    { wch: Math.max(26, maxInstansiLen + 4) },
    { wch: 16 },
    { wch: 16 },
    { wch: 28 }
  ];

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }
  ];

  ws['A1'].s = EXCEL_STYLES.title;
  ws['A2'].s = EXCEL_STYLES.subtitle;
  ws['A3'].s = EXCEL_STYLES.meta;

  ['A5', 'B5', 'C5', 'D5', 'E5', 'F5'].forEach(c => {
    if (ws[c]) ws[c].s = EXCEL_STYLES.headerMain;
  });

  sorted.forEach((p, idx) => {
    const r = idx + 6;
    if (ws[`A${r}`]) ws[`A${r}`].s = EXCEL_STYLES.cellCenter;
    if (ws[`B${r}`]) ws[`B${r}`].s = EXCEL_STYLES.cellBold;
    if (ws[`C${r}`]) ws[`C${r}`].s = EXCEL_STYLES.cellNormal;

    const statCell = ws[`D${r}`];
    if (statCell) {
      if (statCell.v === 'HADIR') statCell.s = EXCEL_STYLES.statusHadir;
      else if (statCell.v === 'IZIN') statCell.s = EXCEL_STYLES.statusIzin;
      else statCell.s = EXCEL_STYLES.statusAbsen;
    }

    if (ws[`E${r}`]) ws[`E${r}`].s = EXCEL_STYLES.cellCenter;
    if (ws[`F${r}`]) ws[`F${r}`].s = EXCEL_STYLES.cellNormal;
  });

  return ws;
};

export default {
  EXCEL_STYLES,
  downloadWorkbook,
  createPesertaWorksheet,
  createPesertaPerKelasWorkbook,
  createPresensiMatrixWorksheet,
  createSingleSessionWorksheet
};
