import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Region, LiveRainfallData, EarlyWarningAlert, MonthHistorySummary } from '../types';

export function exportToCSV(
  regions: Region[],
  rainfallDataMap: Record<string, LiveRainfallData>
) {
  const dateStr = new Date().toISOString().split('T')[0];
  const headers = [
    'No',
    'Wilayah',
    'Provinsi',
    'Pulau',
    'Curah Hujan Saat Ini (mm/jam)',
    'Akumulasi 24 Jam (mm)',
    'Prediksi 24 Jam (mm)',
    'Peluang Hujan (%)',
    'Suhu (°C)',
    'Kelembaban (%)',
    'Kecepatan Angin (km/j)',
    'Kondisi Cuaca',
    'Status Peringatan',
    'Kode Stasiun',
    'Latitude',
    'Longitude'
  ];

  const rows = regions.map((reg, idx) => {
    const d = rainfallDataMap[reg.id];
    return [
      idx + 1,
      `"${reg.name}"`,
      `"${reg.province}"`,
      `"${reg.island}"`,
      d ? d.currentRainfall : 0,
      d ? d.rainfallPast24h : 0,
      d ? d.rainfallNext24h : 0,
      d ? d.precipitationProbability : 0,
      d ? d.temperature : 0,
      d ? d.humidity : 0,
      d ? d.windSpeed : 0,
      `"${d ? d.weatherDescription : '-'}"`,
      `"${d ? d.alertSeverity.toUpperCase() : 'NORMAL'}"`,
      `"${reg.stationCode}"`,
      reg.lat,
      reg.lng
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `Data_Curah_Hujan_Indonesia_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 500);
}

export function exportToExcel(
  regions: Region[],
  rainfallDataMap: Record<string, LiveRainfallData>,
  selectedRegion?: Region,
  selectedData?: LiveRainfallData
) {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toISOString().split('T')[0];

  const safeAppendSheet = (workbook: XLSX.WorkBook, sheet: XLSX.WorkSheet, rawName: string) => {
    // Excel sheet limit is strictly 31 characters, remove forbidden characters \ / ? * [ ] :
    const cleanName = (rawName || 'Sheet')
      .replace(/[\\/?*[\]:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 25);
    XLSX.utils.book_append_sheet(workbook, sheet, cleanName);
  };

  // Sheet 1: All Stations Summary
  const summaryRows = regions.map((reg, index) => {
    const data = rainfallDataMap[reg.id];
    return {
      No: index + 1,
      'Wilayah / Kota': reg.name,
      Tipe: reg.type,
      Provinsi: reg.province,
      Pulau: reg.island,
      'Curah Hujan Saat Ini (mm/jam)': data ? data.currentRainfall : 'N/A',
      'Akumulasi 24 Jam (mm)': data ? data.rainfallPast24h : 'N/A',
      'Prediksi 24 Jam (mm)': data ? data.rainfallNext24h : 'N/A',
      'Peluang Hujan (%)': data ? data.precipitationProbability : 'N/A',
      'Suhu (°C)': data ? data.temperature : 'N/A',
      'Kelembaban (%)': data ? data.humidity : 'N/A',
      'Kecepatan Angin (km/j)': data ? data.windSpeed : 'N/A',
      'Kondisi Cuaca': data ? data.weatherDescription : 'N/A',
      'Status Peringatan BMKG': data ? data.alertSeverity.toUpperCase() : 'NORMAL',
      'Intensitas': data ? data.intensityLevel.toUpperCase() : 'BERAWAN',
      'Kode Stasiun': reg.stationCode,
      Latitude: reg.lat,
      Longitude: reg.lng,
      Elevasi: `${reg.elevationMeters} mdpl`,
      'Waktu Update': data ? data.lastUpdated : '-',
    };
  });

  // Sheet 1: All Stations Summary
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  safeAppendSheet(wb, wsSummary, 'Ringkasan Stasiun');

  // Sheet 2: Selected Region Hourly History
  if (selectedRegion && selectedData && selectedData.hourlyHistory && selectedData.hourlyHistory.length > 0) {
    const hourlyRows = selectedData.hourlyHistory.map((h, i) => ({
      No: i + 1,
      Wilayah: selectedRegion.name,
      'Waktu (Jam)': h.time,
      'Curah Hujan (mm)': h.rainfall,
      'Probabilitas Hujan (%)': h.precipitationProb,
      'Suhu (°C)': h.temperature,
      'Kelembaban Udara (%)': h.humidity,
      'Tutupan Awan (%)': h.cloudCover,
      'Kecepatan Angin (km/jam)': h.windSpeed,
    }));
    const wsHourly = XLSX.utils.json_to_sheet(hourlyRows);
    safeAppendSheet(wb, wsHourly, 'Historis 24 Jam');
  }

  // Sheet 3: Selected Region 7-day Forecast
  if (selectedRegion && selectedData && selectedData.dailyForecast && selectedData.dailyForecast.length > 0) {
    const dailyRows = selectedData.dailyForecast.map((d, i) => ({
      No: i + 1,
      Wilayah: selectedRegion.name,
      Hari: d.dayName,
      Tanggal: d.date,
      'Total Curah Hujan (mm)': d.rainfallSum,
      'Peluang Hujan Maks (%)': d.rainProbMax,
      'Suhu Maks (°C)': d.maxTemp,
      'Suhu Min (°C)': d.minTemp,
      'Prediksi Cuaca': d.weatherDescription,
    }));
    const wsDaily = XLSX.utils.json_to_sheet(dailyRows);
    safeAppendSheet(wb, wsDaily, 'Prakiraan 7 Hari');
  }

  // Trigger download with Blob & ObjectURL for iframe & browser compatibility
  const fileName = `Laporan_Curah_Hujan_Indonesia_${dateStr}.xlsx`;
  
  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);
  } catch (e) {
    console.warn('Fallback to XLSX.writeFile:', e);
    XLSX.writeFile(wb, fileName);
  }
}

export function exportToPDF(
  regions: Region[],
  rainfallDataMap: Record<string, LiveRainfallData>,
  alerts: EarlyWarningAlert[],
  selectedRegion?: Region,
  selectedData?: LiveRainfallData
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('HUJAN NUSANTARA - SISTEM PERINGATAN DINI CURAH HUJAN', 14, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Laporan Resmi Pemantauan Real-Time & Prakiraan Cuaca | Diterbitkan: ${dateFormatted}, ${timeFormatted} WIB`, 14, 21);
  doc.text('Sumber Data: Stasiun Pengamatan Cuaca & Model Presipitasi Terbuka Terpadu', 14, 27);

  // Summary Metrics Cards
  let yPos = 38;

  // Calculate statistics
  const totalMonitored = regions.length;
  let activeRainCount = 0;
  let highestRainRegion = { name: '-', rain: 0 };
  let alertCount = 0;

  regions.forEach(r => {
    const d = rainfallDataMap[r.id];
    if (d) {
      if (d.currentRainfall > 0) activeRainCount++;
      if (d.currentRainfall > highestRainRegion.rain) {
        highestRainRegion = { name: r.name, rain: d.currentRainfall };
      }
      if (d.alertSeverity !== 'normal') alertCount++;
    }
  });

  // Metric Boxes
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  
  // Box 1: Total Stasiun
  doc.roundedRect(14, yPos, 42, 18, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL STASIUN', 17, yPos + 6);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalMonitored} Lokasi`, 17, yPos + 14);

  // Box 2: Stasiun Hujan
  doc.roundedRect(60, yPos, 42, 18, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('SEDANG HUJAN', 63, yPos + 6);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 132, 199);
  doc.text(`${activeRainCount} Wilayah`, 63, yPos + 14);

  // Box 3: Peringatan Dini
  doc.roundedRect(106, yPos, 44, 18, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('STATUS PERINGATAN', 109, yPos + 6);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(alertCount > 0 ? 220 : 22, alertCount > 0 ? 38 : 101, alertCount > 0 ? 38 : 52);
  doc.text(`${alertCount} Peringatan Aktif`, 109, yPos + 14);

  // Box 4: Curah Tertinggi
  doc.roundedRect(154, yPos, 42, 18, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('CURAH TERTINGGI', 157, yPos + 6);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(234, 88, 12);
  doc.text(`${highestRainRegion.rain} mm/jam`, 157, yPos + 14);

  yPos += 24;

  // If specific region is selected, show detail box first
  if (selectedRegion && selectedData) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, yPos, 182, 26, 2, 2, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`FOKUS DAERAH: ${selectedRegion.name.toUpperCase()} (${selectedRegion.province})`, 18, yPos + 7);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const line1 = `Curah Hujan Saat Ini: ${selectedData.currentRainfall} mm/jam | Akumulasi 24 Jam: ${selectedData.rainfallPast24h} mm | Prediksi 24 Jam: ${selectedData.rainfallNext24h} mm`;
    const line2 = `Suhu: ${selectedData.temperature}°C | Kelembaban: ${selectedData.humidity}% | Angin: ${selectedData.windSpeed} km/jam | Kondisi: ${selectedData.weatherDescription}`;
    const line3 = `Status Peringatan: ${selectedData.alertSeverity.toUpperCase()} (${selectedData.intensityLevel.replace('_', ' ').toUpperCase()}) | Stasiun: ${selectedRegion.stationCode}`;
    doc.text(line1, 18, yPos + 13);
    doc.text(line2, 18, yPos + 18);
    doc.text(line3, 18, yPos + 23);

    yPos += 30;
  }

  // Table of Stations
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TABEL DATA CURAH HUJAN & STATUS STASIUN METEOROLOGI', 14, yPos);
  yPos += 4;

  const tableData = regions.map((r, idx) => {
    const d = rainfallDataMap[r.id];
    return [
      (idx + 1).toString(),
      r.name,
      r.province,
      r.island,
      d ? `${d.currentRainfall} mm/j` : '-',
      d ? `${d.rainfallPast24h} mm` : '-',
      d ? `${d.temperature}°C` : '-',
      d ? `${d.humidity}%` : '-',
      d ? d.weatherDescription : '-',
      d ? d.alertSeverity.toUpperCase() : 'NORMAL',
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['No', 'Wilayah', 'Provinsi', 'Pulau', 'Hujan Saat Ini', '24 Jam', 'Suhu', 'Lembab', 'Cuaca', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 32 },
      2: { cellWidth: 26 },
      3: { cellWidth: 20 },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 16, halign: 'right' },
      6: { cellWidth: 12, halign: 'center' },
      7: { cellWidth: 14, halign: 'center' },
      8: { cellWidth: 22 },
      9: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 9) {
        const val = hookData.cell.raw;
        if (val === 'AWAS') {
          hookData.cell.styles.textColor = [220, 38, 38];
        } else if (val === 'SIAGA') {
          hookData.cell.styles.textColor = [234, 88, 12];
        } else if (val === 'WASPADA') {
          hookData.cell.styles.textColor = [202, 138, 4];
        } else {
          hookData.cell.styles.textColor = [22, 101, 52];
        }
      }
    },
  });

  // Footer / Emergency contact
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Kontak Darurat Bencana: BNPB (117) | Basarnas (115) | Informasi Cuaca BMKG (196) - Halaman ' + i + ' dari ' + pageCount,
      14,
      290
    );
  }

  doc.save(`Laporan_Peringatan_Hujan_Indonesia_${now.toISOString().split('T')[0]}.pdf`);
}

