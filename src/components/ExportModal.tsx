import React, { useState } from 'react';
import { Region, LiveRainfallData, EarlyWarningAlert } from '../types';
import { exportToExcel, exportToCSV, exportToPDF } from '../utils/exportUtils';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  X, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  MapPin, 
  AlertTriangle,
  FileCode,
  AlertCircle
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
  const [exportScope, setExportScope] = useState<'all' | 'selected' | 'alerts_only'>('all');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportExcel = () => {
    setIsExporting(true);
    setErrorMessage(null);
    try {
      let targetRegions = regions;
      if (exportScope === 'selected') {
        targetRegions = [selectedRegion];
      } else if (exportScope === 'alerts_only') {
        targetRegions = regions.filter((r) => {
          const d = rainfallDataMap[r.id];
          return d && d.alertSeverity !== 'normal';
        });
      }

      exportToExcel(
        targetRegions,
        rainfallDataMap,
        selectedRegion,
        rainfallDataMap[selectedRegion.id]
      );
      setSuccessMessage('File Excel (.xlsx) berhasil diunduh!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(`Gagal mengunduh Excel: ${e?.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    setErrorMessage(null);
    try {
      let targetRegions = regions;
      if (exportScope === 'selected') {
        targetRegions = [selectedRegion];
      } else if (exportScope === 'alerts_only') {
        targetRegions = regions.filter((r) => {
          const d = rainfallDataMap[r.id];
          return d && d.alertSeverity !== 'normal';
        });
      }

      exportToCSV(targetRegions, rainfallDataMap);
      setSuccessMessage('File CSV berhasil diunduh!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(`Gagal mengunduh CSV: ${e?.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    setErrorMessage(null);
    try {
      let targetRegions = regions;
      if (exportScope === 'selected') {
        targetRegions = [selectedRegion];
      } else if (exportScope === 'alerts_only') {
        targetRegions = regions.filter((r) => {
          const d = rainfallDataMap[r.id];
          return d && d.alertSeverity !== 'normal';
        });
      }

      exportToPDF(
        targetRegions,
        rainfallDataMap,
        alerts,
        selectedRegion,
        rainfallDataMap[selectedRegion.id]
      );
      setSuccessMessage('Laporan PDF resmi berhasil dibuat & diunduh!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(`Gagal membuat PDF: ${e?.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
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
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scope Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Pilih Cakupan Data:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => setExportScope('all')}
              className={`p-3 rounded-xl border text-left transition ${
                exportScope === 'all'
                  ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1.5 mb-1">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Seluruh Wilayah
              </div>
              <div className="text-[10px] text-slate-400">38+ Stasiun se-Indonesia</div>
            </button>

            <button
              onClick={() => setExportScope('selected')}
              className={`p-3 rounded-xl border text-left transition ${
                exportScope === 'selected'
                  ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1.5 mb-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                Wilayah Terpilih
              </div>
              <div className="text-[10px] text-slate-400 truncate">{selectedRegion.name}</div>
            </button>

            <button
              onClick={() => setExportScope('alerts_only')}
              className={`p-3 rounded-xl border text-left transition ${
                exportScope === 'alerts_only'
                  ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Peringatan Saja
              </div>
              <div className="text-[10px] text-slate-400">{alerts.length} Lokasi Berisiko</div>
            </button>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Excel Export Button */}
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="p-3.5 rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/60 to-slate-950 hover:border-emerald-400 text-left transition group shadow-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                .XLSX
              </span>
            </div>
            <div className="font-bold text-white text-xs">Spreadsheet Excel</div>
            <p className="text-[10px] text-slate-400 mt-1">
              Multi-sheet lengkap historis & prakiraan.
            </p>
          </button>

          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="p-3.5 rounded-xl border border-teal-500/40 bg-gradient-to-br from-teal-950/60 to-slate-950 hover:border-teal-400 text-left transition group shadow-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <FileCode className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                .CSV
              </span>
            </div>
            <div className="font-bold text-white text-xs">Data CSV</div>
            <p className="text-[10px] text-slate-400 mt-1">
              Format ringkas untuk analisis cepat.
            </p>
          </button>

          {/* PDF Export Button */}
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="p-3.5 rounded-xl border border-rose-500/40 bg-gradient-to-br from-rose-950/60 to-slate-950 hover:border-rose-400 text-left transition group shadow-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                .PDF
              </span>
            </div>
            <div className="font-bold text-white text-xs">Buletin PDF</div>
            <p className="text-[10px] text-slate-400 mt-1">
              Dokumen resmi standar BMKG/EWS.
            </p>
          </button>
        </div>

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

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

