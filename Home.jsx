// src/pages/Home.jsx
import { useNavigate } from 'react-router-dom';
import {
  BarChart2, UserCheck, Zap, Download, Brain, TrendingUp,
  Shield, FlaskConical, Star, ArrowRight, Database, BookOpen, Award
} from 'lucide-react';
import { TECHNIQUES } from '../data/staticData';

const STATS = [
  { value: '9',      label: 'Statistical Techniques', icon: <Brain className="w-6 h-6" />,     color: 'text-medical-600', bg: 'bg-medical-50' },
  { value: '10',     label: 'IEEE Research Papers',   icon: <BookOpen className="w-6 h-6" />,   color: 'text-liver-600',   bg: 'bg-liver-50' },
  { value: '98.71%', label: 'Highest Accuracy',       icon: <Award className="w-6 h-6" />,      color: 'text-yellow-600',  bg: 'bg-yellow-50' },
  { value: '94.8%',  label: 'Best Recall (Screening)',icon: <Shield className="w-6 h-6" />,     color: 'text-purple-600',  bg: 'bg-purple-50' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in -mt-6">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-medical-900 via-medical-800 to-liver-900 text-white py-20 px-8 -mx-4 sm:-mx-6 lg:-mx-8 mb-12 rounded-b-3xl">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-liver-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm mb-6 backdrop-blur-sm">
            <FlaskConical className="w-4 h-4 text-liver-300" />
            <span>Research-backed · 10 IEEE Papers · v1.0.0</span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight mb-4">
            Liver Cancer Risk<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-liver-300 to-medical-300">
              Assessment Platform
            </span>
          </h1>
          <p className="text-medical-200 text-lg md:text-xl mb-3 font-medium">
            Compare 9 Statistical Techniques · Get Personalized Risk Assessment
          </p>
          <p className="text-medical-300 text-base max-w-2xl mx-auto leading-relaxed mb-8">
            Leveraging epidemiological statistics from 10 peer-reviewed IEEE publications to
            deliver transparent, interpretable liver cancer risk scores — no black-box AI.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate('/static')} className="bg-white text-medical-800 font-bold px-8 py-3 rounded-xl hover:bg-medical-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 justify-center">
              <BarChart2 className="w-5 h-5" /> Launch Static Analysis
            </button>
            <button onClick={() => navigate('/dynamic')} className="bg-liver-500 hover:bg-liver-400 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 justify-center">
              <UserCheck className="w-5 h-5" /> Start Assessment
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {STATS.map(s => (
          <div key={s.label} className="card text-center hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center mx-auto mb-3 ${s.color}`}>
              {s.icon}
            </div>
            <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
            <p className="text-slate-500 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </section>

      {/* ── Module Cards ─────────────────────────────────── */}
      <section className="grid md:grid-cols-2 gap-6 mb-12">
        {/* Static Module */}
        <div className="group relative overflow-hidden card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-medical-200 cursor-pointer"
             onClick={() => navigate('/static')}>
          <div className="absolute inset-0 bg-gradient-to-br from-medical-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-medical-500 to-medical-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
              <BarChart2 className="w-7 h-7 text-white" />
            </div>
            <div className="badge bg-medical-100 text-medical-700 mb-3">📊 Static Module</div>
            <h2 className="text-xl font-display font-bold text-slate-800 mb-2">
              Technique Comparison & Analysis
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-4">
              Upload a CSV or Excel dataset of patients to compare all 9 statistical techniques.
              Find the overall best performer across your entire dataset with full metrics.
            </p>
            <ul className="space-y-2 mb-6">
              {['9 techniques compared simultaneously', 'Bulk CSV/XLSX upload', 'Aggregate best performer', 'Download full results'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                  <Zap className="w-3.5 h-3.5 text-medical-500 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button className="btn-primary w-full flex items-center justify-center gap-2 group-hover:gap-3 transition-all">
              Launch Static Analysis <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Module */}
        <div className="group relative overflow-hidden card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-liver-200 cursor-pointer"
             onClick={() => navigate('/dynamic')}>
          <div className="absolute inset-0 bg-gradient-to-br from-liver-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-liver-500 to-liver-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
              <UserCheck className="w-7 h-7 text-white" />
            </div>
            <div className="badge bg-liver-100 text-liver-700 mb-3">👤 Dynamic Module</div>
            <h2 className="text-xl font-display font-bold text-slate-800 mb-2">
              Personal Risk Assessment
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-4">
              Upload your blood report photo and answer 5 quick lifestyle questions. Our OCR
              engine extracts biomarkers automatically for a personalized risk prediction.
            </p>
            <ul className="space-y-2 mb-6">
              {['OCR extraction from lab photos', '5-question lifestyle survey', 'Identify your risk factors', 'Personalized Stop/Start suggestions'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                  <Zap className="w-3.5 h-3.5 text-liver-500 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button className="w-full bg-liver-600 hover:bg-liver-700 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 group-hover:gap-3">
              Start Assessment <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Techniques Grid ───────────────────────────────── */}
      <section className="mb-12">
        <div className="text-center mb-8">
          <h2 className="section-title">9 Statistical Techniques</h2>
          <p className="section-subtitle">Each validated against peer-reviewed IEEE research papers</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TECHNIQUES.map((t) => (
            <div key={t.id}
              className={`card hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden ${t.id === 1 ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''}`}>
              {t.id === 1 && (
                <div className="absolute top-3 right-3">
                  <span className="badge bg-yellow-400 text-yellow-900">🏆 Best</span>
                </div>
              )}
              <div className="flex items-start gap-3">
                <span className="text-3xl">{t.icon}</span>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{t.name}</p>
                  <p className="text-xs text-slate-400 mb-2">{t.category}</p>
                  <div className="flex gap-3 text-xs">
                    <span className="text-green-600 font-semibold">{t.accuracy}% acc</span>
                    <span className="text-blue-600 font-semibold">{t.f1_score}% F1</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Disclaimer ────────────────────────────────────── */}
      <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
        <div className="flex gap-3">
          <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 font-semibold text-sm">Medical Disclaimer</p>
            <p className="text-amber-700 text-sm mt-1">
              This platform is intended for educational and research purposes only. Risk scores do not
              constitute medical diagnoses. Always consult a qualified healthcare professional for
              clinical decisions.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
