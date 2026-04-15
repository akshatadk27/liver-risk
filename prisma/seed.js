// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Techniques ───────────────────────────────────────────────────────────
  const techniques = await Promise.all([
    prisma.technique.upsert({
      where: { name: 'Bayes Theorem' },
      update: {},
      create: {
        name: 'Bayes Theorem',
        category: 'Probabilistic',
        formula: 'P(C|R) = P(R|C) × P(C) / P(R)',
        description: 'Calculates posterior probability of liver cancer given observed risk factors using prior probabilities and likelihood ratios from epidemiological data.',
        interpretability_score: 9.2,
      },
    }),
    prisma.technique.upsert({
      where: { name: 'Linear Regression' },
      update: {},
      create: {
        name: 'Linear Regression',
        category: 'Regression',
        formula: 'y = β₀ + β₁x₁ + β₂x₂ + ... + βₙxₙ',
        description: 'Models the linear relationship between biomarkers and cancer risk score using least-squares coefficient estimation from clinical datasets.',
        interpretability_score: 8.8,
      },
    }),
    prisma.technique.upsert({
      where: { name: 'Risk Ratio' },
      update: {},
      create: {
        name: 'Risk Ratio',
        category: 'Epidemiological',
        formula: 'RR = Incidence_exposed / Incidence_unexposed',
        description: 'Compares the probability of liver cancer in an exposed group vs. unexposed group for each risk factor independently.',
        interpretability_score: 8.5,
      },
    }),
    prisma.technique.upsert({
      where: { name: 'Odds Ratio' },
      update: {},
      create: {
        name: 'Odds Ratio',
        category: 'Epidemiological',
        formula: 'OR = (a/b) / (c/d)',
        description: 'Measures the odds of liver cancer occurrence in patients with a risk factor compared to those without it, derived from 2×2 contingency tables.',
        interpretability_score: 8.3,
      },
    }),
    prisma.technique.upsert({
      where: { name: 'Logistic Function' },
      update: {},
      create: {
        name: 'Logistic Function',
        category: 'Regression',
        formula: 'P = 1 / (1 + e^(-z))',
        description: 'Sigmoid function mapping the linear combination of risk factors to a probability between 0 and 1, ideal for binary classification.',
        interpretability_score: 8.0,
      },
    }),
    prisma.technique.upsert({
      where: { name: 'Correlation' },
      update: {},
      create: {
        name: 'Correlation',
        category: 'Statistical',
        formula: 'r = Σ((x−x̄)(y−ȳ)) / √(Σ(x−x̄)² Σ(y−ȳ)²)',
        description: "Pearson correlation coefficient measuring the linear association between each biomarker's deviation from normal range and cancer risk.",
        interpretability_score: 7.5,
      },
    }),
    prisma.technique.upsert({
      where: { name: 'Bayes-Logistic Hybrid' },
      update: {},
      create: {
        name: 'Bayes-Logistic Hybrid',
        category: 'Hybrid',
        formula: 'H = (P_Bayes + P_Logistic) / 2',
        description: 'Ensemble of Bayes Theorem and Logistic Function, averaging posterior probability and sigmoid output for improved balanced performance.',
        interpretability_score: 7.8,
      },
    }),
    prisma.technique.upsert({
      where: { name: 'Ratio Geometric Mean' },
      update: {},
      create: {
        name: 'Ratio Geometric Mean',
        category: 'Hybrid',
        formula: 'RGM = √(RR × OR)',
        description: 'Geometric mean of Risk Ratio and Odds Ratio, providing a balanced epidemiological measure that reduces outlier influence.',
        interpretability_score: 7.6,
      },
    }),
    prisma.technique.upsert({
      where: { name: 'Ensemble Average' },
      update: {},
      create: {
        name: 'Ensemble Average',
        category: 'Ensemble',
        formula: 'E = (Σ Pᵢ) / 6',
        description: 'Arithmetic mean of all six primary technique predictions, reducing variance and providing a consensus-based risk estimate.',
        interpretability_score: 8.1,
      },
    }),
  ]);

  console.log(`✅ Created ${techniques.length} techniques`);

  // ─── Performances ─────────────────────────────────────────────────────────
  const performanceData = [
    { name: 'Bayes Theorem',         accuracy: 98.71, precision: 99.6, recall: 99.5, f1_score: 97.8, paper: 'Thomas & Mahesh, ICCCCT 2025' },
    { name: 'Linear Regression',     accuracy: 92.40, precision: 90.2, recall: 88.9, f1_score: 91.3, paper: 'Kelagadi et al., ICPCSN 2024' },
    { name: 'Risk Ratio',            accuracy: 88.10, precision: 82.0, recall: 85.0, f1_score: 83.5, paper: 'Mir et al., ICAC2N 2024' },
    { name: 'Odds Ratio',            accuracy: 86.50, precision: 83.0, recall: 82.0, f1_score: 82.5, paper: 'V. C. R et al., CIISCA 2023' },
    { name: 'Logistic Function',     accuracy: 84.00, precision: 81.0, recall: 90.0, f1_score: 85.0, paper: 'Sharma & Parveen, GUCON 2020' },
    { name: 'Correlation',           accuracy: 85.20, precision: 81.5, recall: 80.0, f1_score: 80.7, paper: 'Sekhar et al., ICICCS 2025' },
    { name: 'Bayes-Logistic Hybrid', accuracy: 87.50, precision: 90.3, recall: 94.8, f1_score: 92.5, paper: 'Mabel Rani et al., ICCSAI 2023' },
    { name: 'Ratio Geometric Mean',  accuracy: 87.30, precision: 82.5, recall: 83.5, f1_score: 83.0, paper: 'Sharma & Kamboj, Chandigarh 2024' },
    { name: 'Ensemble Average',      accuracy: 87.50, precision: 86.2, recall: 87.6, f1_score: 86.9, paper: 'Kumar et al., ICCSAI 2023' },
  ];

  for (const perf of performanceData) {
    const tech = techniques.find(t => t.name === perf.name);
    if (tech) {
      await prisma.performance.upsert({
        where: { id: tech.id },
        update: {},
        create: {
          technique_id: tech.id,
          accuracy:     perf.accuracy,
          precision:    perf.precision,
          recall:       perf.recall,
          f1_score:     perf.f1_score,
          paper_source: perf.paper,
        },
      }).catch(() => {
        return prisma.performance.create({
          data: {
            technique_id: tech.id,
            accuracy:     perf.accuracy,
            precision:    perf.precision,
            recall:       perf.recall,
            f1_score:     perf.f1_score,
            paper_source: perf.paper,
          },
        });
      });
    }
  }

  console.log('✅ Created performance metrics');

  // ─── Risk Factors ─────────────────────────────────────────────────────────
  const riskFactors = await Promise.all([
    prisma.riskFactor.upsert({ where: { factor_name: 'bilirubin' }, update: {}, create: { factor_name: 'bilirubin', normal_range_min: 0.1,  normal_range_max: 1.2,   unit: 'mg/dL'     } }),
    prisma.riskFactor.upsert({ where: { factor_name: 'alt'       }, update: {}, create: { factor_name: 'alt',       normal_range_min: 7,    normal_range_max: 56,    unit: 'U/L'       } }),
    prisma.riskFactor.upsert({ where: { factor_name: 'ast'       }, update: {}, create: { factor_name: 'ast',       normal_range_min: 10,   normal_range_max: 40,    unit: 'U/L'       } }),
    prisma.riskFactor.upsert({ where: { factor_name: 'platelets' }, update: {}, create: { factor_name: 'platelets', normal_range_min: 150,  normal_range_max: 450,   unit: '×10³/μL'   } }),
    prisma.riskFactor.upsert({ where: { factor_name: 'bmi'       }, update: {}, create: { factor_name: 'bmi',       normal_range_min: 18.5, normal_range_max: 24.9,  unit: 'kg/m²'     } }),
    prisma.riskFactor.upsert({ where: { factor_name: 'age'       }, update: {}, create: { factor_name: 'age',       normal_range_min: 0,    normal_range_max: 120,   unit: 'years'     } }),
  ]);

  console.log(`✅ Created ${riskFactors.length} risk factors`);

  // ─── Coefficients (beta values from literature) ───────────────────────────
  // Each technique × each risk factor
  const coefficientData = [
    // Bayes Theorem (id 1)
    { tech: 'Bayes Theorem',         factor: 'bilirubin', beta: 0.85, or: 2.34, cl: 1.89, ch: 2.89 },
    { tech: 'Bayes Theorem',         factor: 'alt',       beta: 0.62, or: 1.86, cl: 1.52, ch: 2.28 },
    { tech: 'Bayes Theorem',         factor: 'ast',       beta: 0.71, or: 2.03, cl: 1.65, ch: 2.51 },
    { tech: 'Bayes Theorem',         factor: 'platelets', beta:-0.45, or: 0.64, cl: 0.51, ch: 0.80 },
    { tech: 'Bayes Theorem',         factor: 'bmi',       beta: 0.38, or: 1.46, cl: 1.18, ch: 1.81 },
    { tech: 'Bayes Theorem',         factor: 'age',       beta: 0.52, or: 1.68, cl: 1.35, ch: 2.10 },

    // Linear Regression (id 2)
    { tech: 'Linear Regression',     factor: 'bilirubin', beta: 0.78, or: 2.18, cl: 1.74, ch: 2.73 },
    { tech: 'Linear Regression',     factor: 'alt',       beta: 0.55, or: 1.73, cl: 1.41, ch: 2.13 },
    { tech: 'Linear Regression',     factor: 'ast',       beta: 0.63, or: 1.88, cl: 1.52, ch: 2.32 },
    { tech: 'Linear Regression',     factor: 'platelets', beta:-0.40, or: 0.67, cl: 0.53, ch: 0.85 },
    { tech: 'Linear Regression',     factor: 'bmi',       beta: 0.33, or: 1.39, cl: 1.12, ch: 1.73 },
    { tech: 'Linear Regression',     factor: 'age',       beta: 0.47, or: 1.60, cl: 1.28, ch: 2.00 },

    // Risk Ratio (id 3)
    { tech: 'Risk Ratio',            factor: 'bilirubin', beta: 0.72, or: 2.05, cl: 1.62, ch: 2.59 },
    { tech: 'Risk Ratio',            factor: 'alt',       beta: 0.50, or: 1.65, cl: 1.33, ch: 2.05 },
    { tech: 'Risk Ratio',            factor: 'ast',       beta: 0.58, or: 1.79, cl: 1.44, ch: 2.22 },
    { tech: 'Risk Ratio',            factor: 'platelets', beta:-0.35, or: 0.70, cl: 0.56, ch: 0.88 },
    { tech: 'Risk Ratio',            factor: 'bmi',       beta: 0.28, or: 1.32, cl: 1.06, ch: 1.65 },
    { tech: 'Risk Ratio',            factor: 'age',       beta: 0.42, or: 1.52, cl: 1.22, ch: 1.90 },

    // Odds Ratio (id 4)
    { tech: 'Odds Ratio',            factor: 'bilirubin', beta: 0.80, or: 2.23, cl: 1.77, ch: 2.81 },
    { tech: 'Odds Ratio',            factor: 'alt',       beta: 0.58, or: 1.79, cl: 1.45, ch: 2.20 },
    { tech: 'Odds Ratio',            factor: 'ast',       beta: 0.66, or: 1.93, cl: 1.57, ch: 2.39 },
    { tech: 'Odds Ratio',            factor: 'platelets', beta:-0.42, or: 0.66, cl: 0.52, ch: 0.83 },
    { tech: 'Odds Ratio',            factor: 'bmi',       beta: 0.35, or: 1.42, cl: 1.14, ch: 1.76 },
    { tech: 'Odds Ratio',            factor: 'age',       beta: 0.49, or: 1.63, cl: 1.31, ch: 2.04 },

    // Logistic Function (id 5)
    { tech: 'Logistic Function',     factor: 'bilirubin', beta: 0.90, or: 2.46, cl: 1.95, ch: 3.09 },
    { tech: 'Logistic Function',     factor: 'alt',       beta: 0.65, or: 1.92, cl: 1.56, ch: 2.35 },
    { tech: 'Logistic Function',     factor: 'ast',       beta: 0.74, or: 2.10, cl: 1.70, ch: 2.58 },
    { tech: 'Logistic Function',     factor: 'platelets', beta:-0.48, or: 0.62, cl: 0.49, ch: 0.78 },
    { tech: 'Logistic Function',     factor: 'bmi',       beta: 0.40, or: 1.49, cl: 1.20, ch: 1.86 },
    { tech: 'Logistic Function',     factor: 'age',       beta: 0.55, or: 1.73, cl: 1.39, ch: 2.16 },

    // Correlation (id 6)
    { tech: 'Correlation',           factor: 'bilirubin', beta: 0.68, or: 1.97, cl: 1.56, ch: 2.49 },
    { tech: 'Correlation',           factor: 'alt',       beta: 0.48, or: 1.62, cl: 1.31, ch: 2.00 },
    { tech: 'Correlation',           factor: 'ast',       beta: 0.55, or: 1.73, cl: 1.40, ch: 2.15 },
    { tech: 'Correlation',           factor: 'platelets', beta:-0.32, or: 0.73, cl: 0.58, ch: 0.91 },
    { tech: 'Correlation',           factor: 'bmi',       beta: 0.25, or: 1.28, cl: 1.03, ch: 1.60 },
    { tech: 'Correlation',           factor: 'age',       beta: 0.40, or: 1.49, cl: 1.19, ch: 1.87 },

    // Bayes-Logistic Hybrid (id 7)
    { tech: 'Bayes-Logistic Hybrid', factor: 'bilirubin', beta: 0.87, or: 2.39, cl: 1.90, ch: 3.01 },
    { tech: 'Bayes-Logistic Hybrid', factor: 'alt',       beta: 0.63, or: 1.88, cl: 1.53, ch: 2.32 },
    { tech: 'Bayes-Logistic Hybrid', factor: 'ast',       beta: 0.72, or: 2.05, cl: 1.67, ch: 2.53 },
    { tech: 'Bayes-Logistic Hybrid', factor: 'platelets', beta:-0.46, or: 0.63, cl: 0.50, ch: 0.80 },
    { tech: 'Bayes-Logistic Hybrid', factor: 'bmi',       beta: 0.39, or: 1.48, cl: 1.19, ch: 1.84 },
    { tech: 'Bayes-Logistic Hybrid', factor: 'age',       beta: 0.53, or: 1.70, cl: 1.37, ch: 2.12 },

    // Ratio Geometric Mean (id 8)
    { tech: 'Ratio Geometric Mean',  factor: 'bilirubin', beta: 0.76, or: 2.14, cl: 1.70, ch: 2.69 },
    { tech: 'Ratio Geometric Mean',  factor: 'alt',       beta: 0.54, or: 1.72, cl: 1.39, ch: 2.12 },
    { tech: 'Ratio Geometric Mean',  factor: 'ast',       beta: 0.62, or: 1.86, cl: 1.50, ch: 2.31 },
    { tech: 'Ratio Geometric Mean',  factor: 'platelets', beta:-0.38, or: 0.68, cl: 0.54, ch: 0.86 },
    { tech: 'Ratio Geometric Mean',  factor: 'bmi',       beta: 0.31, or: 1.36, cl: 1.10, ch: 1.70 },
    { tech: 'Ratio Geometric Mean',  factor: 'age',       beta: 0.45, or: 1.57, cl: 1.25, ch: 1.96 },

    // Ensemble Average (id 9)
    { tech: 'Ensemble Average',      factor: 'bilirubin', beta: 0.82, or: 2.27, cl: 1.81, ch: 2.86 },
    { tech: 'Ensemble Average',      factor: 'alt',       beta: 0.59, or: 1.80, cl: 1.46, ch: 2.22 },
    { tech: 'Ensemble Average',      factor: 'ast',       beta: 0.67, or: 1.95, cl: 1.58, ch: 2.41 },
    { tech: 'Ensemble Average',      factor: 'platelets', beta:-0.43, or: 0.65, cl: 0.51, ch: 0.82 },
    { tech: 'Ensemble Average',      factor: 'bmi',       beta: 0.36, or: 1.43, cl: 1.15, ch: 1.78 },
    { tech: 'Ensemble Average',      factor: 'age',       beta: 0.50, or: 1.65, cl: 1.32, ch: 2.06 },
  ];

  for (const c of coefficientData) {
    const tech   = techniques.find(t => t.name === c.tech);
    const factor = riskFactors.find(f => f.factor_name === c.factor);
    if (tech && factor) {
      await prisma.coefficient.create({
        data: {
          technique_id:    tech.id,
          factor_id:       factor.id,
          beta_value:      c.beta,
          odds_ratio:      c.or,
          confidence_low:  c.cl,
          confidence_high: c.ch,
        },
      }).catch(() => {}); // skip if already exists
    }
  }

  console.log('✅ Created coefficients');
  console.log('🎉 Database seeding complete!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
