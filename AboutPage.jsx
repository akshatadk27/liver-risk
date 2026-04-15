// src/pages/AboutPage.jsx
import { useState } from 'react';
import { BookOpen, FlaskConical, ChevronDown, Shield, HelpCircle, Users, ExternalLink, FileText } from 'lucide-react';
import { TECHNIQUES, RISK_FACTORS } from '../data/staticData';

// ─── PDF imports ────────────────────────────────────────────────────────────
// Place all 10 PDFs in your project's /public/papers/ folder, then Vite/CRA
// will serve them at /papers/<filename>.pdf at runtime.
// If you use Vite you can also do:
//   import pdf1 from '../assets/papers/paper1.pdf?url'
// and use that variable as the href below.
// ─────────────────────────────────────────────────────────────────────────────

const PAPERS = [
  {
    id: 1,
    title: 'A Comparative Study of Data Mining, Digital Image Processing and Genetical Approach for Early Detection of Liver Cancer',
    authors: 'Meenu Sharma, Rafat Parveen',
    venue: 'IEEE GUCON 2020 — Galgotias University, Greater Noida, India',
    technique: 'Genetic / Microarray Statistical Methods',
    doi: '978-1-7281-5070-3/20/$31.00 ©2020 IEEE',
    // Path relative to your /public folder  ↓
    pdfPath: '/papers/A_Comparative_Study_of_Data_Mining_Digital_Image_Processing_and_Genetical_Approach_for_Early_Detection_of_Liver_Cancer.pdf',
    ieeUrl: 'https://ieeexplore.ieee.org/document/9315888',
    abstract: 'Compares genetic (microarray), data mining, and digital image processing approaches for early liver cancer detection. Evaluates parametric statistical tests including T-statistics, ANOVA-1, Bayesian methods, and Rank Product on simulated microarray datasets.',
  },
  {
    id: 2,
    title: 'Analyze the Performance of Machine Learning Algorithm to Predict Liver Cancer',
    authors: 'Reji Thomas, Mahesh A.',
    venue: 'IEEE ICCCT 2025 — Sri Sairam College of Engineering, Bangalore',
    technique: 'Bayes Theorem, Decision Tree, Linear Regression',
    doi: '979-8-3315-3757-9/25/$31.00 ©2025 IEEE | DOI: 10.1109/ICCCT63501.2025.11019075',
    pdfPath: '/papers/Analyze_the_Performance_of_Machine_Learning_Algorithm_to_Predict_Liver_Cancer.pdf',
    ieeUrl: 'https://ieeexplore.ieee.org/document/11019075',
    abstract: 'Investigates Bayes theorem, Decision Trees, and Linear Regression for liver cancer prediction using the Kaggle Indian Liver Patient dataset. Bayes theorem achieves the best accuracy of 98.71% with precision 99.6%, recall 99.5%, and F1-score 97.8%.',
  },
  {
    id: 3,
    title: 'Machine Learning Approaches for Early Detection of Liver Ailments: Comprehensive Analysis and Comparative Study',
    authors: 'Pihunika Sharma, Ms. Shivani Kamboj',
    venue: 'IEEE ICCCNT 2024 — IIT Mandi, Kamand, India',
    technique: 'Ensemble Learning, Stacking Classifier, XGBoost',
    doi: '979-8-3503-7024-9/24/$31.00 ©2024 IEEE | DOI: 10.1109/ICCCNT61001.2024.10724600',
    pdfPath: '/papers/Machine_Learning_Approaches_for_Early_Detection_of_Liver_Ailments_Comprehensive_Analysis_and_Comparative_Study.pdf',
    ieeUrl: 'https://ieeexplore.ieee.org/document/10724600',
    abstract: 'Evaluates five ML algorithms on Indian liver patient records. Stacking Classifier achieves the maximum accuracy of 84% with precision 81%, recall 90%, and F1-score 85%. Hybrid methods outperform individual classifiers.',
  },
  {
    id: 4,
    title: 'Primary Liver Cancer Early Screening Based on Gradient Boosting Decision Tree and Support Vector Machine',
    authors: 'CAO Guogang, LI Mengxue, CAO Cong, WANG Ziyi, FANG Meng, GAO Chunfang',
    venue: 'IEEE ICIIBMS 2019 — Shanghai, China',
    technique: 'GBDT Feature Selection + SVM Classification',
    doi: '978-1-7281-3380-5/19/$31.00 ©2019 IEEE',
    pdfPath: '/papers/Primary_Liver_Cancer_Early_Screening_.pdf',
    ieeUrl: 'https://ieeexplore.ieee.org/document/9000887',
    abstract: 'Proposes a two-stage method: GBDT for feature selection (reducing 30 features to 4–7) followed by SVM and GBDT classifiers. Achieves Kappa index at almost perfect level and accuracy over 90% on clinical laboratory data from 1,047 patients.',
  },
  {
    id: 5,
    title: 'Prediction of Chronic Liver Disease Patients Using Integrated Projection-Based Statistical Feature Extraction with Machine Learning Algorithms',
    authors: 'Ruhul Amin, Rubia Yasmin, Sabba Ruhi, Md Habibur Rahman, Md Shamim Reza',
    venue: 'Informatics in Medicine Unlocked 36 (2023) — Elsevier',
    technique: 'PCA + Factor Analysis + LDA + Random Forest / SVM',
    doi: '10.1016/j.imu.2022.101155',
    pdfPath: '/papers/1-s2.0-S2352914822002921-main.pdf',
    ieeUrl: 'https://doi.org/10.1016/j.imu.2022.101155',
    abstract: 'Proposes an integrated feature extraction method combining PCA, Factor Analysis, and LDA on the Indian Liver Patient Dataset (583 records). Random Forest achieves 88.10% accuracy and 88.20% AUC — 0.10–18.5% better than prior work.',
  },
  {
    id: 6,
    title: 'Global Burden of Primary Liver Cancer by Five Etiologies and Global Prediction by 2035 Based on Global Burden of Disease Study 2019',
    authors: 'Yuan Liu, Jinxin Zheng, Jialing Hao, et al.',
    venue: 'Cancer Medicine, Vol. 11, pp. 1310–1323 — John Wiley & Sons Ltd, 2022',
    technique: 'Age-Period-Cohort Method / EAPC / ASR Epidemiology',
    doi: '10.1002/cam4.4551',
    pdfPath: '/papers/CAM4-11-1310.pdf',
    ieeUrl: 'https://doi.org/10.1002/cam4.4551',
    abstract: 'Analyzes five etiologies of primary liver cancer (HBV 41%, HCV 28.5%, Alcohol 18.4%, NASH 6.8%, Others 5.3%) across 204 countries from 1990–2019. Projects incidence to 2035 using age-period-cohort methods; NASH-related cancer in males continues rising until 2025.',
  },
  {
    id: 7,
    title: 'Lifestyle of Patients with Alcoholic Liver Disease and Factors Leading to Hospital Readmission: A Prospective Observational Study',
    authors: 'Sung-Mi Park, Nao Saito, Soo Ryang Kim, Ikuko Miyawaki',
    venue: 'Kobe Journal of Medical Sciences, Vol. 65, No. 3, pp. E80–E89, 2019',
    technique: 'Conceptual Cluster Matrix / Prospective Observational Study',
    doi: 'PMID: 32029693',
    pdfPath: '/papers/kobej-65-e80.pdf',
    ieeUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7093741/',
    abstract: 'Prospective study of 21 ALD patients over 3 months post-discharge. Identifies irregular eating habits (p=0.006) and experience of loss (p=0.017) as primary predictors of hospital readmission. Regular eating habits were more predictive than alcohol abstinence.',
  },
  {
    id: 8,
    title: 'Machine Learning-Based Diagnosis and Detection of Liver Cancer: An Approach Enhancement',
    authors: 'Yogesh Kumar, Parneet Kaur, Jyoti Rani',
    venue: 'IEEE ICCSAI 2023 — Pandit Deendayal Energy University, Gandhinagar',
    technique: 'SVM, Random Forest, LGB Classifier, KNN, CatBoost',
    doi: '979-8-3503-6996-0/23/$31.00 ©2023 IEEE | DOI: 10.1109/ICCSAI59793.2023.10420883',
    pdfPath: '/papers/Machine_Learning-Based_Diagnosis_and_Detection_of_Liver_Cancer_An_Approach_Enhancement.pdf',
    ieeUrl: 'https://ieeexplore.ieee.org/document/10420883',
    abstract: 'Compares seven ML techniques on a 20,000-record Kaggle liver dataset. SVM and LGB Classifier achieve 100% accuracy with zero loss. Random Forest achieves perfect precision, recall, and F1-score (all 1.00). KNN reaches 91% accuracy.',
  },
  {
    id: 9,
    title: 'Deep Data Analysis for Liver Cancer Prediction Using Machine Learning Approaches',
    authors: 'Faraz Imtiyaz Mir, Gaurav Raj, Kusum Lata, Abhishek S. Verma',
    venue: 'IEEE ICAC2N 2024 — Sharda School of Engineering and Technology, Greater Noida',
    technique: 'HFCNN, Decision Tree, KNN, Random Forest, Logistic Regression',
    doi: '979-8-3503-5681-6/24/$31.00 ©2024 IEEE | DOI: 10.1109/ICAC2N63387.2024.10895272',
    pdfPath: '/papers/Deep_Data_Analysis_for_Liver_Cancer_Prediction_Using_Machine_Learning_Approaches.pdf',
    ieeUrl: 'https://ieeexplore.ieee.org/document/10895272',
    abstract: 'Reviews hybrid FCNNs for liver tumor segmentation from CT images achieving ~74.36% accuracy. Evaluates KNN (F1 0.85, accuracy 74%), Random Forest (F1 0.82, accuracy 72%), and Logistic Regression (accuracy 76%) on the Indian Liver Patient Dataset.',
  },
  {
    id: 10,
    title: 'A Statistical Method for Prediction of Liver Disease based on the Brownian Motion Model',
    authors: 'Samya Muhuri, Ananya Sarkar, Sambhabi Chakraborty, Susanta Chakraborty',
    venue: 'IEEE TENSYMP 2019 — IIEST Shibpur, Howrah, India',
    technique: 'Brownian Motion Model / Spearman Correlation / Statistical Prediction',
    doi: '978-1-7281-0297-9 ©2019 IEEE',
    pdfPath: '/papers/Statistical_Method_for_Prediction_of_Liver_Disease_based_on_the_Brownian_Motion_Model.pdf',
    ieeUrl: 'https://ieeexplore.ieee.org/document/9158430',
    abstract: 'Proposes a novel Brownian motion-based statistical prediction model for liver disease using the Indian Liver Patient Dataset (583 records). Achieves 94.09% accuracy, 93.58% sensitivity, and 83.78% specificity on Indian patients, outperforming LOWESS and ARIMA. Uses Spearman\'s correlation to identify key blood parameter interactions.',
  },
  {
    id: 11,
    title: 'Impact of Thrombocytopenia on Survival in Patients with Hepatocellular Carcinoma: Updated Meta-Analysis and Systematic Review',
    authors: 'Leszek Kraj, Paulina Chmiel, Maciej Gryziak, Laretta Grabowska-Derlatka, Łukasz Szymański, Ewa Wysokińska',
    venue: 'Cancers 2024, Vol. 16, 1293 — MDPI',
    technique: 'Meta-Analysis / Hazard Ratio / Systematic Review (PRISMA)',
    doi: '10.3390/cancers16071293',
    pdfPath: '/papers/cancers-16-01293.pdf',
    ieeUrl: 'https://doi.org/10.3390/cancers16071293',
    abstract: 'Systematic review and meta-analysis of 26 studies (9,403 HCC patients) examining platelet count as a prognostic marker. Thrombocytopenia (PLT <100×10³/mm³) associated with 30% higher overall mortality risk (HR=1.30, 95% CI 1.05–1.63). Curative-intent patients with low PLT face 62% higher risk (HR=1.62). PLT count recommended as a prognostic marker in HCC evaluation.',
  },
  {
    id: 12,
    title: 'Risk Factors for Hepatocellular Carcinoma: An Umbrella Review of Systematic Review and Meta-Analysis',
    authors: 'Jie Wang, Kaijie Qiu, Songsheng Zhou, Yichao Gan, Keting Jiang, Donghuan Wang, Haibiao Wang',
    venue: 'Annals of Medicine 2025, Vol. 57, No. 1, 2455539 — Taylor & Francis',
    technique: 'Umbrella Review / AMSTAR / Evidence Classification (Class I–IV)',
    doi: '10.1080/07853890.2025.2455539',
    pdfPath: '/papers/IANN_57_2455539.pdf',
    ieeUrl: 'https://doi.org/10.1080/07853890.2025.2455539',
    abstract: 'Comprehensive umbrella review of 175 meta-analyses identifying 101 HCC risk factors. HBV and HCV raise HCC risk 12.5-fold and 11.2-fold respectively. Low platelet count (Class II evidence, OR 4.61) and elevated liver enzymes (OR 2.92) are significant non-viral risk factors. Aspirin, statins, metformin, and GLP-1 RAs reduce HCC risk. Smoking (Class I) and obesity (Class II) are major modifiable lifestyle risks.',
  },
];

function AccordionItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-medium text-slate-700">{question}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 text-sm text-slate-500 leading-relaxed">{answer}</div>}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto animate-slide-up space-y-12">

      {/* Overview */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-medical-100 rounded-xl flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-medical-600" />
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-800">About the Platform</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {[
            { icon: '🎯', title: 'Early Detection', desc: 'Liver cancer survival rates improve dramatically with early-stage diagnosis. This platform provides statistical risk screening.' },
            { icon: '📊', title: 'Two Modules', desc: 'Static module for population-level dataset analysis; Dynamic module for individual personalized assessments from lab reports.' },
            { icon: '🔬', title: 'Statistical AI', desc: 'Unlike black-box ML, our 9 statistical techniques are fully interpretable, directly derived from epidemiological research.' },
          ].map(c => (
            <div key={c.title} className="card text-center">
              <div className="text-3xl mb-3">{c.icon}</div>
              <h3 className="font-semibold text-slate-700 mb-2">{c.title}</h3>
              <p className="text-slate-500 text-sm">{c.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-medical-50 border border-medical-100 rounded-2xl p-6">
          <h2 className="font-semibold text-medical-800 mb-2">What is Liver Cancer?</h2>
          <p className="text-medical-700 text-sm leading-relaxed">
            Hepatocellular carcinoma (HCC) is the most common form of primary liver cancer, accounting for
            approximately 75–85% of all cases. Risk factors include chronic hepatitis B/C infection, alcohol
            consumption, non-alcoholic fatty liver disease (NAFLD), diabetes, and cirrhosis. The 5-year
            survival rate is over 70% when detected at an early stage, dropping to under 5% at advanced stages —
            making accurate risk screening critically important.
          </p>
        </div>
      </section>

      {/* Methodology */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <FlaskConical className="w-6 h-6 text-liver-600" />
          <h2 className="text-2xl font-display font-bold text-slate-800">9 Statistical Techniques</h2>
        </div>
        <div className="space-y-4">
          {TECHNIQUES.map(t => (
            <div key={t.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <span className="text-2xl mt-1">{t.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-slate-800">{t.name}</h3>
                    <span className="badge bg-medical-100 text-medical-700 text-xs">{t.category}</span>
                    <span className="badge bg-green-100 text-green-700 text-xs">{t.accuracy}% accuracy</span>
                    <span className="badge bg-purple-100 text-purple-700 text-xs">Interpretability {t.interpretability_score}/10</span>
                  </div>
                  <code className="text-sm bg-slate-800 text-green-400 rounded-lg px-3 py-1.5 block mb-2 font-mono">
                    {t.formula}
                  </code>
                  <p className="text-slate-500 text-sm">{t.description}</p>
                  <p className="text-xs text-slate-400 mt-1">Source: {t.paper}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-6">
          <h3 className="font-semibold text-slate-700 mb-2">Why Statistical Methods Instead of ML?</h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            Machine learning methods are often "black boxes" — their decisions are difficult to interpret
            clinically. Statistical methods like Bayes Theorem and Logistic Regression provide explicit,
            auditable formulas with known coefficients, enabling clinicians to understand and validate
            each risk contribution. All 9 techniques here are traceable to the exact IEEE research papers
            that validated them.
          </p>
        </div>
      </section>

      {/* Risk Factors Reference */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6 text-medical-600" />
          <h2 className="text-2xl font-display font-bold text-slate-800">Risk Factor Reference</h2>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm text-left min-w-max">
            <thead>
              <tr className="border-b border-slate-100">
                {['Biomarker', 'Normal Range', 'Unit', 'Clinical Significance'].map(h => (
                  <th key={h} className="py-3 px-4 font-semibold text-slate-500 text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'bilirubin', sig: 'Elevated levels indicate impaired liver excretion, possible bile duct obstruction' },
                { key: 'alt', sig: 'Primary liver enzyme; elevated in hepatitis, fatty liver, and liver cell damage' },
                { key: 'ast', sig: 'Liver and heart enzyme; ratio with ALT (De Ritis ratio) useful in diagnosis' },
                { key: 'platelets', sig: 'Low counts (thrombocytopenia) indicate liver cirrhosis or portal hypertension' },
                { key: 'bmi', sig: 'Obesity (BMI>30) strongly associated with NAFLD and increased HCC risk' },
              ].map(row => {
                const rf = RISK_FACTORS[row.key];
                return (
                  <tr key={row.key} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-700 capitalize">{rf.label}</td>
                    <td className="py-3 px-4 text-medical-600 font-semibold">{rf.min}–{rf.max}</td>
                    <td className="py-3 px-4 text-slate-500">{rf.unit}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs">{row.sig}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Research Papers */}
      <section>
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-6 h-6 text-liver-600" />
          <h2 className="text-2xl font-display font-bold text-slate-800">12 Research Papers</h2>
        </div>
        <p className="text-slate-500 text-sm mb-6">
          Each card summarises a key paper. Click <strong>Open PDF</strong> to open the full paper directly, or the{' '}
          <ExternalLink className="w-3 h-3 inline" /> icon to visit the publisher's page.
        </p>

        <div className="space-y-4">
          {PAPERS.map(p => (
            <div key={p.id} className="card flex gap-4 hover:shadow-md transition-shadow group">
              {/* Number badge */}
              <div className="w-8 h-8 bg-medical-100 rounded-lg flex items-center justify-center text-medical-700 font-bold text-sm shrink-0 mt-0.5">
                {p.id}
              </div>

              <div className="flex-1 min-w-0">
                {/* Title row */}
                <div className="flex items-start gap-2">
                  <h3 className="font-semibold text-slate-700 text-sm leading-snug flex-1">
                    {p.title}
                  </h3>
                  {/* External link to publisher */}
                  <a
                    href={p.ieeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open publisher page"
                    className="shrink-0 text-slate-400 hover:text-medical-500 transition-colors mt-0.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Authors / Venue */}
                <p className="text-slate-500 text-xs mt-1">
                  {p.authors} · <em>{p.venue}</em>
                </p>

                {/* DOI */}
                <p className="text-slate-400 text-xs mt-0.5 font-mono truncate" title={p.doi}>
                  {p.doi}
                </p>

                {/* Abstract */}
                <p className="text-slate-500 text-xs mt-2 leading-relaxed line-clamp-3">
                  {p.abstract}
                </p>

                {/* Tags + PDF button */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="badge bg-liver-100 text-liver-700 text-xs inline-flex">
                    {p.technique}
                  </span>

                  {/* ── Open PDF button ── */}
                  <a
                    href={p.pdfPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-medical-50 hover:bg-medical-100 text-medical-700 hover:text-medical-800 border border-medical-200 hover:border-medical-300 transition-all font-medium shadow-sm hover:shadow"
                    title={`Open PDF: ${p.title}`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Open PDF
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>


      </section>

      {/* FAQ */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <HelpCircle className="w-6 h-6 text-medical-600" />
          <h2 className="text-2xl font-display font-bold text-slate-800">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-3">
          {[
            { q: 'How accurate is this platform?', a: 'Our best-performing technique (Bayes Theorem) achieves 98.71% accuracy validated against the ICCCT 2025 paper by Thomas & Mahesh. Other techniques range from 84–92%. These are derived from peer-reviewed clinical datasets, but individual results will vary.' },
            { q: 'Can this replace a doctor?', a: 'Absolutely not. This platform is a screening and educational tool only. All results should be interpreted by a qualified hepatologist or gastroenterologist. A high-risk score is a signal to seek medical evaluation, not a diagnosis.' },
            { q: 'What do the risk categories mean?', a: 'Low (0–20%): unlikely risk, maintain healthy habits. Moderate (21–40%): some elevated factors, consult a doctor. High (41–60%): multiple risk factors, seek medical evaluation promptly. Very High (61%+): significant risk, urgent hepatology consultation recommended.' },
            { q: 'How often should I assess my risk?', a: 'For individuals with known risk factors (hepatitis, diabetes, heavy alcohol use), annual screening is recommended. For low-risk individuals, every 2–3 years is a reasonable interval for lifestyle re-assessment.' },
            { q: 'Is my data stored anywhere?', a: 'All data processing happens locally in your browser. No patient data is sent to external servers. Your data is temporarily saved in your browser\'s localStorage for session continuity and cleared when you use the "New Assessment" button.' },
          ].map(({ q, a }) => (
            <AccordionItem key={q} question={q} answer={a} />
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="flex gap-3">
          <Shield className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-700 mb-2">Clinical Disclaimer</h3>
            <p className="text-red-600 text-sm leading-relaxed">
              The Liver Cancer Risk Assessment Platform is intended for educational, research, and informational
              purposes only. It does not constitute medical advice, diagnosis, or treatment recommendations.
              The statistical methods used are derived from published research and may not account for all
              individual clinical factors. Always consult a qualified and licensed medical professional before
              making any health-related decisions. The creators of this platform accept no liability for
              clinical decisions made based on these risk scores.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}