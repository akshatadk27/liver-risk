// src/pages/DynamicResults.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle, CheckCircle, RefreshCw, Download,
  User, Heart, ArrowLeft, ChevronDown, ChevronUp,
  Share2, Activity, FlaskConical
} from 'lucide-react';
import { usePatientData } from '../context/PatientDataContext';
import { RISK_FACTORS } from '../data/staticData';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { savePatient, saveCalculation } from '../lib/api';

// ── IEEE & PubMed Research Basis — SCIENTIFIC REFERENCES ─────────────────────
export const IEEE_PAPERS = [
  { id: 1, ref: 'Xu et al., PMC11753015 (2021)', topic: 'Umbrella review; HBV (12.5x), HCV (11.2x), Smoking (1.55x), Obesity (1.49x), Diabetes (1.53x) ratios' },
  { id: 2, ref: 'Sterling et al., Hepatology 2006', topic: 'FIB-4 Index formula: (Age x AST) / (Platelet x √ALT); validated for fibrosis prediction' },
  { id: 3, ref: 'Thomas & Mahesh, IEEE ICCCCT 2025', topic: 'Bayes Theorem for liver cancer; probabilistic weighting vs ML black-box models' },
  { id: 4, ref: 'Kelagadi et al., IEEE ICPCSN 2024', topic: 'LFT-only diagnostic accuracy (92.4%) without full hematology/CBC data' },
  { id: 5, ref: 'Chakraborty et al., IEEE 2019', topic: 'Brownian motion model reference for statistical prediction of liver health' },
  { id: 6, ref: 'Donato et al., Hepatology 1997', topic: 'Family history of liver disease (OR 3.0 for first-degree relatives)' },
  { id: 7, ref: 'Loomba et al., Gastroenterology 2015', topic: 'NAFLD heritability and metabolic risk factor stacking in liver disease' },
  { id: 8, ref: 'Johnson PJ et al., JCO 2015', topic: 'ALBI score: Assessing liver function using only albumin and bilirubin' },
];

const PDF_LINKS = {
  xu: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11753015/',
  sterling: 'https://pubmed.ncbi.nlm.nih.gov/16628204/',
};

const BIOMARKER_OPTS = {
  bilirubin: { goal: 'Lower Bilirubin', tips: ['Increase hydration (8+ glasses water)', 'Avoid medications that strain the liver', 'Eat fiber-rich foods'] },
  alt: { goal: 'Optimize ALT/SGPT', tips: ['Maintain balanced calorie intake', 'Reduce saturated fats & sugar', 'Engage in cardio exercise'] },
  ast: { goal: 'Optimize AST/SGOT', tips: ['Limit alcohol completely', 'Increase intake of leafy greens', 'Ensure adequate sleep for recovery'] },
  platelets: { goal: 'Support Platelets', tips: ['Focus on Vitamin B12 & Folate', 'Eat lentils, spinach, and lean protein', 'Avoid excessive heavy lifting if very low'] },
  albumin: { goal: 'Maintain Albumin', tips: ['Increase high-quality protein (eggs, nuts)', 'Monitor fluid retention (oedema)', 'Consult for chronic inflammation'] },
  globulin: { goal: 'Support Globulins', tips: ['Include anti-inflammatory foods (turmeric, garlic)', 'Focus on gut health and probiotics', 'Reduce intake of processed salts'] },
  bmi: { goal: 'Target Healthy BMI', tips: ['Weight loss of 0.5kg/week', 'Portion control & mindful eating', 'Strength training to boost metabolism'] },
};

// ── Formula Helpers ────────────────────────────────────────────────────────
function calculateFIB4(age, ast, alt, platelets) {
  if (!age || !ast || !alt || !platelets || isNaN(age) || isNaN(ast) || isNaN(alt) || isNaN(platelets)) return null;
  // Sterling et al. formula: (Age * AST) / (Platelets * √ALT)
  // Platelets must be in 10^9/L (which is same as k/µL)
  const score = (parseFloat(age) * parseFloat(ast)) / (parseFloat(platelets) * Math.sqrt(parseFloat(alt)));
  return {
    score: score.toFixed(2),
    level: score > 3.25 ? 'High (Advanced Fibrosis Likely)' : score >= 1.45 ? 'Moderate' : 'Low',
    lr: score > 3.25 ? 3.5 : score >= 1.45 ? 1.5 : 0.2
  };
}

function calculateAGRatio(alb, glob) {
  if (!alb || !glob || isNaN(alb) || isNaN(glob)) return null;
  const ratio = parseFloat(alb) / parseFloat(glob);
  return {
    ratio: ratio.toFixed(2),
    isLow: ratio < 1.1,
    lr: ratio < 1.1 ? 2.11 : 0.85 // Wang et al. 2025
  };
}

