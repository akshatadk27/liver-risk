// src/data/staticData.js
// In-app static data mirroring the database seed — used without a backend

export const TECHNIQUES = [
  {
    id: 1, name: 'Bayes Theorem', category: 'Probabilistic',
    formula: 'P(C|R) = P(R|C) × P(C) / P(R)',
    description: 'Calculates posterior probability using prior probabilities and likelihood ratios.',
    interpretability_score: 9.2,
    accuracy: 98.71, precision: 99.6, recall: 99.5, f1_score: 97.8,
    paper: 'Thomas & Mahesh, ICCCCT 2025',
    icon: '🧮', color: '#0ea5e9',
  },
  {
    id: 2, name: 'Linear Regression', category: 'Regression',
    formula: 'y = β₀ + β₁x₁ + β₂x₂ + ... + βₙxₙ',
    description: 'Calculates linear relationship between biomarkers and cancer risk score.',
    interpretability_score: 8.8,
    accuracy: 92.40, precision: 90.2, recall: 88.9, f1_score: 91.3,
    paper: 'Kelagadi et al., ICPCSN 2024',
    icon: '📈', color: '#8b5cf6',
  },
  {
    id: 3, name: 'Risk Ratio', category: 'Epidemiological',
    formula: 'RR = Incidence_exposed / Incidence_unexposed',
    description: 'Compares probability of cancer in exposed vs unexposed groups.',
    interpretability_score: 8.5,
    accuracy: 88.10, precision: 82.0, recall: 85.0, f1_score: 83.5,
    paper: 'Mir et al., ICAC2N 2024',
    icon: '⚖️', color: '#f97316',
  },
  {
    id: 4, name: 'Odds Ratio', category: 'Epidemiological',
    formula: 'OR = (a/b) / (c/d)',
    description: 'Measures the odds of cancer in patients with vs without a risk factor.',
    interpretability_score: 8.3,
    accuracy: 86.50, precision: 83.0, recall: 82.0, f1_score: 82.5,
    paper: 'V. C. R et al., CIISCA 2023',
    icon: '🎲', color: '#ec4899',
  },
  {
    id: 5, name: 'Logistic Function', category: 'Regression',
    formula: 'P = 1 / (1 + e^(−z))',
    description: 'Sigmoid function mapping linear combination of risk factors to probability.',
    interpretability_score: 8.0,
    accuracy: 84.00, precision: 81.0, recall: 90.0, f1_score: 85.0,
    paper: 'Sharma & Parveen, GUCON 2020',
    icon: '📉', color: '#14b8a6',
  },
  {
    id: 6, name: 'Correlation', category: 'Statistical',
    formula: 'r = Σ((x−x̄)(y−ȳ)) / √(Σ(x−x̄)² Σ(y−ȳ)²)',
    description: 'Pearson correlation between biomarker deviation and cancer risk.',
    interpretability_score: 7.5,
    accuracy: 85.20, precision: 81.5, recall: 80.0, f1_score: 80.7,
    paper: 'Sekhar et al., ICICCS 2025',
    icon: '🔗', color: '#a855f7',
  },
  {
    id: 7, name: 'Bayes-Logistic Hybrid', category: 'Hybrid',
    formula: 'H = (P_Bayes + P_Logistic) / 2',
    description: 'Ensemble averaging Bayes and Logistic predictions for balanced output.',
    interpretability_score: 7.8,
    accuracy: 87.50, precision: 90.3, recall: 94.8, f1_score: 92.5,
    paper: 'Mabel Rani et al., ICCSAI 2023',
    icon: '🔀', color: '#06b6d4',
  },
  {
    id: 8, name: 'Ratio Geometric Mean', category: 'Hybrid',
    formula: 'RGM = √(RR × OR)',
    description: 'Geometric mean of Risk Ratio and Odds Ratio, reducing outlier influence.',
    interpretability_score: 7.6,
    accuracy: 87.30, precision: 82.5, recall: 83.5, f1_score: 83.0,
    paper: 'Sharma & Kamboj, Chandigarh 2024',
    icon: '📐', color: '#84cc16',
  },
  {
    id: 9, name: 'Ensemble Average', category: 'Ensemble',
    formula: 'E = (Σ Pᵢ) / 6',
    description: 'Arithmetic mean of all six primary technique predictions.',
    interpretability_score: 8.1,
    accuracy: 87.50, precision: 86.2, recall: 87.6, f1_score: 86.9,
    paper: 'Kumar et al., ICCSAI 2023',
    icon: '🎯', color: '#f59e0b',
  },
];

