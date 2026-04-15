-- ============================================================
-- LiverRisk Platform — Database Seed File
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Context: This fills the empty reference tables with initial medical data!
-- ============================================================

-- 1. Insert Risk Factors
INSERT INTO risk_factors (id, factor_name, normal_range_min, normal_range_max, unit) VALUES
(1, 'Bilirubin', 0.1, 1.2, 'mg/dL'),
(2, 'ALT', 7, 56, 'U/L'),
(3, 'AST', 10, 40, 'U/L'),
(4, 'Platelets', 150, 450, '×10³/μL'),
(5, 'BMI', 18.5, 24.9, 'kg/m²'),
(6, 'Albumin', 3.4, 5.4, 'g/dL'),
(7, 'Globulin', 2.0, 3.5, 'g/dL')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Diagnostic Techniques
INSERT INTO techniques (id, name, category, formula, description, interpretability_score) VALUES
(1, 'Bayes Theorem', 'Probabilistic', 'P(C|R) = P(R|C) × P(C) / P(R)', 'Calculates posterior probability using prior probabilities and likelihood ratios.', 9.2),
(2, 'Linear Regression', 'Regression', 'y = β₀ + β₁x₁ + β₂x₂ + ... + βₙxₙ', 'Calculates linear relationship between biomarkers and cancer risk score.', 8.8),
(3, 'Risk Ratio', 'Epidemiological', 'RR = Incidence_exposed / Incidence_unexposed', 'Compares probability of cancer in exposed vs unexposed groups.', 8.5),
(4, 'Odds Ratio', 'Epidemiological', 'OR = (a/b) / (c/d)', 'Measures the odds of cancer in patients with vs without a risk factor.', 8.3),
(5, 'Logistic Function', 'Regression', 'P = 1 / (1 + e^(−z))', 'Sigmoid function mapping linear factors to probability.', 8.0),
(6, 'Correlation', 'Statistical', 'r = Σ((x−x̄)(y−ȳ)) / √(Σ(x−x̄)² Σ(y−ȳ)²)', 'Pearson correlation between biomarker deviation and cancer risk.', 7.5),
(7, 'Bayes-Logistic Hybrid', 'Hybrid', 'H = (P_Bayes + P_Logistic) / 2', 'Ensemble averaging Bayes and Logistic predictions for balanced output.', 7.8),
(8, 'Ratio Geometric Mean', 'Hybrid', 'RGM = √(RR × OR)', 'Geometric mean of Risk Ratio and Odds Ratio, reducing outlier influence.', 7.6),
(9, 'Ensemble Average', 'Ensemble', 'E = (Σ Pᵢ) / 6', 'Arithmetic mean of all six primary technique predictions.', 8.1)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Model Performances from Medical Papers
INSERT INTO performances (id, technique_id, accuracy, precision, recall, f1_score, paper_source) VALUES
(1, 1, 98.71, 99.6, 99.5, 97.8, 'Thomas & Mahesh, ICCCCT 2025'),
(2, 2, 92.40, 90.2, 88.9, 91.3, 'Kelagadi et al., ICPCSN 2024'),
(3, 3, 88.10, 82.0, 85.0, 83.5, 'Mir et al., ICAC2N 2024'),
(4, 4, 86.50, 83.0, 82.0, 82.5, 'V. C. R et al., CIISCA 2023'),
(5, 5, 84.00, 81.0, 90.0, 85.0, 'Sharma & Parveen, GUCON 2020'),
(6, 6, 85.20, 81.5, 80.0, 80.7, 'Sekhar et al., ICICCS 2025'),
(7, 7, 87.50, 90.3, 94.8, 92.5, 'Mabel Rani et al., ICCSAI 2023'),
(8, 8, 87.30, 82.5, 83.5, 83.0, 'Sharma & Kamboj, Chandigarh 2024'),
(9, 9, 87.50, 86.2, 87.6, 86.9, 'Kumar et al., ICCSAI 2023')
ON CONFLICT (id) DO NOTHING;

-- Fixing Sequences so future auto-increments work properly
SELECT setval('risk_factors_id_seq', (SELECT MAX(id) FROM risk_factors));
SELECT setval('techniques_id_seq', (SELECT MAX(id) FROM techniques));
SELECT setval('performances_id_seq', (SELECT MAX(id) FROM performances));
