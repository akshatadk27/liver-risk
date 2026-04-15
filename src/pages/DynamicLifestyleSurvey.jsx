// src/pages/DynamicLifestyleSurvey.jsx
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, Scale } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePatientData } from '../context/PatientDataContext';

const QUESTIONS = [
  {
    key: 'alcohol', icon: '🍷', label: 'Alcohol Consumption',
    options: ['Never', 'Occasionally', 'Regularly', 'Daily'],
  },
  {
    key: 'smoking', icon: '🚬', label: 'Smoking Status',
    options: ['Never', 'Former', 'Current'],
  },
  {
    key: 'hepatitis', icon: '🩺', label: 'Hepatitis Status',
    options: ['No', 'Hepatitis B', 'Hepatitis C', 'Both', 'Unknown'],
  },
  {
    key: 'diabetes', icon: '💉', label: 'Diabetes',
    options: ['No', 'Type 1', 'Type 2', 'Pre-diabetic', 'Unknown'],
  },
  {
    key: 'familyHistory', icon: '🧬', label: 'Family History of Liver Disease',
    hint: 'Has any blood relative been diagnosed with liver disease, cirrhosis, or liver cancer?',
    options: ['No', 'Yes — Parent / Sibling', 'Yes — Grandparent / Uncle / Aunt', 'Unknown'],
  },
];