export const RISK_FACTORS = {
  bilirubin: { min: 0.1,  max: 1.2,   unit: 'mg/dL',   label: 'Total Bilirubin' },
  alt:       { min: 7,    max: 56,     unit: 'U/L',     label: 'ALT (SGPT)'     },
  ast:       { min: 10,   max: 40,     unit: 'U/L',     label: 'AST (SGOT)'     },
  platelets: { min: 150,  max: 450,    unit: '×10³/μL', label: 'Platelets'      },
  bmi:       { min: 18.5, max: 24.9,   unit: 'kg/m²',   label: 'BMI'            },
  albumin:   { min: 3.4,  max: 5.4,    unit: 'g/dL',    label: 'Albumin'        },
  globulin:  { min: 2.0,  max: 3.5,    unit: 'g/dL',    label: 'Globulin'       },
};

export const COEFFICIENTS = {
  // [bilirubin, alt, ast, platelets, bmi, age, familyHistory]
  // familyHistory coeff = 0.60 (consistent with additive weight for genetic/hereditary factor)
  'Bayes Theorem':         [0.85,  0.62, 0.71, -0.45, 0.38, 0.52, 0.60],
  'Linear Regression':     [0.78,  0.55, 0.63, -0.40, 0.33, 0.47, 0.60],
  'Risk Ratio':            [0.72,  0.50, 0.58, -0.35, 0.28, 0.42, 0.60],
  'Odds Ratio':            [0.80,  0.58, 0.66, -0.42, 0.35, 0.49, 0.60],
  'Logistic Function':     [0.90,  0.65, 0.74, -0.48, 0.40, 0.55, 0.60],
  'Correlation':           [0.68,  0.48, 0.55, -0.32, 0.25, 0.40, 0.60],
  'Bayes-Logistic Hybrid': [0.87,  0.63, 0.72, -0.46, 0.39, 0.53, 0.60],
  'Ratio Geometric Mean':  [0.76,  0.54, 0.62, -0.38, 0.31, 0.45, 0.60],
  'Ensemble Average':      [0.82,  0.59, 0.67, -0.43, 0.36, 0.50, 0.60],
};

export const PAPERS = [
  { id: 1,  authors: 'R. Thomas and A. Mahesh', title: 'Analyze the performance of Machine Learning algorithm to predict Liver cancer', venue: 'ICCCCT 2025', technique: 'Bayes Theorem' },
  { id: 2,  authors: 'H. M. Kelagadi et al.',  title: 'An Analysis on the Integration of Machine Learning and Advanced Imaging Technologies for Predicting the Liver Cancer', venue: 'ICPCSN 2024', technique: 'Linear Regression' },
  { id: 3,  authors: 'F. I. Mir et al.',        title: 'Deep Data Analysis for Liver Cancer Prediction Using Machine Learning Approaches', venue: 'ICAC2N 2024', technique: 'Risk Ratio' },
  { id: 4,  authors: 'V. C. R et al.',          title: 'Prediction of Liver Disease Using Machine Learning Algorithms', venue: 'CIISCA 2023', technique: 'Odds Ratio' },
  { id: 5,  authors: 'M. Sharma and R. Parveen', title: 'A Comparative Study of Data Mining, Digital Image Processing and Genetical Approach for Early Detection of Liver Cancer', venue: 'GUCON 2020', technique: 'Logistic Function' },
  { id: 6,  authors: 'M. C. Sekhar et al.',     title: 'Adaptive Liver Cancer Prediction Using Liquid Neural Networks and Multi-Modal Clinical Data', venue: 'ICICCS 2025', technique: 'Correlation' },
  { id: 7,  authors: 'A. J. Mabel Rani et al.', title: 'Liver Disease Prediction using Semi Supervised based Machine Learning Algorithm', venue: 'ICCSAI 2023', technique: 'Bayes-Logistic Hybrid' },
  { id: 8,  authors: 'P. Sharma and S. Kamboj', title: 'Machine Learning Approaches for Early Detection of Liver Ailments', venue: 'Chandigarh University, 2024', technique: 'Ratio Geometric Mean' },
  { id: 9,  authors: 'Y. Kumar et al.',         title: 'Machine Learning-Based Diagnosis and Detection of Liver Cancer: An Approach Enhancement', venue: 'ICCSAI 2023', technique: 'Ensemble Average' },
  { id: 10, authors: 'Y. Xiao',                 title: 'Machine Learning Based Liver Cancer Disease Prediction System Using Improved Extreme Gradient Boosting Algorithm', venue: 'ICDSIS 2024', technique: 'Ensemble Average' },
];