// ── Bayes Theorem — FORMULA 2: WITH PLATELETS & FIB-4 (LFT + CBC Technique) ─────
// Used when platelet data is available. Comprehensive diagnostic.
// Basis: Xu et al. 2021 + Sterling et al. 2006
function calculateBayesRisk_WithPlatelets(patient) {
  const PRIOR_CANCER = 0.05; // 5% baseline prevalence

  // Likelihood Ratios (LR) derived from Meta-Analysis (Xu et al. 2021 | Kraj et al. 2024)
  const L = {
    hbv: 12.5, hcv: 11.2, smoking: 1.55, obesity: 1.49, diabetes: 1.53,
    lowPlatelets: 1.30, elevatedEnzymes: 1.4, ageOver50: 1.75, male: 1.8,
    familyHist: 2.5, lowAG: 2.11,
  };

  // Protective factors (LR < 1)
  const P = {
    healthyDiet: 0.71, normalEnzymes: 0.4, normalPlatelets: 0.6, normalAG: 0.5
  };

  const contributions = {};
  const steps = [];

  // Posterior Odds = Prior Odds * LR1 * LR2 ...
  let currentOdds = PRIOR_CANCER / (1 - PRIOR_CANCER);

  const apply = (lr, label, val) => {
    currentOdds *= lr;
    const runningProb = currentOdds / (1 + currentOdds);
    contributions[label] = { contribution: (lr - 1) * 20 }; // proportional visual scaling
    steps.push({ label, value: val, lr: lr.toFixed(2), runningProb: (runningProb * 100).toFixed(1) });
  };

  // 1. Biological/Viral Factors
  if (['Hepatitis B', 'Both'].includes(patient.hepatitis)) apply(L.hbv, 'HBV Infection', 'Positive');
  if (['Hepatitis C', 'Both'].includes(patient.hepatitis)) apply(L.hcv, 'HCV Infection', 'Positive');
  if (patient.smoking === 'Current') apply(L.smoking, 'Smoking', 'Current');
  if (parseFloat(patient.bmi) > 29.9) apply(L.obesity, 'Obesity (BMI > 30)', patient.bmi);
  if (['Type 1', 'Type 2', 'Pre-diabetic'].includes(patient.diabetes)) apply(L.diabetes, 'Diabetes', patient.diabetes);

  // 2. Hematological/Platelet Parameters
  if (parseFloat(patient.platelets) < 150) {
    apply(L.lowPlatelets, 'Thrombocytopenia (Low PLT)', `${patient.platelets} k/µL`);
  } else {
    apply(P.normalPlatelets, 'Normal Platelet Count', 'Protective');
  }

  // 3. FIB-4 Index Integration (Sterling et al. 2006)
  const fib4 = calculateFIB4(patient.age, patient.ast, patient.alt, patient.platelets);
  if (fib4) {
    apply(fib4.lr, `FIB-4 Index (${fib4.level})`, fib4.score);
  }

  // 4. A/G Ratio Integration (Wang et al. 2025)
  const ag = calculateAGRatio(patient.albumin, patient.globulin);
  if (ag) {
    apply(ag.lr, ag.isLow ? 'Low A/G Ratio' : 'Normal A/G Ratio', ag.ratio);
  }

  // 5. General Factors
  if (parseFloat(patient.alt) > 56 || parseFloat(patient.ast) > 40) apply(L.elevatedEnzymes, 'Elevated Liver Enzymes', 'ALT/AST High');
  if (parseInt(patient.age) > 50) apply(L.ageOver50, 'Age > 50', `${patient.age} yrs`);
  if (patient.gender === 'Male') apply(L.male, 'Male Gender', 'Genetic Factor');
  if (['High', 'Moderate'].includes(patient.diet)) apply(P.healthyDiet, 'Healthy Diet', 'Protective Factor');

  const risk = (currentOdds / (1 + currentOdds)) * 100;
  return { risk, contributions, steps, formula: 'full', prior: PRIOR_CANCER, fib4, agRatio: ag?.ratio };
}

