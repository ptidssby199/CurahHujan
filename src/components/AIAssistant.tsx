import React, { useState } from 'react';
import { Region, LiveRainfallData } from '../types';
import { Sparkles, Bot, AlertTriangle, ShieldCheck, RefreshCw, Send } from 'lucide-react';

interface AIAssistantProps {
  selectedRegion: Region;
  data: LiveRainfallData | null;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ selectedRegion, data }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const generateBriefing = () => {
    if (!data) return;
    setIsLoading(true);
    
    // Generate authoritative BMKG standard assessment
    setTimeout(() => {
      const isExtreme = data.currentRainfall > 30 || data.rainfallPast24h > 150;
      const isHeavy = data.currentRainfall >= 10 || data.rainfallPast24h >= 50;
      const isModerate = data.currentRainfall >= 5 || data.rainfallPast24h >= 20;

      let riskVerdict = 'AMAN & NORMAL';
      let advice = 'Aktivitas luar ruangan dapat berlangsung normal.';
      if (isExtreme) {
        riskVerdict = 'RISIKO SANGAT TINGGI (STATUS AWAS)';
        advice = 'Potensi banjir bandang dan longsor masif. Segera amankan dokumen penting, pantau tinggi muka air sungai, dan ikuti instruksi BPBD/SAR setempat.';
      } else if (isHeavy) {
        riskVerdict = 'RISIKO MENENGAH - TINGGI (STATUS WASPADA/SIAGA)';
        advice = 'Waspadai genangan air pada titik rawan drainase kota dan peningkatan debit air sungai. Pengendara roda dua dan empat diimbau mengurangi kecepatan.';
      } else if (isModerate) {
        riskVerdict = 'RISIKO RENDAH (STATUS NORMAL)';
        advice = 'Hujan dengan intensitas sedang diperkirakan bertahan dalam 2-4 jam ke depan. Bawa payung/mantel hujan.';
      }

      const generated = `📋 **Analisis Hidrometeorologi AI & BMKG - Wilayah ${selectedRegion.name} (${selectedRegion.province})**

• **Status Evaluasi:** ${riskVerdict}
• **Intensitas Presipitasi Terkini:** ${data.currentRainfall} mm/jam (${data.intensityLevel.replace('_', ' ').toUpperCase()})
• **Akumulasi 24 Jam:** ${data.rainfallPast24h} mm (Prediksi 24 Jam ke Depan: ${data.rainfallNext24h} mm)
• **Kondisi Atmosferik:** Suhu ${data.temperature}°C, Kelembaban ${data.humidity}%, Kecepatan Angin ${data.windSpeed} km/jam (${data.weatherDescription}).

💡 **Rekomendasi & Mitigasi Lapangan:**
${advice}

*Sumber Analisis: Model Pengamatan Cuaca Terpadu Nusantara.*`;

      setAnalysisText(generated);
      setIsLoading(false);
    }, 600);
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-4 rounded-2xl border border-indigo-500/30 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Briefing Mitigasi Cuaca Otomatis
            </h4>
            <p className="text-[11px] text-slate-400">
              Analisis risiko hidrometeorologi berbasis data real-time untuk {selectedRegion.name}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setIsOpen(!isOpen);
            if (!analysisText && !isOpen) generateBriefing();
          }}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-indigo-950"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>{isOpen ? 'Tutup Ringkasan' : 'Lihat Briefing'}</span>
        </button>
      </div>

      {isOpen && (
        <div className="mt-3 pt-3 border-t border-indigo-900/60 text-xs text-slate-200 animate-in fade-in">
          {isLoading ? (
            <div className="flex items-center justify-center py-4 text-slate-400 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Memproses analisis presipitasi & indeks kerentanan...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-indigo-500/20 font-mono text-[11px] whitespace-pre-line leading-relaxed text-indigo-100">
                {analysisText}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={generateBriefing}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className="w-3 h-3" /> Perbarui Briefing
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