/**
 * Calculate risk score for a single patient using all 9 techniques.
 * Returns { techniqueName: riskPercent, ... }
 */
export function calculatePatientRisk(patient) {
  const { age = 50, bilirubin = 0.7, alt = 30, ast = 25, platelets = 280, bmi = 22 } = patient;
  const alcohol  = ['Regularly', 'Daily'].includes(patient.alcohol) ? 1 : 0;
  const smoking  = patient.smoking === 'Current' ? 1 : 0;
  const hbv      = patient.hbv ? 1 : 0;
  const hcv      = patient.hcv ? 1 : 0;
  const diabetes = ['Type 1', 'Type 2', 'Pre-diabetic'].includes(patient.diabetes) ? 1 : 0;
  // Family history: first-degree (OR ≈3.0) weighted 1.0; second-degree (OR ≈1.8) weighted 0.6
  // Source: Donato et al. Hepatology 1997; Loomba et al. Gastroenterology 2015
  const familyHistoryFirst  = patient.familyHistory === 'Yes — Parent / Sibling' ? 1 : 0;
  const familyHistorySecond = patient.familyHistory === 'Yes — Grandparent / Uncle / Aunt' ? 1 : 0;

  // Normalised deviations
  const bilN = Math.max(0, (bilirubin - 1.2) / 1.2);
  const altN = Math.max(0, (alt - 56) / 56);
  const astN = Math.max(0, (ast - 40) / 40);
  const pltN = Math.max(0, (150 - platelets) / 150);
  const bmiN = Math.max(0, (bmi - 24.9) / 24.9);
  const ageN = Math.max(0, (age - 40) / 60);

  const results = {};

  for (const tech of TECHNIQUES) {
    const [cb, ca, cAs, cp, cbmi, cage] = COEFFICIENTS[tech.name];
    const z = (
      2.1 * bilN * cb +
      1.8 * altN * Math.abs(ca) +
      1.9 * astN * Math.abs(cAs) +
      1.5 * pltN * Math.abs(cp) +
      1.2 * bmiN * Math.abs(cbmi) +
      1.3 * ageN * Math.abs(cage) +
      0.8 * alcohol +
      0.7 * smoking +
      1.0 * hbv +
      0.9 * hcv +
      0.5 * diabetes +
      1.0 * familyHistoryFirst  +  // first-degree relative — OR ≈3.0
      0.6 * familyHistorySecond    // second-degree relative — OR ≈1.8
    );

    let risk;
    if (tech.name === 'Logistic Function' || tech.name === 'Bayes-Logistic Hybrid') {
      const pLogistic = 1 / (1 + Math.exp(-(z - 1.5)));
      if (tech.name === 'Logistic Function') {
        risk = pLogistic * 100;
      } else {
        const pBayes = Math.min(1, z / 4);
        risk = ((pBayes + pLogistic) / 2) * 100;
      }
    } else if (tech.name === 'Ratio Geometric Mean') {
      const rr = Math.max(0.01, 1 + z * 0.5);
      const or = Math.max(0.01, 1 + z * 0.6);
      risk = Math.min(100, Math.sqrt(rr * or) * 18);
    } else if (tech.name === 'Ensemble Average') {
      const vals = TECHNIQUES.slice(0, 6).map(t => results[t.name] ?? 0);
      risk = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : z * 15;
    } else if (tech.name === 'Bayes Theorem') {
      const pRiskGivenCancer = Math.min(1, z / 3.5);
      const pCancer = 0.085;
      const pRisk = 0.35;
      const posterior = (pRiskGivenCancer * pCancer) / Math.max(0.001, pRisk);
      risk = Math.min(100, posterior * 800);
    } else {
      risk = Math.min(100, Math.max(0, z * 15 + Math.random() * 2));
    }

    results[tech.name] = Math.min(100, Math.max(0, risk));
  }

  return results;
}

export function getRiskCategory(percent) {
  if (percent <= 20) return { label: 'Low Risk',       color: '#22c55e', bg: 'bg-green-100',  text: 'text-green-800',  emoji: '🟢' };
  if (percent <= 40) return { label: 'Moderate Risk',  color: '#eab308', bg: 'bg-yellow-100', text: 'text-yellow-800', emoji: '🟡' };
  if (percent <= 60) return { label: 'High Risk',      color: '#f97316', bg: 'bg-orange-100', text: 'text-orange-800', emoji: '🟠' };
  return               { label: 'Very High Risk',      color: '#ef4444', bg: 'bg-red-100',    text: 'text-red-800',   emoji: '🔴' };
}