// ----------------------------------------------------
// EXPORT 30 HARI TERAKHIR (HISTORIS BULANAN)
// ----------------------------------------------------

export function export30DaysToExcel(
  histories: MonthHistorySummary[],
  selectedRegion?: Region
) {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toISOString().split('T')[0];

  const safeAppendSheet = (workbook: XLSX.WorkBook, sheet: XLSX.WorkSheet, rawName: string) => {
    const cleanName = (rawName || 'Sheet')
      .replace(/[\\/?*[\]:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 25);
    XLSX.utils.book_append_sheet(workbook, sheet, cleanName);
  };

  // Sheet 1: Rekap 30 Hari Seluruh Wilayah
  const summaryRows = histories.map((h, idx) => ({
    No: idx + 1,
    'Wilayah / Kota': h.regionName,
    Provinsi: h.province,
    Pulau: h.island,
    'Kode Stasiun': h.stationCode,
    'Total Hujan 30 Hari (mm)': h.totalRainfall30d,
    'Rata-rata Harian (mm/hari)': h.averageDailyRain,
    'Hujan Maksimum Harian (mm)': h.maxDailyRain,
    'Tanggal Hujan Maksimum': h.maxDailyRainDate,
    'Hari Hujan (>0.5 mm)': `${h.rainyDaysCount} Hari`,
    'Hari Hujan Lebat (≥20 mm)': `${h.heavyRainDaysCount} Hari`,
    'Hari Sangat Lebat (≥50 mm)': `${h.extremeRainDaysCount} Hari`,
    Latitude: h.lat,
    Longitude: h.lng,
    Elevasi: `${h.elevationMeters} mdpl`,
  }));

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  safeAppendSheet(wb, wsSummary, 'Rekap 30 Hari');

  // Sheet 2: Detail Harian untuk Wilayah Terpilih (atau wilayah pertama)
  const targetHistory = selectedRegion 
    ? histories.find(h => h.regionId === selectedRegion.id) || histories[0]
    : histories[0];

  if (targetHistory && targetHistory.dailyList.length > 0) {
    const dailyRows = targetHistory.dailyList.map((d, idx) => ({
      No: idx + 1,
      Wilayah: targetHistory.regionName,
      Tanggal: d.date,
      Hari: d.dayName,
      'Curah Hujan (mm)': d.rainfall,
      'Kategori Intensitas': d.intensityCategory,
      'Suhu Maks (°C)': d.maxTemp,
      'Suhu Min (°C)': d.minTemp,
      'Kecepatan Angin Maks (km/j)': d.maxWindSpeed,
      'Kondisi Cuaca': d.weatherDescription,
    }));

    const wsDaily = XLSX.utils.json_to_sheet(dailyRows);
    safeAppendSheet(wb, wsDaily, 'Detail Harian 30 Hari');
  }

  const fileName = `Rekap_Curah_Hujan_30_Hari_${dateStr}.xlsx`;

  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);
  } catch (e) {
    console.warn('Fallback to XLSX.writeFile:', e);
    XLSX.writeFile(wb, fileName);
  }
}