// BMI category helper
function getBMICategory(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', arrow: '↓' };
  if (bmi <= 24.9) return { label: 'Normal weight', color: 'text-green-600', bg: 'bg-green-50 border-green-200', arrow: '✓' };
  if (bmi <= 29.9) return { label: 'Overweight', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', arrow: '↑' };
  return { label: 'Obese', color: 'text-red-600', bg: 'bg-red-50 border-red-200', arrow: '↑↑' };
}

export default function DynamicLifestyleSurvey() {
  const navigate = useNavigate();
  const { state, setLifestyleData } = usePatientData();
  const extracted = state.extractedData || {};

  const [answers, setAnswers] = useState({
    alcohol: '', smoking: '', hepatitis: '', diabetes: '', familyHistory: '', bmi: '',
  });
  const [bmiUnknown, setBmiUnknown] = useState(false);
  const [loading, setLoading]       = useState(false);

  // Height / Weight for BMI calculation
  const [height, setHeight] = useState('');   // cm
  const [weight, setWeight] = useState('');   // kg
  const [enterBmiDirect, setEnterBmiDirect] = useState(false);

  // Auto-calculate BMI from height + weight
  const calculatedBMI = useMemo(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!h || !w || h < 100 || h > 250 || w < 20 || w > 300) return null;
    return Math.round((w / Math.pow(h / 100, 2)) * 10) / 10;
  }, [height, weight]);

  // Sync calculated BMI into the answers state
  useEffect(() => {
    if (calculatedBMI && !enterBmiDirect) {
      setAnswers(prev => ({ ...prev, bmi: String(calculatedBMI) }));
    }
  }, [calculatedBMI, enterBmiDirect]);

  const answered = Object.values(answers).filter(Boolean).length + (bmiUnknown ? 1 : 0);
  const total    = 6;

  const set = (key, val) => setAnswers(p => ({ ...p, [key]: val }));

  const handleCalculate = () => {
    setLoading(true);
    const data = {
      ...answers,
      bmi:           bmiUnknown ? null : answers.bmi,
      hbv:           ['Hepatitis B', 'Both'].includes(answers.hepatitis),
      hcv:           ['Hepatitis C', 'Both'].includes(answers.hepatitis),
      familyHistory: answers.familyHistory,
    };
    setLifestyleData(data);
    setTimeout(() => navigate('/dynamic/results'), 600);
  };

  const bmiCat = answers.bmi && !bmiUnknown ? getBMICategory(parseFloat(answers.bmi)) : null;

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center text-sm font-bold">1</div>
          <span className="text-slate-400 text-sm">Upload Report</span>
        </div>
        <div className="flex-1 h-0.5 bg-liver-400 mx-2" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-liver-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
          <span className="font-medium text-slate-700 text-sm">Lifestyle Survey</span>
        </div>
      </div>

      {/* Summary of extracted data */}
      {Object.keys(extracted).length > 0 && (
        <div className="bg-liver-50 border border-liver-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-liver-600" />
            <p className="text-liver-700 font-semibold text-sm">Data from your blood report</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(extracted).map(([k, v]) => (
              <span key={k} className="badge bg-liver-100 text-liver-700 capitalize">
                {k}: {v}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-slate-800">Lifestyle Questions</h1>
        <span className="text-sm text-slate-500">{answered}/{total} answered</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100 rounded-full mb-8 overflow-hidden">
        <div className="h-full bg-liver-500 rounded-full transition-all duration-500"
             style={{ width: `${(answered / total) * 100}%` }} />
      </div>

      <div className="space-y-6">
        {/* MCQ questions */}
        {QUESTIONS.map(q => (
          <div key={q.key} className="card">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{q.icon}</span>
              <div>
                <h3 className="font-semibold text-slate-700">{q.label}</h3>
                <p className="text-xs text-slate-400">
                  {q.hint || 'Select one · skip to leave as Unknown'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {q.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => set(q.key, answers[q.key] === opt ? '' : opt)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    answers[q.key] === opt
                      ? 'bg-liver-600 border-liver-600 text-white shadow-md'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-liver-300 hover:bg-liver-50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* ── BMI — calculated from height + weight ── */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⚖️</span>
            <div>
              <h3 className="font-semibold text-slate-700">Body Measurements (BMI)</h3>
              <p className="text-xs text-slate-400">
                BMI = Weight (kg) ÷ Height² (m) &nbsp;·&nbsp; Normal range: 18.5–24.9
              </p>
            </div>
          </div>

          {!bmiUnknown && (
            <div className="space-y-4">
              {/* Toggle: calculate from H+W vs enter directly */}
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => { setEnterBmiDirect(false); }}
                  className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
                    !enterBmiDirect
                      ? 'bg-liver-600 border-liver-600 text-white'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-liver-300'
                  }`}
                >
                  Enter Height &amp; Weight
                </button>
                <button
                  onClick={() => { setEnterBmiDirect(true); setHeight(''); setWeight(''); }}
                  className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
                    enterBmiDirect
                      ? 'bg-liver-600 border-liver-600 text-white'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-liver-300'
                  }`}
                >
                  I know my BMI
                </button>
              </div>

              {!enterBmiDirect ? (
                /* ── Height + Weight inputs ── */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Height */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Height</label>
                      <div className="relative">
                        <input
                          type="number" step="0.5" min="100" max="250"
                          value={height}
                          onChange={e => setHeight(e.target.value)}
                          onWheel={e => e.target.blur()}
                          className="input-field w-full pr-10"
                          placeholder="e.g. 165"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">cm</span>
                      </div>
                    </div>
                    {/* Weight */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Weight</label>
                      <div className="relative">
                        <input
                          type="number" step="0.5" min="20" max="300"
                          value={weight}
                          onChange={e => setWeight(e.target.value)}
                          onWheel={e => e.target.blur()}
                          className="input-field w-full pr-10"
                          placeholder="e.g. 70"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">kg</span>
                      </div>
                    </div>
                  </div>

                  {/* Calculated BMI result */}
                  {calculatedBMI && bmiCat && (
                    <div className={`rounded-xl p-3 border flex items-center gap-4 ${bmiCat.bg}`}>
                      <div className="text-center min-w-[4rem]">
                        <p className={`text-3xl font-display font-bold ${bmiCat.color}`}>
                          {calculatedBMI}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">kg/m²</p>
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${bmiCat.color}`}>
                          {bmiCat.arrow} {bmiCat.label}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Height: <strong>{height} cm</strong> &nbsp;·&nbsp; Weight: <strong>{weight} kg</strong>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Calculation: {weight} ÷ ({height}/100)² = {calculatedBMI}
                        </p>
                      </div>
                    </div>
                  )}

                  {(!height || !weight) && (
                    <p className="text-xs text-slate-400">Enter both height and weight to auto-calculate BMI.</p>
                  )}
                </div>
              ) : (
                /* ── Direct BMI entry ── */
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="number" step="0.1" min="10" max="70"
                        value={answers.bmi}
                        onChange={e => set('bmi', e.target.value)}
                        onWheel={e => e.target.blur()}
                        className="input-field pr-16"
                        placeholder="e.g. 22.5"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">kg/m²</span>
                    </div>
                  </div>
                  {answers.bmi && bmiCat && (
                    <p className={`text-xs font-medium ${bmiCat.color}`}>
                      {bmiCat.arrow} {bmiCat.label} (Normal: 18.5–24.9 kg/m²)
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer mt-4">
            <input
              type="checkbox"
              checked={bmiUnknown}
              onChange={e => {
                setBmiUnknown(e.target.checked);
                if (e.target.checked) {
                  set('bmi', ''); setHeight(''); setWeight('');
                }
              }}
              className="w-4 h-4 rounded accent-liver-600"
            />
            <span className="text-sm text-slate-500">I don't know my height / weight</span>
          </label>

          {bmiUnknown && (
            <p className="text-xs text-slate-400 mt-2 ml-6">
              BMI will be skipped — the calculation will still run using your blood values and lifestyle answers.
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-8">
        <button onClick={() => navigate('/dynamic')} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={handleCalculate}
          className="btn-primary flex items-center gap-2 flex-1 justify-center"
          disabled={loading}
        >
          {loading ? 'Calculating…' : 'Calculate My Risk'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
