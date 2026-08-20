import React, { useState, useEffect } from 'react';
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
  fetch30DaysHistoryForMultipleRegions,
  searchKecamatan,
  POPULAR_KECAMATAN_PRESETS
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
  Loader2,
  Building2,
  Search,
  Check
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
  const [timeRange, setTimeRange] = useState<'realtime' | '30days'>('30days');
  const [exportScope, setExportScope] = useState<'all' | 'selected' | 'kecamatan' | 'alerts_only'>('kecamatan');
  
  // Kecamatan selection states
  const [selectedKecamatan, setSelectedKecamatan] = useState<Region>(POPULAR_KECAMATAN_PRESETS[0]);
  const [kecamatanQuery, setKecamatanQuery] = useState<string>('');
  const [isSearchingKecamatan, setIsSearchingKecamatan] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Region[]>([]);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Debounce search kecamatan
  useEffect(() => {
    if (!kecamatanQuery.trim() || kecamatanQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearchingKecamatan(false);
      return;
    }

    setIsSearchingKecamatan(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchKecamatan(kecamatanQuery);
        setSearchResults(res);
      } catch (err) {
        console.error('Kecamatan search error:', err);
      } finally {
        setIsSearchingKecamatan(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [kecamatanQuery]);

  if (!isOpen) return null;

  const getTargetRegions = (): Region[] => {
    if (exportScope === 'kecamatan') {
      return [selectedKecamatan];
    } else if (exportScope === 'selected') {
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
        const labelName = exportScope === 'kecamatan' ? selectedKecamatan.name : targetRegions[0]?.name;
        setLoadingProgress(`Mengambil data historis 30 hari (${labelName})...`);
        const histories = targetRegions.length === 1
          ? [await fetch30DaysHistoryForRegion(targetRegions[0])]
          : await fetch30DaysHistoryForMultipleRegions(targetRegions, (done, total) => {
              setLoadingProgress(`Mengambil data historis (${done}/${total} lokasi)...`);
            });

        export30DaysToExcel(histories, exportScope === 'kecamatan' ? selectedKecamatan : selectedRegion);
        setSuccessMessage('File Excel historis 30 hari (Lengkap Detail Per Tanggal) berhasil diunduh!');
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
              setLoadingProgress(`Mengambil data historis (${done}/${total} lokasi)...`);
            });

        export30DaysToCSV(histories, exportScope === 'kecamatan' ? selectedKecamatan : selectedRegion);
        setSuccessMessage('File CSV historis 30 hari detail harian berhasil diunduh!');
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
              setLoadingProgress(`Mengambil data historis (${done}/${total} lokasi)...`);
            });

        export30DaysToPDF(histories, exportScope === 'kecamatan' ? selectedKecamatan : selectedRegion);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Ekspor Data Curah Hujan</h3>
              <p className="text-xs text-slate-400">Unduh data per tanggal & pilih hingga level kecamatan</p>
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
              <div className="text-[10px] text-slate-400">Detail rincian per tanggal (1 bulan)</div>
            </button>

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
          </div>
        </div>

        {/* Scope Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Pilih Cakupan Wilayah / Kecamatan:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => setExportScope('kecamatan')}
              className={`p-2.5 rounded-xl border text-left transition ${
                exportScope === 'kecamatan'
                  ? 'bg-cyan-950/90 border-cyan-500 text-white shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1 mb-0.5">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                Per Kecamatan
              </div>
              <div className="text-[10px] text-slate-400 truncate">Cari Se-Indonesia</div>
            </button>

            <button
              onClick={() => setExportScope('selected')}
              className={`p-2.5 rounded-xl border text-left transition ${
                exportScope === 'selected'
                  ? 'bg-cyan-950/90 border-cyan-500 text-white shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1 mb-0.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                Kota Aktif
              </div>
              <div className="text-[10px] text-slate-400 truncate">{selectedRegion.name}</div>
            </button>

            <button
              onClick={() => setExportScope('all')}
              className={`p-2.5 rounded-xl border text-left transition ${
                exportScope === 'all'
                  ? 'bg-cyan-950/90 border-cyan-500 text-white shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1 mb-0.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Semua Kota
              </div>
              <div className="text-[10px] text-slate-400">38+ Stasiun BMKG</div>
            </button>

            <button
              onClick={() => setExportScope('alerts_only')}
              className={`p-2.5 rounded-xl border text-left transition ${
                exportScope === 'alerts_only'
                  ? 'bg-cyan-950/90 border-cyan-500 text-white shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1 mb-0.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Peringatan
              </div>
              <div className="text-[10px] text-slate-400">{alerts.length} Lokasi Siaga</div>
            </button>
          </div>
        </div>

        {/* Kecamatan Custom Search / Preset Panel */}
        {exportScope === 'kecamatan' && (
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                Pilih Kecamatan untuk Dianalisis:
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                {selectedKecamatan.name}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={kecamatanQuery}
                onChange={(e) => setKecamatanQuery(e.target.value)}
                placeholder="Ketik nama kecamatan lain (contoh: Menteng, Sukajadi, Cisarua, Gubeng)..."
                className="w-full pl-8 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              {isSearchingKecamatan && (
                <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {/* Search Results Dropdown / List */}
            {searchResults.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 bg-slate-900/90 border border-cyan-500/40 rounded-lg p-1.5 shadow-lg">
                <div className="text-[10px] font-bold text-cyan-400 px-2 py-0.5">Hasil Pencarian Kecamatan:</div>
                {searchResults.map((k) => (
                  <button
                    key={k.id}
                    onClick={() => {
                      setSelectedKecamatan(k);
                      setKecamatanQuery('');
                      setSearchResults([]);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between transition ${
                      selectedKecamatan.id === k.id
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-white">{k.name}</div>
                      <div className="text-[10px] text-slate-400">{k.province} • {k.elevationMeters} mdpl</div>
                    </div>
                    {selectedKecamatan.id === k.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}

            {/* Popular Preset Pills */}
            <div className="space-y-1">
              <div className="text-[10px] text-slate-400">Pilihan Cepat Kecamatan Populer:</div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {POPULAR_KECAMATAN_PRESETS.map((k) => (
                  <button
                    key={k.id}
                    onClick={() => setSelectedKecamatan(k)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition ${
                      selectedKecamatan.id === k.id
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {k.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Export Details Summary Note */}
        <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-[11px] text-slate-300 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {timeRange === '30days'
              ? `Laporan mencakup 30 baris detail tanggal per tanggal (presipitasi mm, status hujan BMKG, suhu maks/min, dan angin) untuk ${
                  exportScope === 'kecamatan' ? selectedKecamatan.name : exportScope === 'selected' ? selectedRegion.name : 'seluruh wilayah'
                }.`
              : 'Laporan mencakup data live pengamatan 24 jam terakhir dan perkiraan cuaca 7 hari.'}
          </span>
        </div>

        {/* Export Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Excel Export Button */}
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="p-3 rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/60 to-slate-950 hover:border-emerald-400 text-left transition group shadow-lg disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                .XLSX
              </span>
            </div>
            <div className="font-bold text-white text-xs">Spreadsheet Excel</div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {timeRange === '30days' ? 'Rekap, Detail Per Tgl & Matriks.' : 'Multi-sheet live & prakiraan.'}
            </p>
          </button>

          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="p-3 rounded-xl border border-teal-500/40 bg-gradient-to-br from-teal-950/60 to-slate-950 hover:border-teal-400 text-left transition group shadow-lg disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <FileCode className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                .CSV
              </span>
            </div>
            <div className="font-bold text-white text-xs">Data CSV</div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {timeRange === '30days' ? 'Format baris per tanggal.' : 'Format ringkas analisis.'}
            </p>
          </button>

          {/* PDF Export Button */}
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="p-3 rounded-xl border border-rose-500/40 bg-gradient-to-br from-rose-950/60 to-slate-950 hover:border-rose-400 text-left transition group shadow-lg disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                .PDF
              </span>
            </div>
            <div className="font-bold text-white text-xs">Buletin PDF</div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {timeRange === '30days' ? 'Laporan harian resmi 30 hari.' : 'Dokumen resmi BMKG/EWS.'}
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



