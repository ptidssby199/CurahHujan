import React, { useState } from 'react';
import { Region, LiveRainfallData, EarlyWarningAlert } from '../types';
import { 
  exportToExcel, 
  exportToCSV, 
  exportToPDF, 
  export30DaysToExcel, 
  export30DaysToCSV, 
  export30DaysToPDF 
} from '../utils/exportUtils';
import { 
  fetch30DaysHistoryForRegion, 
  fetch30DaysHistoryForMultipleRegions 
} from '../services/weatherService';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  X, 
  CheckCircle2, 
  Layers, 
  MapPin, 
  AlertTriangle,
  FileCode,
  AlertCircle,
  Calendar,
  Zap,
  Loader2
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  regions: Region[];
  rainfallDataMap: Record<string, LiveRainfallData>;
  alerts: EarlyWarningAlert[];
  selectedRegion: Region;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  regions,
  rainfallDataMap,
  alerts,
  selectedRegion,
}) => {
  const [timeRange, setTimeRange] = useState<'realtime' | '30days'>('realtime');
  const [exportScope, setExportScope] = useState<'all' | 'selected' | 'alerts_only'>('all');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const getTargetRegions = (): Region[] => {
    if (exportScope === 'selected') {
      return [selectedRegion];
    } else if (exportScope === 'alerts_only') {
      const alertRegions = regions.filter((r) => {
        const d = rainfallDataMap[r.id];
        return d && d.alertSeverity !== 'normal';
      });
      return alertRegions.length > 0 ? alertRegions : [selectedRegion];
    }
    return regions;
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setLoadingProgress(null);
    try {
      const targetRegions = getTargetRegions();

      if (timeRange === '30days') {
        setLoadingProgress('Mengambil data historis 30 hari...');
        const histories = targetRegions.length === 1
          ? [await fetch30DaysHistoryForRegion(targetRegions[0])]
          : await fetch30DaysHistoryForMultipleRegions(targetRegions, (done, total) => {
              setLoadingProgress(`Mengambil data historis (${done}/${total} stasiun)...`);
            });

        export30DaysToExcel(histories, selectedRegion);
        setSuccessMessage('File Excel historis 30 hari berhasil diunduh!');
      } else {
        exportToExcel(
          targetRegions,
          rainfallDataMap,
          selectedRegion,
          rainfallDataMap[selectedRegion.id]
        );
        setSuccessMessage('File Excel (.xlsx) berhasil diunduh!');
      }

      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(`Gagal mengunduh Excel: ${e?.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsExporting(false);
      setLoadingProgress(null);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setLoadingProgress(null);
    try {
      const targetRegions = getTargetRegions();

      if (timeRange === '30days') {
        setLoadingProgress('Mengambil data historis 30 hari...');
        const histories = targetRegions.length === 1
          ? [await fetch30DaysHistoryForRegion(targetRegions[0])]
          : await fetch30DaysHistoryForMultipleRegions(targetRegions, (done, total) => {
              setLoadingProgress(`Mengambil data historis (${done}/${total} stasiun)...`);
            });

        export30DaysToCSV(histories, selectedRegion);
        setSuccessMessage('File CSV historis 30 hari berhasil diunduh!');
      } else {
        exportToCSV(targetRegions, rainfallDataMap);
        setSuccessMessage('File CSV berhasil diunduh!');
      }

      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(`Gagal mengunduh CSV: ${e?.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsExporting(false);
      setLoadingProgress(null);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setLoadingProgress(null);
    try {
      const targetRegions = getTargetRegions();

      if (timeRange === '30days') {
        setLoadingProgress('Menyusun buletin historis 30 hari...');
        const histories = targetRegions.length === 1
          ? [await fetch30DaysHistoryForRegion(targetRegions[0])]
          : await fetch30DaysHistoryForMultipleRegions(targetRegions, (done, total) => {
              setLoadingProgress(`Mengambil data historis (${done}/${total} stasiun)...`);
            });

        export30DaysToPDF(histories, selectedRegion);
        setSuccessMessage('Buletin PDF historis 30 hari berhasil diunduh!');
      } else {
        exportToPDF(
          targetRegions,
          rainfallDataMap,
          alerts,
          selectedRegion,
          rainfallDataMap[selectedRegion.id]
        );
        setSuccessMessage('Laporan PDF resmi berhasil dibuat & diunduh!');
      }

      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(`Gagal membuat PDF: ${e?.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsExporting(false);
      setLoadingProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Ekspor Data Curah Hujan</h3>
              <p className="text-xs text-slate-400">Unduh laporan resmi dalam format Excel, CSV, atau PDF</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Time Range Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Pilihan Rentang Waktu Data:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTimeRange('realtime')}
              className={`p-2.5 rounded-xl border text-left transition ${
                timeRange === 'realtime'
                  ? 'bg-cyan-950/90 border-cyan-500 text-white shadow-md'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1.5 mb-0.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                Real-Time & 7 Hari
              </div>
              <div className="text-[10px] text-slate-400">Data live 24 jam & perkiraan cuaca</div>
            </button>

            <button
              onClick={() => setTimeRange('30days')}
              className={`p-2.5 rounded-xl border text-left transition ${
                timeRange === '30days'
                  ? 'bg-cyan-950/90 border-cyan-500 text-white shadow-md'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1.5 mb-0.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                30 Hari Terakhir
              </div>
              <div className="text-[10px] text-slate-400">Rekapitulasi historis 1 bulan penuh</div>
            </button>
          </div>
        </div>

        {/* Scope Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Pilih Cakupan Wilayah:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => setExportScope('all')}
              className={`p-2.5 rounded-xl border text-left transition ${
                exportScope === 'all'
                  ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1.5 mb-0.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Semua Stasiun
              </div>
              <div className="text-[10px] text-slate-400">38+ Stasiun Indonesia</div>
            </button>

            <button
              onClick={() => setExportScope('selected')}
              className={`p-2.5 rounded-xl border text-left transition ${
                exportScope === 'selected'
                  ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1.5 mb-0.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                Wilayah Aktif
              </div>
              <div className="text-[10px] text-slate-400 truncate">{selectedRegion.name}</div>
            </button>

            <button
              onClick={() => setExportScope('alerts_only')}
              className={`p-2.5 rounded-xl border text-left transition ${
                exportScope === 'alerts_only'
                  ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1.5 mb-0.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Peringatan Saja
              </div>
              <div className="text-[10px] text-slate-400">{alerts.length} Lokasi Berisiko</div>
            </button>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Excel Export Button */}
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="p-3.5 rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/60 to-slate-950 hover:border-emerald-400 text-left transition group shadow-lg disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                .XLSX
              </span>
            </div>
            <div className="font-bold text-white text-xs">Spreadsheet Excel</div>
            <p className="text-[10px] text-slate-400 mt-1">
              {timeRange === '30days' ? 'Rekap 30 hari & detail harian.' : 'Multi-sheet live & prakiraan.'}
            </p>
          </button>

          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="p-3.5 rounded-xl border border-teal-500/40 bg-gradient-to-br from-teal-950/60 to-slate-950 hover:border-teal-400 text-left transition group shadow-lg disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <FileCode className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                .CSV
              </span>
            </div>
            <div className="font-bold text-white text-xs">Data CSV</div>
            <p className="text-[10px] text-slate-400 mt-1">
              {timeRange === '30days' ? 'Format baris harian 30 hari.' : 'Format ringkas analisis.'}
            </p>
          </button>

          {/* PDF Export Button */}
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="p-3.5 rounded-xl border border-rose-500/40 bg-gradient-to-br from-rose-950/60 to-slate-950 hover:border-rose-400 text-left transition group shadow-lg disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                .PDF
              </span>
            </div>
            <div className="font-bold text-white text-xs">Buletin PDF</div>
            <p className="text-[10px] text-slate-400 mt-1">
              {timeRange === '30days' ? 'Laporan iklim 30 hari resmi.' : 'Dokumen resmi BMKG/EWS.'}
            </p>
          </button>
        </div>

        {/* Loading / Progress Indicator */}
        {isExporting && (
          <div className="p-3 bg-cyan-950/60 border border-cyan-500/50 text-cyan-300 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in">
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
            <span className="font-medium">{loadingProgress || 'Sedang memproses dan mengunduh berkas...'}</span>
          </div>
        )}

        {/* Success Toast */}
        {successMessage && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500 text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Toast */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/80 border border-rose-500 text-rose-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="pt-1 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};


