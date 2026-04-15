// src/pages/StaticResults.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { Trophy, Upload, Download, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { usePatientData } from '../context/PatientDataContext';
import { TECHNIQUES, calculatePatientRisk, getRiskCategory } from '../data/staticData';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { saveStaticBatch } from '../lib/api';

export default function StaticResults() {
  const navigate  = useNavigate();
  const { state } = usePatientData();
  const [results, setResults]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const saveTriggered = useRef(false);

  useEffect(() => {
    const data = state.processedData;
    if (!data || data.length === 0) { navigate('/static'); return; }

    // Calculate risk for every patient × every technique
    const byPatient = data.map(p => ({ patient: p, scores: calculatePatientRisk(p) }));

    // Aggregate per technique
    const aggregate = TECHNIQUES.map(tech => {
      const scores = byPatient.map(r => r.scores[tech.name] ?? 0);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      return {
        name:      tech.name,
        shortName: tech.name.split(' ').slice(0, 2).join(' '),
        avgRisk:   parseFloat(avg.toFixed(2)),
        accuracy:  tech.accuracy,
        precision: tech.precision,
        recall:    tech.recall,
        f1_score:  tech.f1_score,
        icon:      tech.icon,
      };
    }).sort((a, b) => b.accuracy - a.accuracy);

    const bestPerformer = aggregate[0];

    // Risk distribution
    const allRisks = byPatient.map(r => {
      const vals = Object.values(r.scores);
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    });
    const distribution = {
      low:    allRisks.filter(r => r <= 20).length,
      moderate: allRisks.filter(r => r > 20 && r <= 40).length,
      high:   allRisks.filter(r => r > 40 && r <= 60).length,
      vhigh:  allRisks.filter(r => r > 60).length,
    };
    const avgRisk = allRisks.reduce((a, b) => a + b, 0) / allRisks.length;

    setResults({ byPatient, aggregate, bestPerformer, distribution, avgRisk, totalPatients: data.length });
    setLoading(false);

    // Save aggregate batch summary to database
    if (!saveTriggered.current) {
      saveTriggered.current = true;
      (async () => {
        try {
          await saveStaticBatch({
            patient_count: data.length,
            average_risk: parseFloat(avgRisk.toFixed(2)),
            techniques_summary: aggregate // Contains name, avgRisk, accuracy, precision, recall, f1_score
          });
          console.log('[StaticResults] Saved batch aggregate to database!');
        } catch (e) {
          console.log('[StaticResults] Database static save failed:', e.message);
        }
      })();
    }
  }, [state.processedData, navigate]);

  const downloadCSV = () => {
    if (!results) return;
    const rows = results.byPatient.map((r, i) => {
      const row = { '#': i + 1, ...r.patient };
      TECHNIQUES.forEach(t => { row[t.name + '_risk%'] = (r.scores[t.name] ?? 0).toFixed(2); });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, 'liver_risk_results.xlsx');
    toast.success('Results downloaded!');
  };

  if (loading) return (
    <div className="min-h-96 flex items-center justify-center">
      <LoadingSpinner size="lg" text="Calculating risk scores for all patients…" />
    </div>
  );

  if (!results) return null;
  const { aggregate, bestPerformer, distribution, avgRisk, totalPatients } = results;

  const radarData = aggregate.slice(0, 5).map(t => ({
    subject: t.shortName, accuracy: t.accuracy, precision: t.precision, recall: t.recall,
  }));

  return (
    <div className="max-w-6xl mx-auto animate-slide-up space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800">Static Analysis Results</h1>
          <p className="text-slate-500 text-sm">{totalPatients} patients processed across 9 techniques</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadCSV} className="btn-secondary flex items-center gap-2 text-sm py-2">
            <Download className="w-4 h-4" /> Download CSV
          </button>
          <button onClick={() => navigate('/static')} className="btn-primary flex items-center gap-2 text-sm py-2">
            <Upload className="w-4 h-4" /> New Upload
          </button>
        </div>
      </div>

      {/* Best Performer */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 p-6 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
              {bestPerformer.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-5 h-5" />
                <span className="font-bold text-sm uppercase tracking-wide opacity-90">Overall Best Performer</span>
              </div>
              <h2 className="text-3xl font-display font-bold mb-3">{bestPerformer.name}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Accuracy',  value: bestPerformer.accuracy  + '%' },
                  { label: 'Precision', value: bestPerformer.precision + '%' },
                  { label: 'Recall',    value: bestPerformer.recall    + '%' },
                  { label: 'F1-Score',  value: bestPerformer.f1_score  + '%' },
                ].map(m => (
                  <div key={m.label} className="bg-white/20 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold">{m.value}</p>
                    <p className="text-xs opacity-80">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-sm opacity-80 mt-4">
            Highest accuracy across all 9 techniques. Validated in Thomas &amp; Mahesh, ICCCCT 2025.
          </p>
        </div>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Patients',    value: totalPatients,              icon: <Users className="w-5 h-5" />,    bg: 'bg-blue-50',   text: 'text-blue-600' },
          { label: 'Average Risk',      value: avgRisk.toFixed(1) + '%',   icon: <TrendingUp className="w-5 h-5" />, bg: 'bg-orange-50', text: 'text-orange-600' },
          { label: 'Low Risk Patients', value: distribution.low,           icon: <AlertCircle className="w-5 h-5" />, bg: 'bg-green-50',  text: 'text-green-600' },
          { label: 'High Risk Patients',value: distribution.high + distribution.vhigh, icon: <AlertCircle className="w-5 h-5" />, bg: 'bg-red-50', text: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <div className={`w-10 h-10 ${s.bg} ${s.text} rounded-xl flex items-center justify-center mx-auto mb-2`}>
              {s.icon}
            </div>
            <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar chart - accuracy */}
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-4">Technique Accuracy Comparison</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={aggregate} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="shortName" tick={{ fontSize: 10 }} angle={-40} textAnchor="end" interval={0} />
              <YAxis domain={[75, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => v + '%'} />
              <Bar dataKey="accuracy" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar chart */}
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-4">Top 5 Techniques Radar</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis domain={[75, 100]} tick={{ fontSize: 9 }} />
              <Radar name="Accuracy"  dataKey="accuracy"  stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.2} />
              <Radar name="Precision" dataKey="precision" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} />
              <Radar name="Recall"    dataKey="recall"    stroke="#f97316" fill="#f97316" fillOpacity={0.1} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grouped bar - precision/recall/F1 */}
      <div className="card">
        <h3 className="font-semibold text-slate-700 mb-4">Precision · Recall · F1-Score per Technique</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={aggregate} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="shortName" tick={{ fontSize: 10 }} angle={-40} textAnchor="end" interval={0} />
            <YAxis domain={[75, 100]} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => v + '%'} />
            <Legend wrapperStyle={{ paddingTop: 16 }} />
            <Bar dataKey="precision" name="Precision" fill="#0ea5e9" radius={[3,3,0,0]} />
            <Bar dataKey="recall"    name="Recall"    fill="#22c55e" radius={[3,3,0,0]} />
            <Bar dataKey="f1_score"  name="F1-Score"  fill="#f97316" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Ranking table */}
      <div className="card overflow-x-auto">
        <h3 className="font-semibold text-slate-700 mb-4">Technique Ranking</h3>
        <table className="w-full text-sm text-left min-w-max">
          <thead>
            <tr className="border-b border-slate-100">
              {['Rank','Technique','Accuracy','Precision','Recall','F1-Score'].map(h => (
                <th key={h} className="py-3 px-4 font-semibold text-slate-500 text-xs uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {aggregate.map((t, i) => {
              const top3 = i < 3;
              return (
                <tr key={t.name} className={`border-b border-slate-50 ${top3 ? 'bg-green-50' : 'hover:bg-slate-50'}`}>
                  <td className="py-3 px-4">
                    <span className={`badge ${i === 0 ? 'bg-yellow-100 text-yellow-800' : i < 3 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      #{i + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">
                    <span className="mr-2">{t.icon}</span>{t.name}
                  </td>
                  <td className="py-3 px-4 font-semibold text-medical-600">{t.accuracy}%</td>
                  <td className="py-3 px-4 text-slate-600">{t.precision}%</td>
                  <td className="py-3 px-4 text-slate-600">{t.recall}%</td>
                  <td className="py-3 px-4 text-slate-600">{t.f1_score}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