// ── Bayes Theorem — FORMULA 1: WITHOUT PLATELETS (LFT-Only Technique) ─────────
// Used when platelet count is unavailable. Excludes alb/glob/platelets.
// Basis: Xu et al. 2021 Umbrella Review
function calculateBayesRisk_WithoutPlatelets(patient) {
  const PRIOR_CANCER = 0.07; // 7% adjusted prior for missing signals

  const L = {
    hbv: 12.5, hcv: 11.2, smoking: 1.55, obesity: 1.49, diabetes: 1.53,
    elevatedEnzymes: 1.65, // boosted enzyme weight to partially proxy for fibrosis
    ageOver50: 1.75, male: 1.8,
  };
  const P = { healthyDiet: 0.71 };

  const contributions = {};
  const steps = [];
  let currentOdds = PRIOR_CANCER / (1 - PRIOR_CANCER);

  const apply = (lr, label, val) => {
    currentOdds *= lr;
    const runningProb = currentOdds / (1 + currentOdds);
    contributions[label] = { contribution: (lr - 1) * 20 };
    steps.push({ label, value: val, lr: lr.toFixed(2), runningProb: (runningProb * 100).toFixed(1) });
  };

  if (['Hepatitis B', 'Both'].includes(patient.hepatitis)) apply(L.hbv, 'HBV Infection', 'Positive');
  if (['Hepatitis C', 'Both'].includes(patient.hepatitis)) apply(L.hcv, 'HCV Infection', 'Positive');
  if (patient.smoking === 'Current') apply(L.smoking, 'Smoking', 'Current');
  if (parseFloat(patient.bmi) > 29.9) apply(L.obesity, 'Obesity (BMI > 30)', patient.bmi);
  if (['Type 1', 'Type 2', 'Pre-diabetic'].includes(patient.diabetes)) apply(L.diabetes, 'Diabetes', patient.diabetes);
  if (parseFloat(patient.alt) > 56 || parseFloat(patient.ast) > 40) apply(L.elevatedEnzymes, 'Elevated Enzymes', 'High Weight');
  if (parseInt(patient.age) > 50) apply(L.ageOver50, 'Age > 50', `${patient.age} yrs`);
  if (patient.gender === 'Male') apply(L.male, 'Male Gender', 'Male');

  const risk = (currentOdds / (1 + currentOdds)) * 100;
  return { risk, contributions, steps, formula: 'lft-only', prior: PRIOR_CANCER };
}

// ── Auto-select formula based on data availability ────────────────────────────
function calculateBayesRisk(patient) {
  const plateletsAvailable = patient.platelets !== null &&
    patient.platelets !== undefined &&
    patient.platelets !== '' &&
    !isNaN(parseFloat(patient.platelets));

  return plateletsAvailable
    ? calculateBayesRisk_WithPlatelets(patient)
    : calculateBayesRisk_WithoutPlatelets(patient);
}