export function export30DaysToCSV(
  histories: MonthHistorySummary[],
  selectedRegion?: Region
) {
  const dateStr = new Date().toISOString().split('T')[0];

  // If single region is targeted, output its full 30 days daily logs. If multiple, output all daily records.
  const targetHistories = (selectedRegion && histories.length === 1) ? histories : histories;

  const headers = [
    'No',
    'Wilayah',
    'Provinsi',
    'Pulau',
    'Kode Stasiun',
    'Tanggal',
    'Hari',
    'Curah Hujan (mm)',
    'Kategori Intensitas',
    'Suhu Maks (°C)',
    'Suhu Min (°C)',
    'Kecepatan Angin Maks (km/j)',
    'Kondisi Cuaca'
  ];

  let rowCounter = 1;
  const rows: string[] = [];

  for (const h of targetHistories) {
    for (const d of h.dailyList) {
      rows.push([
        rowCounter++,
        `"${h.regionName}"`,
        `"${h.province}"`,
        `"${h.island}"`,
        `"${h.stationCode}"`,
        `"${d.date}"`,
        `"${d.dayName}"`,
        d.rainfall,
        `"${d.intensityCategory}"`,
        d.maxTemp,
        d.minTemp,
        d.maxWindSpeed,
        `"${d.weatherDescription}"`
      ].join(','));
    }
  }

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `Data_Historis_Curah_Hujan_30_Hari_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 500);
}

export function export30DaysToPDF(
  histories: MonthHistorySummary[],
  selectedRegion?: Region
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('HUJAN NUSANTARA - BULETIN HISTORIS 30 HARI TERAKHIR', 14, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Laporan Rekapitulasi Presipitasi & Dinamika Iklim Bulanan | Diterbitkan: ${dateFormatted}`, 14, 21);
  doc.text('Sumber Data: Observasi Meteorologi Terpadu & Reanalisis Presipitasi', 14, 27);

  let yPos = 38;

  // If single region is focused
  const targetHistory = selectedRegion 
    ? histories.find(h => h.regionId === selectedRegion.id) || histories[0]
    : histories[0];

  if (histories.length === 1 && targetHistory) {
    // Detailed Focus Region Box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, yPos, 182, 32, 2, 2, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`REKAPITULASI 30 HARI: ${targetHistory.regionName.toUpperCase()} (${targetHistory.province})`, 18, yPos + 8);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const l1 = `Total Akumulasi 30 Hari: ${targetHistory.totalRainfall30d} mm | Rata-rata Harian: ${targetHistory.averageDailyRain} mm/hari`;
    const l2 = `Hujan Harian Tertinggi: ${targetHistory.maxDailyRain} mm (Tanggal ${targetHistory.maxDailyRainDate})`;
    const l3 = `Jumlah Hari Hujan: ${targetHistory.rainyDaysCount} Hari | Hari Lebat (≥20mm): ${targetHistory.heavyRainDaysCount} Hari | Hari Ekstrem (≥50mm): ${targetHistory.extremeRainDaysCount} Hari`;
    doc.text(l1, 18, yPos + 15);
    doc.text(l2, 18, yPos + 21);
    doc.text(l3, 18, yPos + 27);

    yPos += 38;

    // Daily Table
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('RINCIAN CURAH HUJAN HARIAN (30 HARI TERAKHIR)', 14, yPos);
    yPos += 4;

    const tableData = targetHistory.dailyList.map((d, i) => [
      (i + 1).toString(),
      d.date,
      d.dayName,
      `${d.rainfall} mm`,
      d.intensityCategory,
      `${d.minTemp}°C - ${d.maxTemp}°C`,
      `${d.maxWindSpeed} km/j`,
      d.weatherDescription,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['No', 'Tanggal', 'Hari', 'Curah Hujan', 'Kategori', 'Rentang Suhu', 'Angin Maks', 'Kondisi Cuaca']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 18 },
        3: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
        4: { cellWidth: 32 },
        5: { cellWidth: 26, halign: 'center' },
        6: { cellWidth: 20, halign: 'center' },
        7: { cellWidth: 34 },
      },
    });
  } else {
    // Multi Region Summary Table
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('REKAPITULASI CURAH HUJAN 30 HARI SE-INDONESIA', 14, yPos);
    yPos += 4;

    const tableData = histories.map((h, i) => [
      (i + 1).toString(),
      h.regionName,
      h.province,
      `${h.totalRainfall30d} mm`,
      `${h.averageDailyRain} mm`,
      `${h.maxDailyRain} mm`,
      `${h.rainyDaysCount} hr`,
      `${h.heavyRainDaysCount} hr`,
      `${h.extremeRainDaysCount} hr`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['No', 'Wilayah', 'Provinsi', 'Total 30 Hari', 'Rata-Rata', 'Harian Maks', 'Hari Hujan', 'Hari Lebat', 'Hari Ekstrem']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 32 },
        2: { cellWidth: 28 },
        3: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
        4: { cellWidth: 18, halign: 'right' },
        5: { cellWidth: 20, halign: 'right' },
        6: { cellWidth: 18, halign: 'center' },
        7: { cellWidth: 18, halign: 'center' },
        8: { cellWidth: 18, halign: 'center' },
      },
    });
  }

  // Footer / Page numbers
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Buletin Historis Cuaca Hujan Nusantara - Halaman ' + i + ' dari ' + pageCount,
      14,
      290
    );
  }

  doc.save(`Laporan_Historis_30_Hari_${now.toISOString().split('T')[0]}.pdf`);
}