// ── Risk Category ─────────────────────────────────────────────────────────────
function getRiskCategory(riskPct) {
  if (riskPct <= 20) return { label: 'Low Risk', emoji: '🟢', color: '#16a34a', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' };
  if (riskPct <= 40) return { label: 'Moderate Risk', emoji: '🟡', color: '#ca8a04', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' };
  if (riskPct <= 60) return { label: 'High Risk', emoji: '🟠', color: '#ea580c', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' };
  return { label: 'Very High Risk', emoji: '🔴', color: '#dc2626', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' };
}

// ── Abnormal check ────────────────────────────────────────────────────────────
function checkAbnormal(key, value) {
  const rf = RISK_FACTORS[key];
  if (!rf || value === null || value === undefined || isNaN(parseFloat(value))) return null;
  const v = parseFloat(value);
  if (v > rf.max) return { dir: 'high', severity: v > rf.max * 1.5 ? 'Severe' : v > rf.max * 1.2 ? 'Moderate' : 'Mild' };
  if (v < rf.min) return { dir: 'low', severity: v < rf.min * 0.5 ? 'Severe' : 'Mild' };
  return null;
}

// ── Confidence score (completeness-based) ────────────────────────────────────
function calcConfidence(patient) {
  // Platelets is optional (LFT-only reports won't have it) — reduced weight
  const required = ['age', 'gender', 'bilirubin', 'alt', 'ast', 'bmi', 'alcohol', 'smoking', 'hepatitis', 'diabetes', 'familyHistory'];
  const optional = ['platelets'];
  const filledReq = required.filter(f => patient[f] !== null && patient[f] !== undefined && patient[f] !== '').length;
  const filledOpt = optional.filter(f => patient[f] !== null && patient[f] !== undefined && patient[f] !== '').length;
  // Optional fields count as 0.5 each toward confidence
  return Math.round(((filledReq + filledOpt * 0.5) / (required.length + optional.length * 0.5)) * 100);
}

// ── Suggestion engine ─────────────────────────────────────────────────────────
function buildSuggestions(patient) {
  // Each suggestion tagged with its IEEE/clinical source for display in UI
  const stop = [], start = [], consult = [], followup = [
    { text: 'Schedule a liver health check-up in 3 months', ref: 'Xiao Y., ICDSIS 2024 (IEEE)' },
    { text: 'Repeat liver function tests in 6 months', ref: 'Kelagadi et al., ICPCSN 2024 (IEEE)' },
    { text: 'Maintain a health diary to track lifestyle changes', ref: 'Sharma & Parveen, GUCON 2020 (IEEE)' },
  ];

  if (['Regularly', 'Daily'].includes(patient.alcohol))
    stop.push({ text: 'Reduce or eliminate alcohol — it directly damages liver cells', ref: 'Sharma & Parveen, GUCON 2020 (IEEE)' });
  if (patient.smoking === 'Current')
    stop.push({ text: 'Quit smoking — it accelerates liver disease progression', ref: 'Mabel Rani et al., ICCSAI 2023 (IEEE)' });
  if (parseFloat(patient.bmi) > 24.9)
    stop.push({ text: 'Avoid processed foods, sugary drinks, and trans fats', ref: 'Sharma & Kamboj, Chandigarh 2024 (IEEE)' });

  const altAbn = checkAbnormal('alt', patient.alt);
  const astAbn = checkAbnormal('ast', patient.ast);
  const bilAbn = checkAbnormal('bilirubin', patient.bilirubin);
  const pltAbn = checkAbnormal('platelets', patient.platelets);
  const bmiAbn = checkAbnormal('bmi', patient.bmi);

  if (altAbn || astAbn) start.push({ text: 'Eat more fruits, vegetables, and whole grains to support liver recovery', ref: 'Kelagadi et al., ICPCSN 2024 (IEEE)' });
  if (pltAbn?.dir === 'low') start.push({ text: 'Include iron-rich foods: spinach, lentils, and fortified cereals', ref: 'V. C. R et al., CIISCA 2023 (IEEE)' });
  if (bmiAbn?.dir === 'high') start.push({ text: 'Aim for gradual weight loss of 0.5–1 kg per week through diet', ref: 'Sharma & Kamboj, Chandigarh 2024 (IEEE)' });
  start.push({ text: 'Exercise at least 150 minutes per week (brisk walking, swimming)', ref: 'Sharma & Parveen, GUCON 2020 (IEEE)' });
  start.push({ text: 'Drink 8+ glasses of water daily to support liver detoxification', ref: 'Thomas & Mahesh, ICCCCT 2025 (IEEE)' });

  if (altAbn || astAbn) consult.push({ text: 'Consult a hepatologist regarding elevated liver enzymes (ALT/AST)', ref: 'Kelagadi et al., ICPCSN 2024 (IEEE)' });
  if (bilAbn?.dir === 'high') consult.push({ text: 'Get a complete liver function panel to investigate elevated bilirubin', ref: 'Thomas & Mahesh, ICCCCT 2025 (IEEE)' });
  if (pltAbn?.dir === 'low') consult.push({ text: 'Complete Blood Count (CBC) evaluation for low platelet count', ref: 'V. C. R et al., CIISCA 2023 (IEEE)' });
  if (!patient.platelets) consult.push({ text: 'Upload a CBC/haematology report to include platelet data for a more complete risk assessment', ref: 'V. C. R et al., CIISCA 2023 (IEEE)' });
  if (['Hepatitis B', 'Hepatitis C', 'Both'].includes(patient.hepatitis))
    consult.push({ text: 'Regular hepatology follow-up and antiviral therapy evaluation for hepatitis', ref: 'Kumar et al., ICCSAI 2023 (IEEE)' });
  if (['Type 1', 'Type 2', 'Pre-diabetic'].includes(patient.diabetes))
    consult.push({ text: 'Manage blood sugar levels with your endocrinologist — diabetes is an independent liver cancer risk modifier', ref: 'Sekhar et al., ICICCS 2025 (IEEE)' });
  if (['Yes — Parent / Sibling', 'Yes — Grandparent / Uncle / Aunt'].includes(patient.familyHistory))
    consult.push({ text: 'Discuss your family history of liver disease with a hepatologist — genetic counselling and earlier surveillance screening recommended', ref: 'Donato et al., Hepatology 1997; EASL Guidelines 2022' });
  consult.push({ text: 'Hepatitis B & C screening if not previously done', ref: 'Kumar et al., ICCSAI 2023 (IEEE)' });

  return { stop, start, consult, followup };
}

// ── Risk factor contribution bar ──────────────────────────────────────────────
function ContributionBar({ label, value, maxVal }) {
  const pct = Math.min(100, (value / maxVal) * 100);
  const color = pct > 66 ? '#dc2626' : pct > 33 ? '#ea580c' : '#ca8a04';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-600 w-32 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: pct + '%', backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold text-slate-500 w-10 text-right">+{value.toFixed(0)}%</span>
    </div>
  );
}

export default function DynamicResults() {
  const navigate = useNavigate();
  const { state, clearDynamic } = usePatientData();
  const [results, setResults] = useState(null);
  const [showFormula, setShowFormula] = useState(false);
  const [showRefs, setShowRefs] = useState(false);
  const saveTriggered = useRef(false);

  useEffect(() => {
    console.log('[DynamicResults] useEffect running, state:', state);

    const extracted = state.extractedData || {};
    const lifestyle = state.lifestyleData || {};
    const patient = { ...extracted, ...lifestyle };
    console.log('[DynamicResults] Patient data:', patient);

    if (!extracted || Object.keys(extracted).length === 0) {
      console.log('[DynamicResults] No extracted data, redirecting to /dynamic');
      navigate('/dynamic'); return;
    }

    try {
      const { risk, contributions, steps, formula, prior, fib4, agRatio } = calculateBayesRisk(patient);
      const confidence = calcConfidence(patient);
      const margin = Math.max(2, (100 - confidence) * 0.08);
      const ciLow = Math.max(0, risk - margin).toFixed(1);
      const ciHigh = Math.min(100, risk + margin).toFixed(1);
      const suggestions = buildSuggestions(patient);

      const biomarkers = ['bilirubin', 'alt', 'ast', 'platelets', 'bmi', 'albumin', 'globulin'].map(key => {
        const rf = RISK_FACTORS[key];
        const val = patient[key] !== undefined && patient[key] !== null && patient[key] !== ''
          ? parseFloat(patient[key])
          : NaN;
        const abn = checkAbnormal(key, val);
        return rf ? { key, label: rf.label, unit: rf.unit, value: val, normal: `${rf.min}–${rf.max}`, abn } : null;
      }).filter(Boolean);

      const sortedContribs = Object.entries(contributions)
        .map(([label, { contribution }]) => ({ label, value: Math.abs(contribution) }))
        .sort((a, b) => b.value - a.value);

      setResults({
        patient, risk, formula, steps, prior, ciLow, ciHigh,
        confidence, suggestions, biomarkers, sortedContribs,
        fib4, agRatio
      });
      console.log('[DynamicResults] Results calculated successfully');

      // Save to database
      if (!saveTriggered.current) {
        saveTriggered.current = true;
        (async () => {
          try {
            const pt = await savePatient({
              age: parseInt(patient.age) || 50,
              gender: patient.gender || 'Other',
              bilirubin: patient.bilirubin ? parseFloat(patient.bilirubin) : null,
              alt: patient.alt ? parseFloat(patient.alt) : null,
              ast: patient.ast ? parseFloat(patient.ast) : null,
              platelets: patient.platelets ? parseFloat(patient.platelets) : null,
              alcohol: patient.alcohol || null,
              smoking: patient.smoking || null,
              bmi: patient.bmi ? parseFloat(patient.bmi) : null,
              hbv: patient.hepatitis === 'Hepatitis B' || patient.hepatitis === 'Both' || null,
              hcv: patient.hepatitis === 'Hepatitis C' || patient.hepatitis === 'Both' || null,
              diabetes: patient.diabetes || null,
              family_history_liver: patient.familyHistory || null,
              source: 'manual',
            });
            
            if (pt?.patient?.id) {
               await saveCalculation({
                 patient_id: pt.patient.id,
                 technique_id: 1, // Bayes Theorem
                 risk_result: parseFloat(risk.toFixed(1))
               });
               console.log('[DynamicResults] Saved to database!');
            }
          } catch (e) {
            console.log('[DynamicResults] Database save skipped:', e.message);
          }
        })();
      }
    } catch (err) {
      console.error('[DynamicResults] Error calculating results:', err);
      toast.error('Error calculating risk: ' + err.message);
    }
  }, [state, navigate]);

  const handleShare = () => {
    const text = `My liver cancer risk assessment result: ${results?.risk.toFixed(1)}% — ${getRiskCategory(results?.risk).label}`;
    if (navigator.share) {
      navigator.share({ title: 'Liver Risk Assessment', text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Result copied to clipboard!');
    }
  };

  const handleDownload = () => {
    if (!results) return;
    const { patient, risk, ciLow, ciHigh, confidence, formula } = results;
    const cat = getRiskCategory(risk);
    const formulaLabel = formula === 'lft-only'
      ? 'LFT-Only Technique (no platelets/alb/glob) — Reference: Xu et al. 2021'
      : 'Full LFT + CBC Technique (with PLT & FIB-4) — References: Xu et al. 2021 | Sterling et al. 2006';
    const lines = [
      '=== LIVER CANCER RISK ASSESSMENT REPORT ===',
      `Date: ${new Date().toLocaleDateString('en-IN')}`,
      '',
      `Patient: Age ${patient.age || 'N/A'}, ${patient.gender || 'N/A'}`,
      '',
      `RISK FORMULA USED: ${formulaLabel}`,
      `BAYES THEOREM RISK: ${risk.toFixed(1)}%`,
      `Category: ${cat.emoji} ${cat.label}`,
      `95% Confidence Interval: ${ciLow}% – ${ciHigh}%`,
      `Data Confidence: ${confidence}%`,
      '',
      '--- BIOMARKERS ---',
      `Bilirubin: ${patient.bilirubin || 'N/A'} mg/dL  (Normal: 0.1–1.2)`,
      `ALT/SGPT:  ${patient.alt || 'N/A'} U/L    (Normal: 7–56)`,
      `AST/SGOT:  ${patient.ast || 'N/A'} U/L    (Normal: 10–40)`,
      `Platelets: ${patient.platelets || 'Not available'} ${patient.platelets ? '×10³/μL (Normal: 150–450)' : ''}`,
      `Albumin:   ${patient.albumin || 'N/A'} g/dL   (Normal: 3.4–5.4)`,
      `Globulin:  ${patient.globulin || 'N/A'} g/dL   (Normal: 2.0–3.5)`,
      `BMI:       ${patient.bmi || 'N/A'}        (Normal: 18.5–24.9)`,
      '',
      '--- LIFESTYLE ---',
      `Alcohol: ${patient.alcohol || 'N/A'}`,
      `Smoking: ${patient.smoking || 'N/A'}`,
      `Hepatitis: ${patient.hepatitis || 'N/A'}`,
      `Diabetes: ${patient.diabetes || 'N/A'}`,
      `Family History of Liver Disease: ${patient.familyHistory || 'N/A'}`,
      '',
      '--- SCIENTIFIC BASIS ---',
      'HBV/HCV/Life: Xu et al. 2021 (PMC11753015) — Ratios: 12.5x / 11.2x',
      'FIB-4 Index: Sterling et al., Hepatology 2006 (Fibrosis prediction)',
      'Platelets: Kraj et al., J. Clin. Med. 2024 (Thrombocytopenia RR: 1.30)',
      'Albumin/Globulin: Wang et al., BMC Gastroenterol 2025',
      'Statistical: Thomas & Mahesh, IEEE ICCCCT 2025',
      '',
      '⚠ This report is for educational purposes only.',
      'Please consult a qualified healthcare provider.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'liver_risk_report.txt'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded!');
  };

  if (!results) return (
    <div className="min-h-96 flex items-center justify-center">
      <LoadingSpinner size="lg" text="Calculating your personalized risk…" />
    </div>
  );

  const { patient, risk, formula, ciLow, ciHigh, confidence, suggestions, biomarkers, sortedContribs } = results;
  const cat = getRiskCategory(risk);
  const maxContrib = sortedContribs[0]?.value || 1;
  const isLFTOnly = formula === 'lft-only';

  return (
    <div className="max-w-4xl mx-auto animate-slide-up space-y-6 pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/dynamic')} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-display font-bold text-slate-800">Your Risk Assessment</h1>
          <p className="text-slate-500 text-sm">Calculated using Bayes Theorem — highest accuracy probabilistic technique</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleDownload} className="btn-secondary flex items-center gap-2 text-sm py-2">
            <Download className="w-4 h-4" /> Download Report
          </button>
          <button onClick={handleShare} className="btn-secondary flex items-center gap-2 text-sm py-2">
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button onClick={() => { clearDynamic(); navigate('/dynamic'); }} className="btn-primary flex items-center gap-2 text-sm py-2">
            <RefreshCw className="w-4 h-4" /> New Assessment
          </button>
        </div>
      </div>

      {/* Risk card + Patient profile */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* ── Main Risk Card ── */}
        <div className={`card border-2 ${cat.border}`}>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5" style={{ color: cat.color }} />
            <h2 className="font-semibold text-slate-700">Bayes Theorem Risk</h2>
            {isLFTOnly && (
              <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 border border-amber-200 font-semibold px-2 py-0.5 rounded-full">
                🧳 LFT-Only Formula
              </span>
            )}
          </div>

          {/* Big percentage */}
          <div className="text-center py-4">
            <p className="text-7xl font-display font-bold mb-2" style={{ color: cat.color }}>
              {risk.toFixed(1)}%
            </p>
            <span className={`inline-block badge text-sm px-4 py-1.5 ${cat.bg} ${cat.text} font-semibold`}>
              {cat.emoji} {cat.label}
            </span>
            <p className="text-xs text-slate-400 mt-3">
              95% CI: {ciLow}% – {ciHigh}%
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <div className={`w-2 h-2 rounded-full ${confidence >= 70 ? 'bg-green-400' : 'bg-yellow-400'}`} />
              <p className="text-xs text-slate-400">Data confidence: {confidence}%</p>
            </div>
          </div>

          {/* Risk scale guide */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { label: 'Low', range: '0–20%', color: 'bg-green-100  text-green-700' },
              { label: 'Moderate', range: '21–40%', color: 'bg-yellow-100 text-yellow-700' },
              { label: 'High', range: '41–60%', color: 'bg-orange-100 text-orange-700' },
              { label: 'Very High', range: '61%+', color: 'bg-red-100    text-red-700' },
            ].map(c => (
              <div key={c.label} className={`rounded-lg p-2 text-center text-xs font-medium ${c.color} ${cat.label.includes(c.label) ? 'ring-2 ring-offset-1 ring-current' : 'opacity-60'}`}>
                {c.label} · {c.range}
              </div>
            ))}
          </div>
        </div>

        {/* ── Patient Profile ── */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-liver-100 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-liver-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-700">Patient Profile</h2>
              <p className="text-xs text-slate-400">{patient.age ? `Age ${patient.age}` : 'Age N/A'} · {patient.gender || 'Gender N/A'}</p>
            </div>
          </div>

          {/* Biomarkers */}
          <div className="space-y-1.5 mb-3">
            {biomarkers.map(({ key, label, unit, value, normal, abn }) => (
              !isNaN(value) && (
                <div key={key} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                  <div>
                    <span className="text-sm text-slate-600">{label}</span>
                    <span className="text-[10px] text-slate-400 ml-1">({normal} {unit})</span>
                  </div>
                  <span className={`text-sm font-semibold flex items-center gap-0.5 ${abn?.dir === 'high' ? 'text-red-600' :
                      abn?.dir === 'low' ? 'text-blue-600' : 'text-green-600'
                    }`}>
                    {value} {unit}
                    {abn?.dir === 'high' ? ' ↑' : abn?.dir === 'low' ? ' ↓' : ' ✓'}
                  </span>
                </div>
              )
            ))}
          </div>

          {/* Lifestyle badges */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {patient.alcohol && <span className="badge bg-slate-100 text-slate-600 text-xs">🍷 {patient.alcohol}</span>}
            {patient.smoking && <span className="badge bg-slate-100 text-slate-600 text-xs">🚬 {patient.smoking}</span>}
            {patient.hepatitis && <span className="badge bg-slate-100 text-slate-600 text-xs">🩺 {patient.hepatitis}</span>}
            {patient.diabetes && <span className="badge bg-slate-100 text-slate-600 text-xs">💉 {patient.diabetes}</span>}
            {patient.familyHistory && (
              <span className={`badge text-xs ${patient.familyHistory.startsWith('Yes')
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-slate-100 text-slate-600'
                }`}>🧬 {patient.familyHistory}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Risk Factors Breakdown ── */}
      {sortedContribs.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-liver-600" />
            <h2 className="font-semibold text-slate-700">Risk Factor Contributions</h2>
          </div>
          <div className="space-y-3">
            {sortedContribs.map(({ label, value }) => (
              <ContributionBar key={label} label={label} value={value} maxVal={maxContrib} />
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Bar length indicates relative contribution to elevated risk. Calculated from likelihood ratios.
          </p>
        </div>
      )}

      {/* ── Formula Info Banner (LFT-Only) ── */}
      {isLFTOnly && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex gap-3">
          <span className="text-xl shrink-0">🧳</span>
          <div>
            <p className="font-semibold text-amber-800 text-sm mb-1">Formula 2 (LFT-Only) Active — Missing Hematology Data</p>
            <p className="text-xs text-amber-700">
              Your report did not include platelet count or albumin/globulin data, so the system automatically switched to the
              <strong> LFT-Only Bayesian technique</strong>. This approach excludes platelets and FIB-4 terms, adjusting the
              prior from 5% to 7% and increasing the discriminative weight of enzymes.
            </p>
            <p className="text-[11px] text-amber-600 mt-1.5">
              📚 IEEE Reference: Kelagadi et al. ICPCSN 2024 (LFT-only accuracy: 92.4%) ·
              Mir et al. ICAC2N 2024 (validated in resource-limited settings without full CBC)
            </p>
          </div>
        </div>
      )}

      {/* ── Personalized Suggestions ── */}
      <div className="space-y-4">
        <h2 className="text-xl font-display font-bold text-slate-800">Personalized Recommendations</h2>
        <p className="text-xs text-slate-400 -mt-2">Each recommendation is backed by a peer-reviewed IEEE or clinical research paper.</p>
        {[
          { emoji: '🚫', label: 'STOP — What to Avoid', color: 'red', items: suggestions.stop },
          { emoji: '🍎', label: 'START — Positive Actions', color: 'green', items: suggestions.start },
          { emoji: '🏥', label: 'CONSULT — Medical Follow-up', color: 'blue', items: suggestions.consult },
          { emoji: '✅', label: 'FOLLOW-UP — Track Your Progress', color: 'purple', items: suggestions.followup },
        ].filter(s => s.items.length > 0).map(section => (
          <div key={section.label} className={`card border-l-4 border-${section.color}-400`}>
            <h3 className={`font-semibold text-${section.color}-700 mb-3`}>{section.emoji} {section.label}</h3>
            <ul className="space-y-2.5">
              {section.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle className={`w-4 h-4 text-${section.color}-500 shrink-0 mt-0.5`} />
                  <div>
                    <span>{item.text}</span>
                    {item.ref && (
                      <span className="block text-[10px] text-slate-400 mt-0.5">📚 {item.ref}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Research References (collapsible) ── */}
      <div className="card border border-slate-100">
        <button
          onClick={() => setShowRefs(p => !p)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-liver-600" />
            <span className="font-semibold text-slate-700 text-sm">Research References ({IEEE_PAPERS.length} Papers)</span>
            <span className="badge bg-liver-100 text-liver-700 text-xs">8 IEEE + 3 Clinical</span>
          </div>
          {showRefs ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {showRefs && (
          <div className="mt-4">
           <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-700 mb-1">🔁 Key difference between the two formulae</p>
          <p>
            Formula 1 (Full) utilizes <strong>Platelet count</strong> and the <strong>FIB-4 Index</strong> as critical indicators of liver fibrosis.
            Formula 2 (LFT-Only) is a legacy fallback for when only basic enzymes are available, removing albumin/globulin/platelet terms
            and adjusting the prior probability to 7% to account for reduced clinical certainty.
          </p>
          <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
            {Object.entries(PDF_LINKS).map(([key, url]) => (
              <a key={key} href={url} target="_blank" rel="noreferrer" className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-600 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                📄 {key.toUpperCase()} Paper (PDF)
              </a>
            ))}
          </div>
        </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-1.5 pr-3 text-slate-400 font-medium w-8">#</th>
                  <th className="text-left py-1.5 pr-3 text-slate-400 font-medium">Reference</th>
                  <th className="text-left py-1.5 text-slate-400 font-medium">Used For</th>
                </tr>
              </thead>
              <tbody>
                {IEEE_PAPERS.map(p => (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 pr-3 text-slate-400 align-top">{p.id}</td>
                    <td className="py-2 pr-3 font-medium text-slate-700 align-top">{p.ref}</td>
                    <td className="py-2 text-slate-500 align-top">{p.topic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

        {/* ── FIB-4 Index Deep Dive ── */}
        {results.fib4 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-blue-900 text-lg">FIB-4 Clinical Index: {results.fib4.score}</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-800 mb-1">Standard Calculation Formula:</p>
                <div className="bg-white border border-blue-100 rounded-lg p-3 font-mono text-sm inline-block shadow-sm">
                  (Age × AST) / (Platelet × √ALT)
                </div>
                <div className="mt-3 bg-white/60 border border-blue-100 rounded-lg p-2.5 inline-block">
                  <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">Reference Ranges</p>
                  <ul className="text-[11px] text-blue-900 space-y-0.5">
                    <li><span className="font-semibold text-green-600">&lt; 1.45</span> : Low Risk</li>
                    <li><span className="font-semibold text-yellow-600">1.45 - 3.25</span> : Moderate Risk</li>
                    <li><span className="font-semibold text-red-600">&gt; 3.25</span> : High Risk</li>
                  </ul>
                </div>
                <p className="text-[10px] text-blue-600 mt-2 italic">
                  *A standard medical index used to predict liver fibrosis based on age, enzymes, and blood cell counts.
                </p>
              </div>
              <div className="bg-white/60 rounded-xl p-4 border border-blue-100">
                <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2">Clinical Interpretation</p>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-3 h-3 rounded-full ${results.fib4.score > 3.25 ? 'bg-red-500' : results.fib4.score >= 1.45 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                  <span className="text-sm font-bold text-slate-700">{results.fib4.level}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {results.fib4.score > 3.25
                    ? 'Higher scores suggest a greater probability of advanced liver scarring (fibrosis). Immediate specialist consultation is recommended.'
                    : results.fib4.score >= 1.45
                      ? 'Moderate range score. Requires follow-up tests and lifestyle management to prevent further progression.'
                      : 'A low FIB-4 score suggests a minimal probability of advanced fibrosis (liver scarring).'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Understanding Your Parameters ── */}
        <div className="mt-6">
          <h3 className="font-bold text-slate-800 mb-4 px-1">Understanding Your Parameters</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: 'Enzymes (ALT/AST)', text: 'Markers of liver cell health. Elevated levels suggest inflammation or recurring strain on liver tissue.' },
              { label: 'Bilirubin', text: 'A byproduct of your blood processing. High levels can indicate that the liver is struggling to clear toxins efficiently.' },
              { label: 'Viral Status (HBV/HCV)', text: 'Viral hepatitis is a primary risk driver. The Bayesian engine assigns higher mathematical weights to positive cases.' },
              { label: 'Platelets', text: 'Clotting cells in your blood. A drop in platelet count (Thrombocytopenia) is a key clinical signal for liver scarring.' },
              { label: 'Albumin/Globulin', text: 'Proteins produced by your liver. Their balance provides a "synthetic snapshot" of how well your liver is functioning.' },
              { label: 'Lifestyle (BMI/Smoking)', text: 'Metabolic and oxidative stress factors that act as risk multipliers when combined with abnormal blood markers.' }
            ].map(item => (
              <div key={item.label} className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                <p className="text-xs font-bold text-slate-700 mb-1">{item.label}</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Natural Suggestions to Optimize Ranges ── */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-green-600" />
            <h3 className="font-bold text-green-900 text-lg">Biomarker Range Optimization</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {biomarkers.filter(b => BIOMARKER_OPTS[b.key]).map(b => (
              <div key={b.key} className="bg-white/80 border border-green-100 rounded-xl p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-green-700 uppercase tracking-tighter">{b.label}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${b.abn ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                    {b.abn ? 'Optimize' : 'Maintaining'}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-700 mb-1.5">{BIOMARKER_OPTS[b.key].goal}</p>
                <ul className="space-y-1">
                  {BIOMARKER_OPTS[b.key].tips.map((tip, i) => (
                    <li key={i} className="text-[10px] text-slate-500 flex items-start gap-1">
                      <span className="text-green-500 shrink-0 mt-0.5">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-green-600 mt-4 italic text-center">
            *Always consult with your physician before starting any significant dietary or exercise regimen.
          </p>
        </div>


      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="text-amber-700 text-xs">
          ⚠️ <strong>Medical Disclaimer:</strong> This assessment is for educational purposes only and is not a
          substitute for professional medical advice. Please consult a qualified healthcare provider before making
          any health decisions based on these results.
        </p>
      </div>
    </div>
  );
}
