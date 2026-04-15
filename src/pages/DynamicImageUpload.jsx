// src/pages/DynamicImageUpload.jsx
// Full rewrite — dual-PSM OCR, fixed age extraction, required-field enforcement,
// improved preprocessing for screenshots / WhatsApp / camera, camera fixes.
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import Tesseract from 'tesseract.js';
import toast from 'react-hot-toast';
import {
  Camera, ArrowRight, ArrowLeft,
  CheckCircle, AlertCircle, ChevronDown, Edit3, Info,
  RefreshCw, Lightbulb, X, AlertTriangle,
  RotateCcw, Eye, EyeOff, Wand2, FileImage, ClipboardList,
  FileText
} from 'lucide-react';
import { usePatientData } from '../context/PatientDataContext';
import { RISK_FACTORS } from '../data/staticData';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// ─── OCR Steps ────────────────────────────────────────────────────────────────
const OCR_STEPS = [
  { id: 'load',       label: 'Loading image…',       icon: '📂' },
  { id: 'pdf',        label: 'Converting PDF…',       icon: '📄' },
  { id: 'preprocess', label: 'Preprocessing image…',  icon: '🔧' },
  { id: 'ocr',        label: 'Extracting text…',      icon: '🔍' },
  { id: 'parse',      label: 'Parsing values…',       icon: '📊' },
];

// ─── Required / Optional field config ─────────────────────────────────────────
const REQUIRED_FIELDS  = ['age', 'gender', 'bilirubin', 'alt', 'ast'];
const OPTIONAL_FIELDS  = ['platelets', 'albumin', 'globulin'];
const REQUIRED_LABELS  = { age: 'Age', gender: 'Gender', bilirubin: 'Bilirubin', alt: 'ALT/SGPT', ast: 'AST/SGOT' };

// ─── Regex Patterns ───────────────────────────────────────────────────────────
//
// AGE EXTRACTION STRATEGY
// ───────────────────────
// Problem: loose patterns pick up barcodes, reference ranges, report IDs
// Solution:
//   1. Extract age ONLY from the first HEADER_LINES lines (where patient info lives).
//   2. Require EITHER a "Years/Yrs" unit word OR an "Age:" label immediately before.
//   3. Validate: 18–100 (not 1–120 which was too broad).
//   4. Negative lookaheads: reject if number is followed by "/" (date separator)
//      or by common reference-range patterns.
const HEADER_LINES = 30; // patient info zone – top of most Indian lab reports

const PATTERNS = {
  age: {
    // Patterns listed most-specific → most-generic.
    // All require the word "age" (or "age/gender") and a unit OR a strict context.
    patterns: [
      // "Age/Gender: 45 / Male" or "Age / Sex: 34 / Female"
      /(?:age\s*[\/\-]\s*(?:gender|sex))\s*[:\-]?\s*(\d{1,3})\s*(?:years?|yrs?\.?|yr\.?)?\s*(?:\/|$)/i,
      // "Age (Yrs): 45" or "Patient Age (Years): 67"
      /(?:patient\s*)?age\s*\(\s*(?:years?|yrs?\.?)\s*\)\s*[:\-]?\s*(\d{1,3})(?!\s*\/\s*\d)/i,
      // "Age: 45 Years" or "Age: 45 Yrs" – requires unit word
      /\bage\s*[:\-]?\s*(\d{1,3})\s+(?:years?|yrs?\.?|yr\.?)/i,
      // "45 Years Old" or "45 Yrs" standalone (unit mandatory, not inside ref range)
      /(?<!\d)(\d{1,3})\s*(?:years?|yrs?\.?|yr\.?)\s*(?:old)?(?!\s*\/?\s*(?:male|female)?.*\d)/i,
      // Plain "Age : 45" – last resort, header-zone only (applied separately)
      /\bage\b\s*[:\-]\s*(\d{1,3})(?!\s*\/\s*\d)/i,
    ],
    label: 'Age', unit: 'years',
    normalize: v => parseInt(v, 10),
    // Tightened validation: reports are for adults 18-100
    validate: v => v >= 18 && v <= 100,
  },

  gender: {
    patterns: [
      /(?:gender|sex|patient\s*sex|pt\.?\s*sex|biological\s*sex|gender\s*at\s*birth)\s*[:\-\/]?\s*(male|female)/i,
      /(?:age\s*[\/\-]\s*(?:gender|sex))[^\n]*?[\/\-]\s*(male|female)/i,
      /(?:gender|sex|pt\.?\s*sex)\s*[:\-]?\s*\b(m|f)\b/i,
      /(?:\d{2,3}\s*\/\s*)(male|female|m|f)(?:\s|$)/i,
      /\b(male|female)\b/i,
      /\b(mr\.?|master)\b/i,
      /\b(mrs\.?|ms\.?|miss)\b/i,
    ],
    label: 'Gender', unit: '',
    normalize: v => {
      const l = v.toLowerCase().replace(/\./g, '');
      if (['m','male','mr','master'].includes(l)) return 'Male';
      if (['f','female','mrs','ms','miss'].includes(l)) return 'Female';
      return v;
    },
    validate: () => true,
  },

  bilirubin: {
    patterns: [
      /(?:serum\s+)?total\s+(?:serum\s+)?bilirubin\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
      /bilirubin\s*,?\s*total\s*(?:\(serum\))?\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
      /total\s+serum\s+bilirubin\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
      /bil(?:irubin)?\s*[,\s]*total\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
      /\bt\.?\s*[-]?\s*bili(?:rubin)?\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
      /\bt[-\s]?bil\b\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
      /\btbili(?:rubin)?\b\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
      /\bbilirubin\b\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
      /total\s+bilirubin\s+([\d]+\.?[\d]*)/i,
      // Table row: label on left, value further right after spaces
      /total\s+bilirubin\s{2,}([\d]+\.?[\d]*)/i,
    ],
    label: 'Total Bilirubin', unit: 'mg/dL',
    normalize: v => parseFloat(v),
    validate: v => v >= 0.1 && v <= 30,
  },

  alt: {
    patterns: [
      /alanine\s*(?:amino|amino\s*)?transferase\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
      /alanine\s*transaminase\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
      /(?:ALT\s*[\/\(]\s*SGPT|SGPT\s*[\/\(]\s*ALT)\s*[:\-\)]?\s*([\d]+\.?[\d]*)/i,
      /(?:ALT\s*[\/\(]\s*SGPT|SGPT\s*[\/\(]\s*ALT)[^\n]{0,60}\n(?:[^\n]{0,80}\n)?\s*([\d]+\.?[\d]*)/i,
      /\bSGPT\b\s*[:\-]?\s*([\d]{1,4}(?:\.[\d]+)?)/i,
      /\bALT\b\s*[:\-]?\s*([\d]{1,4}(?:\.[\d]+)?)/i,
      /\bGPT\b\s*[:\-]?\s*([\d]{1,4}(?:\.[\d]+)?)/i,
      /(?:serum\s+ALT|s[-\s]?ALT)\b\s*[:\-]?\s*([\d]{1,4}(?:\.[\d]+)?)/i,
      /SGPT\s*\(ALT\)\s+([\d]+\.?[\d]*)/i,
      /ALT\s*\(SGPT\)\s+([\d]+\.?[\d]*)/i,
      // Spaced table: "SGPT  74" or "ALT  74"  (2+ spaces between label and value)
      /\bSGPT\b\s{2,}([\d]{1,4}(?:\.[\d]+)?)/i,
      /\bALT\b\s{2,}([\d]{1,4}(?:\.[\d]+)?)/i,
    ],
    label: 'ALT / SGPT', unit: 'U/L',
    normalize: v => parseFloat(v),
    validate: v => v >= 1 && v <= 5000,
  },

  ast: {
    patterns: [
      /aspartate\s*(?:amino|amino\s*)?transferase\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
      /aspartate\s*transaminase\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
      /(?:AST\s*[\/\(]\s*SGOT|SGOT\s*[\/\(]\s*AST)\s*[:\-\)]?\s*([\d]+\.?[\d]*)/i,
      /(?:AST\s*[\/\(]\s*SGOT|SGOT\s*[\/\(]\s*AST)[^\n]{0,60}\n(?:[^\n]{0,80}\n)?\s*([\d]+\.?[\d]*)/i,
      /\bSGOT\b\s*[:\-]?\s*([\d]{1,4}(?:\.[\d]+)?)/i,
      /\bAST\b\s*[:\-]?\s*([\d]{1,4}(?:\.[\d]+)?)/i,
      /\bGOT\b\s*[:\-]?\s*([\d]{1,4}(?:\.[\d]+)?)/i,
      /\bASAT\b\s*[:\-]?\s*([\d]{1,4}(?:\.[\d]+)?)/i,
      /(?:serum\s+AST|s[-\s]?AST)\b\s*[:\-]?\s*([\d]{1,4}(?:\.[\d]+)?)/i,
      /SGOT\s*\(AST\)\s+([\d]+\.?[\d]*)/i,
      /AST\s*\(SGOT\)\s+([\d]+\.?[\d]*)/i,
      /\bSGOT\b\s{2,}([\d]{1,4}(?:\.[\d]+)?)/i,
      /\bAST\b\s{2,}([\d]{1,4}(?:\.[\d]+)?)/i,
    ],
    label: 'AST / SGOT', unit: 'U/L',
    normalize: v => parseFloat(v),
    validate: v => v >= 1 && v <= 5000,
  },

  platelets: {
    patterns: [
      /platelet\s+count\s*[:\-]?\s*([\d,]+\.?[\d]*)/i,
      /platelets?\s*(?:count)?\s*[:\-]?\s*([\d,]+\.?[\d]*)/i,
      /\bPLT\s*(?:count|ct\.?)?\s*[:\-]?\s*([\d,]+\.?[\d]*)/i,
      /\bPlt\.?\s*Ct\.?\s*[:\-]?\s*([\d,]+\.?[\d]*)/i,
      /thrombocyte(?:s)?\s*(?:count)?\s*[:\-]?\s*([\d,]+\.?[\d]*)/i,
      /blood\s+platelets?\s*[:\-]?\s*([\d,]+\.?[\d]*)/i,
      /platelet\s*\(auto\)\s*[:\-]?\s*([\d,]+\.?[\d]*)/i,
      /\bplatelet\b[^\n]{0,40}?([\d,]{2,6})/i,
      /\bPLT\b[^\d\n]{0,15}([\d,]{2,6})/i,
      /PLT[\s:]*([\d]{2,5})/i,
      /(?:^|\n)\s*platelet\s+([\d]{2,5})\s*(?:\n|$)/im,
      /\bPLT\b\s{2,}([\d,]{2,6})/i,
      /platelet\s+count\s{2,}([\d,]+\.?[\d]*)/i,
    ],
    label: 'Platelets', unit: '×10³/μL',
    normalize: v => {
      const n = parseFloat(String(v).replace(/,/g, ''));
      if (n > 1500 && n <= 1500000) return Math.round(n / 1000);
      return n;
    },
    validate: v => v >= 10 && v <= 1500,
  },

  albumin: {
    patterns: [
      /(?:serum\s+)?albumin\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
      /\bALB\b\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
      /albumin\s*\(s\)\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
      /albumin\s*,?\s*serum\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
      /\bS\.?\s*Alb(?:umin)?\b\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
    ],
    label: 'Albumin', unit: 'g/dL',
    normalize: v => parseFloat(v),
    validate: v => v >= 1.0 && v <= 8.0,
  },

  globulin: {
    patterns: [
      /(?:serum\s+)?globulin\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
      /\bGLOB\b\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
      /globulin\s*\(s\)\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
      /globulin\s*,?\s*serum\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
      /\bS\.?\s*Glob(?:ulin)?\b\s*[:\-]?\s*([\d]+\.?[\d]*)/i,
    ],
    label: 'Globulin', unit: 'g/dL',
    normalize: v => parseFloat(v),
    validate: v => v >= 1.0 && v <= 8.0,
  },
};

const MANUAL_RANGES = {
  bilirubin: { min: 0.1, max: 20,  step: '0.01', placeholder: '0.1–20.0 mg/dL',   label: 'Total Bilirubin', unit: 'mg/dL'   },
  alt:       { min: 5,   max: 500, step: '1',    placeholder: '5–500 U/L',         label: 'ALT / SGPT',     unit: 'U/L'     },
  ast:       { min: 5,   max: 500, step: '1',    placeholder: '5–500 U/L',         label: 'AST / SGOT',     unit: 'U/L'     },
  platelets: { min: 50,  max: 500, step: '1',    placeholder: '50–500 ×10³/μL',    label: 'Platelets',      unit: '×10³/μL' },
  albumin:   { min: 1.0, max: 8.0, step: '0.1',  placeholder: '1.0–8.0 g/dL',      label: 'Albumin',        unit: 'g/dL'    },
  globulin:  { min: 1.0, max: 8.0, step: '0.1',  placeholder: '1.0–8.0 g/dL',      label: 'Globulin',       unit: 'g/dL'    },
};

// ─── PDF → Image conversion using pdf.js ──────────────────────────────────────
async function pdfToImage(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const images = [];
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    // Scale 2.5× for high DPI — good balance of quality vs memory
    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = document.createElement('canvas');
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    images.push({ dataUrl: canvas.toDataURL('image/png'), type: 'pdf' });
  }
  return images;
}

// ─── Image type detection ─────────────────────────────────────────────────────
function detectImageType(data, width, height) {
  // Sample corners + edges to characterise background
  const sampleCoords = [
    [0,0],[1,0],[0,1],[width-1,0],[width-2,0],[width-1,1],
    [0,height-1],[0,height-2],[1,height-1],
    [width-1,height-1],[width-2,height-1],[width-1,height-2],
    [Math.floor(width/2),0],[Math.floor(width/2),1],
    [0,Math.floor(height/2)],[1,Math.floor(height/2)],
    [width-1,Math.floor(height/2)],[width-2,Math.floor(height/2)],
    [Math.floor(width/2),height-1],[Math.floor(width/2),height-2],
  ];

  let sumBright = 0, sumSat = 0, sumR = 0, sumG = 0, sumB = 0;
  const n = sampleCoords.length;
  for (const [x, y] of sampleCoords) {
    const idx = (y * width + x) * 4;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    sumBright += (r + g + b) / 3;
    sumSat    += Math.max(r, g, b) - Math.min(r, g, b);
    sumR += r; sumG += g; sumB += b;
  }
  const brightness  = sumBright / n;
  const saturation  = sumSat / n;
  const avgR = sumR / n, avgG = sumG / n, avgB = sumB / n;
  const isYellowTinted = avgR > avgB + 18 && avgG > avgB + 12 && brightness > 135;

  // "Screenshot" = very bright (≥240) + low saturation (<10) + not yellow-tinted
  // These come from digital screen captures; need minimal processing
  if (brightness >= 240 && saturation < 10 && !isYellowTinted) return 'screenshot';

  // "WhatsApp" = bright (≥215) + moderate saturation — compressed JPEG from screen
  if (brightness >= 215 && saturation < 25 && !isYellowTinted) return 'whatsapp';

  // Everything else = camera photo (may be dark, yellow, or scanned)
  return 'camera';
}

// ─── Image preprocessing ──────────────────────────────────────────────────────
// Three distinct pipelines based on detected image type:
//   screenshot → gentle grayscale + mild contrast (no binarization — destroys thin strokes)
//   whatsapp   → grayscale + slight sharpening + mild contrast stretch
//   camera     → full pipeline: grayscale + gamma + watermark suppression + binarization + denoise
async function preprocessImage(src, forcedType) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let { width, height } = img;
      if (!width || !height || width < 10 || height < 10) {
        reject(new Error('Invalid image dimensions')); return;
      }

      // ── Scale: upscale tiny images, downscale huge ones ────────────────────
      const MIN_DIM = 1200;
      const MAX_DIM = 3800;
      if (width < MIN_DIM && height < MIN_DIM) {
        const ratio = Math.max(MIN_DIM / width, MIN_DIM / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      const imageType = forcedType || detectImageType(data, width, height);
      console.log('[preprocess] Detected image type:', imageType, `(${width}×${height})`);

      // ── Pass 1: Grayscale (all paths) ───────────────────────────────────────
      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]);
        data[i] = data[i+1] = data[i+2] = gray;
      }

      if (imageType === 'screenshot') {
        // ── Screenshot path ─────────────────────────────────────────────────
        // Gentle S-curve contrast.  NO hard threshold — thin strokes survive.
        for (let i = 0; i < data.length; i += 4) {
          const g = data[i];
          let e;
          if (g < 50)       e = Math.max(0, g - 20);
          else if (g < 170) e = g - Math.round((g - 50) * 0.05);
          else if (g > 230) e = 255;
          else              e = g;
          data[i] = data[i+1] = data[i+2] = e;
        }
        ctx.putImageData(imageData, 0, 0);

      } else if (imageType === 'whatsapp') {
        // ── WhatsApp path ────────────────────────────────────────────────────
        // Heavier contrast stretch: pull dark pixels darker, white stays white.
        // Still no binarization — JPEG compression artefacts would be amplified.
        for (let i = 0; i < data.length; i += 4) {
          const g = data[i];
          let e;
          if (g < 80)       e = Math.max(0, g - 25);
          else if (g < 190) e = g - Math.round((g - 80) * 0.10);
          else if (g > 215) e = 255;
          else              e = g;
          data[i] = data[i+1] = data[i+2] = e;
        }
        ctx.putImageData(imageData, 0, 0);

      } else {
        // ── Camera / scanned path — full pipeline ────────────────────────────

        // Compute brightness after grayscale
        let sumG = 0;
        for (let i = 0; i < data.length; i += 4) sumG += data[i];
        const avgBright = sumG / (data.length / 4);

        // Detect yellow tint again on the now-gray image via original channels
        // (we already have only gray values in data[], so re-check isn't needed;
        //  rely on the earlier detection stored in imageType)
        const isYellow = imageType === 'camera' && avgBright < 185;

        // Pass 2: Gamma correction (brightens dark images)
        if (avgBright < 195 || isYellow) {
          const gamma = avgBright < 150 ? 0.60 : 0.75;
          const lut = new Uint8Array(256);
          for (let i = 0; i < 256; i++)
            lut[i] = Math.min(255, Math.round(255 * Math.pow(i / 255, gamma)));
          for (let i = 0; i < data.length; i += 4)
            data[i] = data[i+1] = data[i+2] = lut[data[i]];
        }

        // Pass 3: Watermark suppression (lift mid-grey to white)
        if (avgBright > 160) {
          for (let i = 0; i < data.length; i += 4) {
            const g = data[i];
            if (g >= 125 && g <= 210) data[i] = data[i+1] = data[i+2] = 255;
          }
        }

        // Pass 4: Adaptive binarization
        for (let i = 0; i < data.length; i += 4) {
          const g = data[i];
          const contrast = 1.6;
          const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
          const enhanced = Math.min(255, Math.max(0, factor * (g - 128) + 128));
          const final = enhanced < 120 ? Math.max(0, enhanced - 20) : 255;
          data[i] = data[i+1] = data[i+2] = final;
        }

        // Pass 5: Noise removal — isolated dark pixels surrounded by white
        const denoised = new Uint8ClampedArray(data);
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            if (data[idx] < 80) {
              const nb = [
                data[((y-1)*width+(x-1))*4], data[((y-1)*width+x)*4], data[((y-1)*width+(x+1))*4],
                data[(y*width+(x-1))*4],                                data[(y*width+(x+1))*4],
                data[((y+1)*width+(x-1))*4], data[((y+1)*width+x)*4], data[((y+1)*width+(x+1))*4],
              ];
              if (nb.reduce((a, b) => a + b, 0) / 8 > 190)
                denoised[idx] = denoised[idx+1] = denoised[idx+2] = 255;
            }
          }
        }
        ctx.putImageData(new ImageData(denoised, width, height), 0, 0);
      }

      resolve({ dataUrl: canvas.toDataURL('image/png'), type: imageType });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

// ─── Age extraction with header-zone priority ─────────────────────────────────
// Extracts age from the top HEADER_LINES of the text first (patient info zone).
// If not found there, falls back to the full text — but uses stricter patterns
// that require a unit word to avoid picking up reference ranges or page numbers.
function extractAge(text) {
  const lines = text.split('\n');
  const headerText = lines.slice(0, HEADER_LINES).join('\n');
  const def = PATTERNS.age;

  // Helper: try all patterns on a given block of text
  const tryBlock = (block, allowLastResort) => {
    const patternsToTry = allowLastResort ? def.patterns : def.patterns.slice(0, def.patterns.length - 1);
    let best = null, bestScore = 0;
    for (let pi = 0; pi < patternsToTry.length; pi++) {
      const m = block.match(patternsToTry[pi]);
      if (!m) continue;
      const rawVal = m[1] ?? m[2];
      if (!rawVal) continue;
      const val = def.normalize(rawVal.trim());
      if (!def.validate(val)) continue;
      const score = Math.max(10, 100 - pi * 8);
      if (score > bestScore) { bestScore = score; best = { raw: rawVal.trim(), value: val, confidence: score }; }
    }
    return best;
  };

  // Pass 1: header zone, all patterns including last-resort
  let result = tryBlock(headerText, true);
  if (result) return { ...result, confidence: Math.min(98, result.confidence + 15) }; // boost header-zone matches

  // Pass 2: full text, but NOT the last-resort plain /\bage\b/ pattern (too risky)
  result = tryBlock(text, false);
  return result;
}

// ─── Value extraction ─────────────────────────────────────────────────────────
function extractValues(rawText) {
  // ── Step 1: Normalise line endings ─────────────────────────────────────────
  let text = rawText.replace(/\r\n|\r/g, '\n');

  // ── Step 2: Common OCR character substitutions ──────────────────────────────
  text = text.replace(/\|(?=\s*\d)/g, '1');       // pipe → 1 before digits
  text = text.replace(/\bO(?=\d)/g, '0');          // O → 0 before digits
  text = text.replace(/(?<![a-zA-Z])l(?=\d)/g, '1'); // l → 1 before digits
  text = text.replace(/`/g, "'");
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // ── Step 3: Collapse spaced-out letters ("S G P T" → "SGPT") ─────────────
  const collapseSpaced = t =>
    t.replace(/\b([A-Za-z]{1,2})((?:\s[A-Za-z]{1,2}){2,6})\b/g, (_, first, rest) =>
      first + rest.replace(/\s/g, ''));
  text = collapseSpaced(text);

  // ── Step 4: Preserve double-spaces as table separators (don't collapse) ────
  // Collapse runs of 3+ spaces to 2 (keeping 2-space as separator cue)
  text = text.split('\n').map(l => l.replace(/[ \t]{3,}/g, '  ')).join('\n');

  // ── Step 5: Build flat and compact versions ─────────────────────────────────
  const flat    = text.replace(/\n+/g, ' ').replace(/\s{3,}/g, ' ').trim();
  const compact = text.replace(/\s/g, '');

  // ── Step 6: Apply PATTERNS ───────────────────────────────────────────────────
  const extracted = {};

  for (const [key, def] of Object.entries(PATTERNS)) {
    // Age uses a special header-zone-priority extractor
    if (key === 'age') {
      const ageResult = extractAge(text);
      if (ageResult) {
        const rf = RISK_FACTORS[key];
        let conf = ageResult.confidence;
        if (rf && typeof ageResult.value === 'number') {
          if (ageResult.value >= rf.min * 0.5 && ageResult.value <= rf.max * 3)
            conf = Math.min(98, conf + 10);
        }
        extracted.age = { ...ageResult, confidence: conf };
      }
      continue;
    }

    let bestMatch = null, bestScore = 0;
    for (let pi = 0; pi < def.patterns.length; pi++) {
      let m = text.match(def.patterns[pi])
           || flat.match(def.patterns[pi])
           || compact.match(def.patterns[pi]);
      if (!m) continue;
      const rawVal = m[1] ?? m[2];
      if (rawVal == null || rawVal.trim() === '') continue;
      const normalised = def.normalize(rawVal.trim());
      if (!def.validate(normalised)) continue;
      const patternScore = Math.max(10, 100 - pi * 7);
      if (patternScore > bestScore) {
        bestScore = patternScore;
        bestMatch = { raw: rawVal.trim(), value: normalised };
      }
    }

    if (bestMatch) {
      const rf = RISK_FACTORS[key];
      let confidence = bestScore;
      if (rf && typeof bestMatch.value === 'number') {
        if (bestMatch.value >= rf.min * 0.5 && bestMatch.value <= rf.max * 3)
          confidence = Math.min(98, confidence + 10);
      }
      extracted[key] = { ...bestMatch, confidence };
    }
  }

  return extracted;
}

// ─── Merge two extraction results (keep highest confidence per field) ─────────
function mergeExtracted(base, incoming) {
  const result = { ...base };
  for (const [key, match] of Object.entries(incoming)) {
    if (!result[key] || match.confidence > result[key].confidence) {
      result[key] = match;
    }
  }
  return result;
}

// ─── OCR Diagnostic Engine ───────────────────────────────────────────────────
// After extraction, explain in plain English WHY each field was not detected.
// Reasons fall into 4 categories:
//   'image'   — too little text extracted → bad image quality
//   'keyword' — the label keyword was not found in the text at all
//   'value'   — keyword found but no number near it
//   'range'   — a number was found but failed validation (wrong range)
const FIELD_KEYWORDS = {
  age:       { words: ['age', 'dob', 'birth', 'yr', 'year'],                     hint: 'Look for "Age:", "Age/Sex:", or "45 Years" near the top of the report.' },
  gender:    { words: ['gender', 'sex', 'male', 'female'],                        hint: 'Look for "Gender:", "Sex:", or "M" / "F" near the patient name.' },
  bilirubin: { words: ['bilirubin', 'bil', 'tbil', 't.bil', 't-bil'],             hint: 'Look for "Total Bilirubin", "T. Bilirubin", or "TBIL" on your LFT report.' },
  alt:       { words: ['alt', 'sgpt', 'alanine', 'gpt'],                          hint: 'Look for "ALT", "SGPT", or "Alanine Transaminase" on your LFT report.' },
  ast:       { words: ['ast', 'sgot', 'aspartate', 'got'],                        hint: 'Look for "AST", "SGOT", or "Aspartate Transaminase" on your LFT report.' },
  platelets: { words: ['platelet', 'plt', 'thrombocyte'],                         hint: 'Platelets appear on a CBC (blood count) report — not usually on an LFT report.' },
  albumin:   { words: ['albumin', 'alb', 's.albumin'],                            hint: 'Look for "Albumin" or "ALB" on your Liver Function Test (LFT) report.' },
  globulin:  { words: ['globulin', 'glob', 's.globulin'],                          hint: 'Look for "Globulin" or "GLOB" on your Liver Function Test (LFT) report.' },
};

function diagnoseField(field, rawText) {
  if (!rawText || rawText.trim().length < 40) {
    return {
      type: 'image',
      reason: `Only ${rawText?.trim().length ?? 0} characters extracted — the image may be too dark, blurry, or not a lab report.`,
      tip: 'Ensure good lighting, hold the camera steady, and keep the report flat.',
    };
  }

  const lower   = rawText.toLowerCase();
  const cfg     = FIELD_KEYWORDS[field];
  if (!cfg) return null;

  const keywordFound = cfg.words.some(w => lower.includes(w));

  if (!keywordFound) {
    const checked = cfg.words.map(w => `"${w}"`).join(', ');
    return {
      type: 'keyword',
      reason: `The system looked for labels like ${checked} but none were found in the extracted text. This happens if the report uses very unusual abbreviations or if that section of the paper was out of focus.`,
      tip: cfg.hint,
    };
  }

  // Keyword found — did a number appear near it?
  const nearbyNumRe = new RegExp(
    `(?:${cfg.words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})[^\\n]{0,60}([\\d]+\\.?[\\d]*)`,
    'i'
  );
  const numFound = nearbyNumRe.test(rawText);

  if (!numFound) {
    return {
      type: 'value',
      reason: 'The label was found but no number was detected nearby. The value may be on a different line or partially cut off.',
      tip: 'Ensure the entire row (label + value + unit) is visible in the image. Enter the value manually below.',
    };
  }

  return {
    type: 'range',
    reason: 'A number was found near the label but it did not fall within the valid range for this field — it may be a reference range, unit, or page number picked up by mistake.',
    tip: field === 'age'
      ? 'Age must be 18–100. If the report shows "45 Yrs" or "45/M", verify that value is correct and enter it manually.'
      : 'Verify the exact number shown on your report and enter it manually in the field below.',
  };
}

// Builds diagnostics for all fields not found after OCR
function buildOCRDiagnostics(rawText, extractedFields) {
  const missingFields = Object.keys(PATTERNS).filter(f => !extractedFields[f]);

  if (!rawText || rawText.trim().length === 0) {
    return [{
      field: 'all', label: 'All fields',
      type: 'image',
      reason: 'No text was extracted from the image at all.',
      tip: 'Try a clearer photo, or upload a PDF version of the report for best results.',
    }];
  }

  return missingFields
    .map(field => ({ field, label: PATTERNS[field]?.label ?? field, ...diagnoseField(field, rawText) }))
    .filter(d => d.reason);
}

// ─── Run Tesseract with a given PSM ──────────────────────────────────────────
async function runTesseractPSM(worker, processed, psm) {
  if (!worker) return '';
  try {
    const result = await worker.recognize(processed, {
      preserve_interword_spaces: '1',
      tessedit_pageseg_mode: String(psm),
    });
    return result?.data?.text || '';
  } catch (err) {
    console.warn(`[Tesseract PSM${psm}] failed:`, err.message);
    return '';
  }
}

// ─── Diagnostic Panel Component ─────────────────────────────────────────────
const DIAG_TYPE_STYLES = {
  image:   { icon: '📷', bg: 'bg-slate-50',  border: 'border-slate-200', text: 'text-slate-600',  badge: 'bg-slate-200 text-slate-600'   },
  keyword: { icon: '🔍', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-600'  },
  value:   { icon: '🔢', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-600'  },
  range:   { icon: '⚠️', bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    badge: 'bg-red-100 text-red-600'        },
};

function DiagnosticsPanel({ diagnostics, ocrText, imageType }) {
  const [open, setOpen] = React.useState(false);
  if (!diagnostics || diagnostics.length === 0) return null;

  const charCount  = ocrText?.trim().length ?? 0;
  const hasImage   = charCount > 0;

  return (
    <div className="mb-5 rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
        <span className="text-sm font-semibold text-slate-700 flex-1">
          Why weren't {diagnostics.length === 1 ? '1 field' : `${diagnostics.length} fields`} detected?
        </span>
        {hasImage && (
          <span className="text-[11px] text-slate-400 shrink-0">{charCount} characters read from image</span>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="p-4 space-y-3">
          {/* Image quality summary */}
          {imageType && (
            <div className="text-xs text-slate-500 mb-1">
              Image detected as: <strong className="capitalize">{imageType === 'screenshot' ? 'Screenshot / Digital' : imageType === 'whatsapp' ? 'WhatsApp image' : 'Camera photo / Scan'}</strong>
              {charCount < 200 && <span className="ml-2 text-orange-500 font-medium">⚠ Low text volume — image quality may be insufficient</span>}
            </div>
          )}

          {diagnostics.map((d, i) => {
            const s = DIAG_TYPE_STYLES[d.type] || DIAG_TYPE_STYLES.keyword;
            return (
              <div key={i} className={`rounded-lg border p-3 ${s.bg} ${s.border}`}>
                <div className="flex items-start gap-2">
                  <span className="text-base leading-none shrink-0 mt-0.5">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-700">{d.label}</span>
                      <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${s.badge}`}>
                        {d.type === 'image' ? 'Image Quality' : d.type === 'keyword' ? 'Label Not Found' : d.type === 'value' ? 'Value Missing' : 'Value Out of Range'}
                      </span>
                    </div>
                    <p className={`text-xs ${s.text} leading-relaxed`}>{d.reason}</p>
                    {d.tip && (
                      <p className="text-[11px] text-slate-500 mt-1.5 flex items-start gap-1">
                        <span className="shrink-0">💡</span>
                        <span>{d.tip}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="pt-1 text-[11px] text-slate-400">
            You can enter any missing value manually in the fields below, or re-upload a clearer image.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ConfidenceBadge({ score }) {
  const cls = score >= 85 ? 'bg-green-100 text-green-700 border-green-200'
    : score >= 70 ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
    : 'bg-red-100 text-red-700 border-red-200';
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cls}`}>
      {score}%
    </span>
  );
}

function OCRTipsPanel({ onClose }) {
  const tips = [
    { icon: '💡', text: 'Use daylight or a bright lamp — avoid harsh shadows' },
    { icon: '📐', text: 'Hold the report flat and parallel to the camera lens' },
    { icon: '🔍', text: 'Ensure all text is in frame and not cut off at edges' },
    { icon: '🚫', text: 'Avoid glare from laminated or glossy paper' },
    { icon: '✍️', text: 'Printed reports work best — handwritten values may fail' },
    { icon: '📱', text: 'Hold your phone steady or rest it on a flat surface' },
  ];
  return (
    <div className="card mb-6 border border-amber-200 bg-amber-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-amber-800 text-sm">Tips for best OCR results</span>
        </div>
        {onClose && <button onClick={onClose} className="text-amber-400 hover:text-amber-600"><X className="w-4 h-4" /></button>}
      </div>
      <ul className="grid sm:grid-cols-2 gap-1.5">
        {tips.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-amber-700">
            <span>{t.icon}</span><span>{t.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FieldRow({ label, unit, type, placeholder, step, value, extracted, onChange, onAutoDetect, showAutoDetect, abnormal, normalLabel, required, errorReason }) {
  const lowConf = extracted && extracted.confidence < 70;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase">
          {label}{unit ? <span className="text-slate-400 normal-case font-normal">({unit})</span> : null}
          {required
            ? <span className="ml-1 text-[9px] bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Required</span>
            : <span className="ml-1 text-[9px] bg-amber-100 text-amber-600 font-medium px-1.5 py-0.5 rounded-full">Optional</span>
          }
        </label>
        {extracted && <ConfidenceBadge score={extracted.confidence} />}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={type} step={step} value={value}
            onChange={e => onChange(e.target.value)}
            onWheel={e => e.target.blur()}
            className={`input-field w-full ${abnormal ? 'border-red-300 bg-red-50' : lowConf ? 'border-yellow-300 bg-yellow-50' : extracted ? 'border-green-300 bg-green-50' : ''}`}
            placeholder={placeholder}
          />
          {extracted && !lowConf && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 pointer-events-none" />}
          {lowConf && <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500 pointer-events-none" />}
        </div>
        {showAutoDetect && (
          <button onClick={onAutoDetect} className="p-2 rounded-lg border border-slate-200 hover:bg-liver-50 hover:border-liver-300 text-slate-400 hover:text-liver-600 transition-colors shrink-0" title={`Auto-detect ${label}`}>
            <Wand2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3">
        {abnormal && <p className="text-xs text-red-500 font-medium">⚠ Outside normal range</p>}
        {normalLabel && !abnormal && <p className="text-xs text-slate-400">{normalLabel}</p>}
        {extracted && <p className={`text-xs ${lowConf ? 'text-yellow-600 font-medium' : 'text-green-600'}`}>{lowConf ? '⚠ Low confidence — please verify manually' : `✓ Detected (raw: ${extracted.raw})`}</p>}
        {!extracted && errorReason && (
          <p className="text-[10px] text-amber-600 italic bg-amber-50 rounded px-1.5 py-1 flex items-start gap-1 mt-1 border border-amber-100">
            <AlertTriangle className="w-2.5 h-2.5 shrink-0 mt-0.5" />
            <span><b>Extraction Hint:</b> {errorReason}</span>
          </p>
        )}
        {!extracted && !value && required && !errorReason && <p className="text-xs text-red-400 font-medium">Required — not detected, please enter manually</p>}
        {!extracted && !value && !required && !errorReason && <p className="text-xs text-slate-400">Optional — leave blank if not on your report</p>}
      </div>
    </div>
  );
}

function ManualEntryForm({ values, onChange, onSubmit, onBack }) {
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!values.age || values.age < 18 || values.age > 100) e.age = 'Age must be 18–100';
    if (!values.gender) e.gender = 'Please select a gender';
    if (!values.bilirubin || values.bilirubin < 0.1 || values.bilirubin > 20) e.bilirubin = 'Must be 0.1–20.0 mg/dL';
    if (!values.alt || values.alt < 5 || values.alt > 500) e.alt = 'Must be 5–500 U/L';
    if (!values.ast || values.ast < 5 || values.ast > 500) e.ast = 'Must be 5–500 U/L';
    if (values.platelets && (values.platelets < 50 || values.platelets > 500))
      e.platelets = 'Must be 50–500 ×10³/μL if provided';
    if (values.albumin && (values.albumin < 1.0 || values.albumin > 8.0))
      e.albumin = 'Must be 1.0–8.0 g/dL if provided';
    if (values.globulin && (values.globulin < 1.0 || values.globulin > 8.0))
      e.globulin = 'Must be 1.0–8.0 g/dL if provided';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="card mb-6">
      <div className="flex items-center gap-2 mb-1">
        <ClipboardList className="w-5 h-5 text-liver-600" />
        <h2 className="font-semibold text-slate-700 text-lg">Manual Entry</h2>
      </div>
      <p className="text-xs text-slate-400 mb-5">Enter all values from your report. Age, Gender, Bilirubin, ALT, and AST are <strong>required</strong>. Platelets, Albumin, and Globulin are optional.</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase mb-1">
            Age <span className="text-slate-400 normal-case font-normal">(years)</span>
            <span className="ml-1 text-[9px] bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Required</span>
          </label>
          <input type="number" min="18" max="100" step="1" value={values.age ?? ''} onChange={e => onChange('age', e.target.value)} onWheel={e => e.target.blur()} placeholder="e.g. 45"
            className={`input-field w-full ${errors.age ? 'border-red-300 bg-red-50' : ''}`} />
          {errors.age && <p className="text-xs text-red-500 mt-1">{errors.age}</p>}
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase mb-1">
            Gender
            <span className="ml-1 text-[9px] bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Required</span>
          </label>
          <select value={values.gender ?? ''} onChange={e => onChange('gender', e.target.value)}
            className={`input-field w-full ${errors.gender ? 'border-red-300 bg-red-50' : ''}`}>
            <option value="">Select…</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          {errors.gender && <p className="text-xs text-red-500 mt-1">{errors.gender}</p>}
        </div>

        {Object.entries(MANUAL_RANGES).map(([key, cfg]) => {
          const rf  = RISK_FACTORS[key];
          const val = parseFloat(values[key]);
          const abn = !isNaN(val) && rf && (val < rf.min || val > rf.max);
          const isOptional = ['platelets', 'albumin', 'globulin'].includes(key);
          const isRequired = !isOptional;
          return (
            <div key={key}>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase mb-1">
                {cfg.label} <span className="text-slate-400 normal-case font-normal">({cfg.unit})</span>
                {isRequired
                  ? <span className="ml-1 text-[9px] bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Required</span>
                  : <span className="ml-1 text-[9px] bg-amber-100 text-amber-600 font-medium px-1.5 py-0.5 rounded-full">Optional</span>
                }
              </label>
              <input type="number" min={cfg.min} max={cfg.max} step={cfg.step} value={values[key] ?? ''} onChange={e => onChange(key, e.target.value)}
                placeholder={isOptional ? 'Leave blank if not on report' : cfg.placeholder}
                className={`input-field w-full ${errors[key] ? 'border-red-300 bg-red-50' : abn ? 'border-orange-300 bg-orange-50' : ''}`} />
              {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
              {!errors[key] && rf && <p className={`text-xs mt-1 ${abn ? 'text-orange-500 font-medium' : 'text-slate-400'}`}>
                {abn ? '⚠ Outside normal · ' : ''}Normal: {rf.min}–{rf.max} {rf.unit}
              </p>}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 mt-6">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
          🧳 <strong>Missing fields?</strong> That is normal for some reports (e.g. platelets might be missing on an LFT).
          Leave optional fields blank — the system will automatically use the <strong>LFT-Only Formula</strong> to calculate your risk.
        </div>
        <div className="flex gap-3">
          <button onClick={() => { if (validate()) onSubmit(); }} className="btn-primary flex items-center gap-2">
            Confirm &amp; Continue <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={onBack} className="btn-secondary flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Upload
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DynamicImageUpload() {
  const navigate             = useNavigate();
  const { setExtractedData } = usePatientData();
  const videoRef             = useRef(null);
  const canvasRef            = useRef(null);
  const streamRef            = useRef(null);
  const workersRef           = useRef([]); // Persistent worker pool

  const [uploadedFiles,   setUploadedFiles]  = useState([]);
  const [image,           setImage]          = useState(null);
  const [processedImg,    setProcessedImg]   = useState(null);
  const [ocrText,         setOcrText]        = useState('');
  const [ocrStep,         setOcrStep]        = useState(null);
  const [ocrProgress,     setProgress]       = useState(0);
  const [ocrRunning,      setRunning]        = useState(false);
  const [ocrFailed,       setOcrFailed]      = useState(false);
  const [ocrFailMsg,      setOcrFailMsg]     = useState('');
  const [extracted,       setExtracted]      = useState({});
  const [formValues,      setFormValues]     = useState({});
  const [showRaw,         setShowRaw]        = useState(false);
  const [showTips,        setShowTips]       = useState(false);
  const [cameraActive,    setCamera]         = useState(false);
  const [cameraError,     setCameraError]    = useState(null);
  const [showPreview,     setShowPreview]    = useState(false);
  const [manualMode,      setManualMode]     = useState(false);
  const [pdfConverting,   setPdfConverting]  = useState(false);
  const [imageType,       setImageType]      = useState(null);
  const [diagnostics,     setDiagnostics]    = useState([]);

  // ── Worker Pool Management ────────────────────────────────────────────────
  const initWorkers = useCallback(async () => {
    if (workersRef.current.length >= 2) return workersRef.current;
    setOcrStep('loading workers');
    const w1 = await Tesseract.createWorker('eng');
    const w2 = await Tesseract.createWorker('eng');
    workersRef.current = [w1, w2];
    return workersRef.current;
  }, []);

  const terminateWorkers = useCallback(async () => {
    await Promise.all(workersRef.current.map(w => w.terminate()));
    workersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      terminateWorkers();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [terminateWorkers]);

  // ── OCR a single image src with dual PSM passes ───────────────────────────
  // psm=6 is best for table / screenshot layouts (multi-column block)
  // psm=4 is best for single-column text (PDFs, scanned camera images)
  // For both screenshot and whatsapp we use psm 6 first; for camera/pdf we use 4 first.
  const ocrImageSrc = useCallback(async (imgSrc, imgType, onProgress) => {
    const preprocessed = await preprocessImage(imgSrc, imgType);
    onProgress(20);

    const workers = await initWorkers();
    onProgress(40);

    // Choose PSM order based on detected image type
    const isScreenshot = imgType === 'screenshot' || imgType === 'whatsapp';
    const psmPrimary   = isScreenshot ? 6 : 4;
    const psmFallback  = isScreenshot ? 4 : 6;

    // Run BOTH passes in PARALLEL for 2x speed
    const [text1, text2] = await Promise.all([
      runTesseractPSM(workers[0], preprocessed.dataUrl, psmPrimary),
      runTesseractPSM(workers[1], preprocessed.dataUrl, psmFallback)
    ]);
    onProgress(90);

    // Merge: combine both texts and extract separately, keep best per field
    const vals1 = text1 ? extractValues(text1) : {};
    const vals2 = text2 ? extractValues(text2) : {};
    const merged = mergeExtracted(vals1, vals2);

    const combinedText = [text1, text2].filter(Boolean).join('\n\n---PSM-PASS-2---\n\n');
    return { vals: merged, text: combinedText, preprocessed };
  }, []);

  // ── OCR a single uploaded File ─────────────────────────────────────────────
  const ocrFile = useCallback(async (file, onProgress) => {
    let imgSources;
    if (file.type === 'application/pdf') {
      setPdfConverting(true);
      setOcrStep('pdf');
      onProgress(5);
      const pages = await pdfToImage(file);
      setPdfConverting(false);
      imgSources = pages; // [{ dataUrl, type:'pdf' }]
    } else {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      // Detect type from the raw image (before preprocessing)
      // We pass null so preprocessImage auto-detects
      imgSources = [{ dataUrl, type: null }];
    }

    let allText = '';
    let mergedVals = {};
    let firstImgSrc = null;
    let firstProcessed = null;

    const totalPages = imgSources.length;

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const { dataUrl: imgSrc, type: srcType } = imgSources[pageIdx];
      setOcrStep('preprocess');
      onProgress(10 + Math.round((pageIdx / totalPages) * 20));

      try {
        const pageProgress = p => onProgress(10 + Math.round(((pageIdx + p / 100) / totalPages) * 80));
        const { vals, text, preprocessed } = await ocrImageSrc(imgSrc, srcType, pageProgress);

        if (pageIdx === 0) {
          firstImgSrc = imgSrc;
          firstProcessed = preprocessed.dataUrl;
          setImageType(preprocessed.type);
        }

        if (text) {
          allText += (allText ? '\n---Page ' + (pageIdx + 1) + '---\n' : '') + text;
          mergedVals = mergeExtracted(mergedVals, vals);
        }
      } catch (err) {
        console.warn(`OCR error on page ${pageIdx + 1}:`, err);
      }
    }

    setOcrStep('parse'); onProgress(95);
    onProgress(100);
    return { vals: mergedVals, text: allText, imgSrc: firstImgSrc, processed: firstProcessed };
  }, [ocrImageSrc]);

  // ── Process multiple uploaded files ───────────────────────────────────────
  const handleFiles = useCallback(async (files) => {
    if (!files.length) return;
    setExtracted({}); setFormValues({}); setOcrText('');
    setOcrFailed(false); setOcrFailMsg(''); setManualMode(false);
    setRunning(true); setProgress(0);

    const fileList = files.map(f => ({ name: f.name, status: 'pending', extracted: {} }));
    setUploadedFiles(fileList);

    let mergedExtracted = {};
    let allText = '';
    let firstImgSrc = null;
    let firstProcessed = null;
    let anySuccess = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadedFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'processing' } : f));
      try {
        const fileProgress = p => setProgress(Math.round((i / files.length) * 100 + p / files.length));
        const { vals, text, imgSrc, processed } = await ocrFile(file, fileProgress);

        if (i === 0) { firstImgSrc = imgSrc; firstProcessed = processed; }
        allText += (allText ? '\n---\n' : '') + text;
        mergedExtracted = mergeExtracted(mergedExtracted, vals);

        setUploadedFiles(prev => prev.map((f, idx) => idx === i
          ? { ...f, status: 'done', extracted: vals, count: Object.keys(vals).length }
          : f));
        anySuccess = true;
      } catch (err) {
        console.error(`OCR error on ${file.name}:`, err);
        setUploadedFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error' } : f));
      }
    }

    setImage(firstImgSrc);
    setProcessedImg(firstProcessed);
    setOcrText(allText);
    setExtracted(mergedExtracted);

    const form = {};
    for (const [k, v] of Object.entries(mergedExtracted)) form[k] = v.value;
    setFormValues(form);
    setProgress(100);

    // Run diagnostics for missing fields
    const diags = buildOCRDiagnostics(allText, mergedExtracted);
    setDiagnostics(diags);

    const count   = Object.keys(mergedExtracted).length;
    const lowConf = Object.values(mergedExtracted).filter(v => v.confidence < 70).length;

    if (!anySuccess || count === 0) {
      toast.error('No values detected. Please fill manually.');
      setManualMode(true);
    } else {
      const missingRequired = REQUIRED_FIELDS.filter(f => !mergedExtracted[f]);
      toast.success(
        `Extracted ${count} field${count !== 1 ? 's' : ''}${missingRequired.length ? ` · ${missingRequired.length} required field(s) missing` : ''}${lowConf ? ` · ${lowConf} low-confidence` : ''}`
      );
    }

    setOcrStep(null); setRunning(false);
  }, [ocrFile]);

  // ── Camera single-shot OCR ─────────────────────────────────────────────────
  const runOCR = useCallback(async (src) => {
    setRunning(true); setProgress(0); setOcrFailed(false); setOcrFailMsg('');
    setOcrText(''); setManualMode(false); setUploadedFiles([]);
    try {
      setOcrStep('load'); await new Promise(r => setTimeout(r, 150));
      setOcrStep('preprocess'); setProgress(10);

      // Camera images: use 'camera' type for full pipeline
      const { vals, text, preprocessed } = await ocrImageSrc(src, 'camera', p => setProgress(p));
      setProcessedImg(preprocessed.dataUrl);
      setImageType(preprocessed.type);

      setOcrStep('parse'); setProgress(90);
      setOcrText(text);
      setExtracted(vals);

      const form = {};
      for (const [k, v] of Object.entries(vals)) form[k] = v.value;
      setFormValues(form);
      setProgress(100);

      // Run diagnostics for missing fields
      const diags = buildOCRDiagnostics(text, vals);
      setDiagnostics(diags);

      const count   = Object.keys(vals).length;
      const lowConf = Object.values(vals).filter(v => v.confidence < 70).length;

      if (count === 0) {
        toast.error('No values detected. Fill manually or try a clearer photo.');
        setManualMode(true);
      } else {
        const missingRequired = REQUIRED_FIELDS.filter(f => !vals[f]);
        toast.success(
          `Extracted ${count} value${count !== 1 ? 's' : ''}${missingRequired.length ? ` · ${missingRequired.length} required missing` : ''}${lowConf ? ` · ${lowConf} low-confidence` : ''}`
        );
      }
    } catch (e) {
      console.error('OCR error:', e);
      const msg = 'OCR failed — please fill values manually.';
      setOcrFailed(true); setOcrFailMsg(msg); setManualMode(true); toast.error(msg);
    }
    setOcrStep(null); setRunning(false);
  }, [ocrImageSrc]);

  const onDrop = useCallback(async (accepted, rejected) => {
    if (rejected.length > 0) {
      const tooLarge = rejected.filter(f => f.errors?.some(e => e.code === 'file-too-large'));
      if (tooLarge.length > 0) toast.error(`${tooLarge.length} file(s) exceed 20 MB and were skipped.`);
    }
    if (!accepted.length) return;
    await handleFiles(accepted);
  }, [handleFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: undefined,
    maxSize: 20 * 1024 * 1024,
    multiple: true,
  });

  const resetImage = () => {
    setImage(null); setProcessedImg(null); setOcrText('');
    setExtracted({}); setFormValues({}); setOcrFailed(false);
    setOcrFailMsg(''); setManualMode(false); setUploadedFiles([]);
    setImageType(null); setDiagnostics([]);
  };

  // ── Camera ─────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    setCameraError(null);
    try {
      // Try high-res rear camera first; fall back progressively
      let stream = null;
      const attempts = [
        {
          video: {
            facingMode: { ideal: 'environment' },
            width:  { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        {
          video: { facingMode: { ideal: 'environment' } },
        },
        {
          video: true,
        },
      ];

      for (const constraints of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch {
          // try next fallback
        }
      }

      if (!stream) throw new Error('Camera unavailable after fallbacks');

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current.play().catch(() => {});
        setCamera(true);
      }
    } catch (err) {
      const msg =
        err.name === 'NotAllowedError'  ? 'Camera permission denied. Please allow camera access in your browser settings.'
        : err.name === 'NotFoundError'  ? 'No camera found on this device. Please upload a photo instead.'
        : err.name === 'NotReadableError' ? 'Camera is already in use by another app. Close other apps and try again.'
        : 'Camera unavailable: ' + err.message;
      setCameraError(msg); toast.error(msg);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null; setCamera(false);
  };

  const capture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    if (!v.videoWidth || !v.videoHeight) {
      toast.error('Camera not ready — please wait a moment and try again.');
      return;
    }
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width  = v.videoWidth;
    canvasRef.current.height = v.videoHeight;
    ctx.drawImage(v, 0, 0);
    const url = canvasRef.current.toDataURL('image/jpeg', 0.95);
    stopCamera(); setImage(url); setExtracted({}); setFormValues({});
    setUploadedFiles([]);
    await runOCR(url);
  };

  const update = (key, val) => setFormValues(p => ({ ...p, [key]: val }));

  const autoDetectField = async (key) => {
    if (!ocrText) { toast('Upload an image first'); return; }
    // For age, use header-zone extractor
    if (key === 'age') {
      const result = extractAge(ocrText);
      if (result) { update(key, result.value); toast.success(`Age detected: ${result.value}`); return; }
      toast.error('Could not auto-detect Age');
      return;
    }
    const def = PATTERNS[key];
    const flat = ocrText.replace(/\n+/g, ' ').replace(/\s{3,}/g, ' ').trim();
    for (const re of def.patterns) {
      const m = ocrText.match(re) || flat.match(re);
      if (m) {
        const val = def.normalize(m[1] || m[2]);
        if (def.validate(val)) { update(key, val); toast.success(`${def.label} detected: ${val}`); return; }
      }
    }
    toast.error(`Could not auto-detect ${def.label}`);
  };

  // ── Continue validation — enforce all 5 required fields ────────────────────
  const handleContinue = () => {
    const missing = REQUIRED_FIELDS.filter(f => {
      const v = formValues[f];
      return v === undefined || v === null || String(v).trim() === '';
    });

    if (missing.length > 0) {
      const labels = missing.map(f => REQUIRED_LABELS[f]).join(', ');
      toast.error(`Missing required field${missing.length > 1 ? 's' : ''}: ${labels}. Please fill all required values.`, { duration: 4000 });
      return;
    }

    setExtractedData(formValues);
    navigate('/dynamic/survey');
  };

  const detectedCount  = Object.keys(extracted).length;
  const totalFields    = Object.keys(PATTERNS).length;
  const missingRequired = REQUIRED_FIELDS.filter(f => !formValues[f] || String(formValues[f]).trim() === '');
  const lowConfCount   = Object.values(extracted).filter(v => v.confidence < 70).length;
  const hasEnough      = missingRequired.length === 0;
  const currentStepIdx = OCR_STEPS.findIndex(s => s.id === ocrStep);
  const hasFiles       = uploadedFiles.length > 0;
  const showOCRForm    = !manualMode && (detectedCount > 0 || (!hasFiles && !image && !ocrRunning));

  const visibleSteps = ocrStep === 'pdf' || pdfConverting
    ? OCR_STEPS
    : OCR_STEPS.filter(s => s.id !== 'pdf');

  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-8">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-liver-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
        <span className="font-medium text-slate-700 text-sm">{manualMode ? 'Enter Blood Values' : 'Upload Blood Report'}</span>
      </div>
      <div className="flex-1 h-0.5 bg-slate-200 mx-2" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center text-sm font-bold">2</div>
        <span className="text-slate-400 text-sm">Lifestyle Survey</span>
      </div>
    </div>
  );

  // ── Manual Mode ────────────────────────────────────────────────────────────
  if (manualMode) {
    return (
      <div className="max-w-3xl mx-auto animate-slide-up pb-12">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
        <StepIndicator />
        <h1 className="text-2xl font-display font-bold text-slate-800 mb-1">Enter Your Blood Values</h1>
        <p className="text-slate-500 text-sm mb-6">Fill in all required fields from your blood report. These values are used to calculate your liver cancer risk.</p>

        {ocrFailed && (
          <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-2 text-xs text-amber-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <div>
              OCR could not read your image. Enter the values manually, or{' '}
              <button onClick={resetImage} className="underline font-medium hover:text-amber-900">try another photo</button>.
            </div>
          </div>
        )}
        <ManualEntryForm
          values={formValues}
          onChange={update}
          onSubmit={() => {
            setExtractedData(formValues);
            navigate('/dynamic/survey');
          }}
          onBack={() => { setManualMode(false); resetImage(); }}
        />
      </div>
    );
  }

  // ── Upload / OCR Mode ──────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto animate-slide-up pb-12">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>
      <StepIndicator />
      <h1 className="text-2xl font-display font-bold text-slate-800 mb-1">Upload Your Blood Report</h1>
      <p className="text-slate-500 text-sm mb-3">Our OCR engine auto-extracts biomarker values from Indian lab reports — PDFs, screenshots, WhatsApp images, or camera photos.</p>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 flex items-start gap-2">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
        <span>
          <strong>Required fields:</strong> Age, Gender, Total Bilirubin, ALT/SGPT, AST/SGOT.{' '}
          <strong>Optional:</strong> Platelets (CBC only — leave blank for LFT-only reports).
        </span>
      </div>

      <button onClick={() => setShowTips(p => !p)} className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 font-medium mb-5">
        <Lightbulb className="w-3.5 h-3.5" />{showTips ? 'Hide tips' : 'Photo tips for better OCR'}
      </button>
      {showTips && <OCRTipsPanel onClose={() => setShowTips(false)} />}

      {/* Camera view */}
      {cameraActive ? (
        <div className="card mb-6">
          <div className="relative mb-3">
            <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl bg-black" />
            <div className="absolute inset-4 border-2 border-white/60 rounded-xl pointer-events-none flex items-end justify-center pb-3">
              <span className="text-white/90 text-xs font-medium bg-black/40 px-3 py-1 rounded-full">
                Position report within frame · keep edges visible
              </span>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-3">
            <button onClick={capture} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Camera className="w-4 h-4" /> Capture Photo
            </button>
            <button onClick={stopCamera} className="btn-secondary flex items-center gap-2 px-4">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="card mb-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragActive ? 'border-liver-400 bg-liver-50' : 'border-slate-200 hover:border-liver-300 hover:bg-slate-50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              {pdfConverting
                ? <FileText className="w-10 h-10 text-red-400 animate-pulse" />
                : <FileImage className={`w-10 h-10 ${isDragActive ? 'text-liver-500' : 'text-slate-300'}`} />
              }
              <div>
                <p className="font-semibold text-slate-600">
                  {isDragActive ? 'Drop files here!' : pdfConverting ? 'Converting PDF…' : 'Drag & drop one or more files'}
                </p>
                <p className="text-sm text-slate-400 mt-0.5">Images, PDFs, screenshots — any format · Max 20 MB each</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-400">
                <span className="px-2 py-1 bg-slate-100 rounded-full">JPG / PNG / WebP</span>
                <span className="px-2 py-1 bg-slate-100 rounded-full">PDF reports</span>
                <span className="px-2 py-1 bg-slate-100 rounded-full">Screenshots</span>
                <span className="px-2 py-1 bg-slate-100 rounded-full">WhatsApp images</span>
              </div>
            </div>
          </div>

          {/* Uploaded file list */}
          {uploadedFiles.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {uploadedFiles.map((f, i) => (
                <li key={i} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
                  f.status === 'done'         ? 'bg-green-50  border-green-200  text-green-700'
                  : f.status === 'error'      ? 'bg-red-50    border-red-200    text-red-600'
                  : f.status === 'processing' ? 'bg-blue-50   border-blue-200   text-blue-700'
                  :                            'bg-slate-50   border-slate-200   text-slate-500'
                }`}>
                  <span className="text-base leading-none">
                    {f.status === 'done' ? '✅' : f.status === 'error' ? '❌' : f.status === 'processing' ? '⏳' : '🕐'}
                  </span>
                  <span className="flex-1 truncate font-medium">{f.name}</span>
                  {f.status === 'done'       && <span className="shrink-0 font-semibold">{f.count ?? 0} field{f.count !== 1 ? 's' : ''} found</span>}
                  {f.status === 'processing' && <span className="shrink-0">Processing…</span>}
                  {f.status === 'error'      && <span className="shrink-0">OCR failed</span>}
                  {f.status === 'pending'    && <span className="shrink-0">Queued</span>}
                </li>
              ))}
            </ul>
          )}

          {/* Image type badge */}
          {imageType && !ocrRunning && (
            <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
              <span className="px-2 py-0.5 bg-slate-100 rounded-full text-slate-500 capitalize">
                {imageType === 'screenshot' ? '🖥️ Screenshot' : imageType === 'whatsapp' ? '💬 WhatsApp Image' : '📷 Camera / Scan'}
              </span>
              <span>detected — preprocessing pipeline adjusted accordingly</span>
            </div>
          )}

          {/* First-image preview */}
          {image && uploadedFiles.length <= 1 && (
            <div className="mt-3 flex items-center gap-3">
              <div className="relative shrink-0">
                <img
                  src={showPreview && processedImg ? processedImg : image}
                  alt="Uploaded report"
                  className="h-20 rounded-lg shadow object-contain border border-slate-200"
                />
                {processedImg && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setShowPreview(p => !p); }}
                    className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                    title="Toggle OCR preview"
                  >
                    {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                )}
              </div>
              {processedImg && (
                <p className="text-[11px] text-slate-400">
                  {showPreview ? 'Preprocessed (OCR) view' : 'Click 👁 to see OCR preprocessing'}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button onClick={startCamera} className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm py-2">
              <Camera className="w-4 h-4" /> Use Camera
            </button>
            {(uploadedFiles.length > 0 || image) && !ocrRunning && (
              <button
                onClick={resetImage}
                className="flex items-center gap-1.5 px-4 text-sm text-slate-500 hover:text-red-600 border border-slate-200 rounded-xl hover:border-red-200 hover:bg-red-50 transition-colors font-medium"
              >
                <RotateCcw className="w-4 h-4" /> Clear
              </button>
            )}
            <button
              onClick={() => setManualMode(true)}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-liver-700 font-medium py-2 border border-slate-200 rounded-xl hover:bg-liver-50 hover:border-liver-300 transition-colors"
            >
              <ClipboardList className="w-4 h-4" /> Enter Values Manually
            </button>
          </div>

          {cameraError && (
            <p className="mt-3 text-xs text-red-600 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {cameraError}
            </p>
          )}
        </div>
      )}

      {/* OCR progress */}
      {(ocrRunning || pdfConverting) && (
        <div className="card mb-6">
          <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
            {visibleSteps.map((step, i) => {
              const done    = currentStepIdx > visibleSteps.indexOf(step);
              const current = ocrStep === step.id;
              return (
                <div key={step.id} className="flex items-center gap-1 min-w-0">
                  <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap transition-colors ${
                    done ? 'bg-green-100 text-green-700' : current ? 'bg-liver-100 text-liver-700 animate-pulse' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <span>{step.icon}</span>
                    <span className="hidden sm:inline">{step.label.replace('…', '')}</span>
                  </div>
                  {i < visibleSteps.length - 1 && <div className={`w-4 h-0.5 shrink-0 ${done ? 'bg-green-300' : 'bg-slate-200'}`} />}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mb-2">
            <LoadingSpinner size="sm" />
            <span className="font-medium text-slate-700 text-sm">
              {OCR_STEPS.find(s => s.id === ocrStep)?.label ?? 'Processing…'}
            </span>
            <span className="ml-auto text-sm font-semibold text-liver-600">{ocrProgress}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-liver-500 rounded-full transition-all duration-500" style={{ width: ocrProgress + '%' }} />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Running dual OCR passes for maximum field detection…</p>
        </div>
      )}

      {/* OCR failed banner */}
      {ocrFailed && !ocrRunning && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 text-sm">OCR could not read the image</p>
            <p className="text-xs text-red-600 mt-1">
              Common causes: poor lighting, blurry photo, or an unusual report format.
            </p>
            <div className="flex gap-2 mt-3">
              <button onClick={resetImage} className="flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Try another photo
              </button>
              <button onClick={() => setManualMode(true)} className="text-xs font-medium text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors">
                Enter manually
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detection summary banner */}
      {!ocrRunning && !ocrFailed && detectedCount > 0 && (
        <div className={`mb-4 p-3 rounded-xl border flex items-start gap-2 text-xs ${
          missingRequired.length === 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          {missingRequired.length === 0
            ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>
            {missingRequired.length === 0
              ? 'All required fields extracted successfully.'
              : `${detectedCount} of ${totalFields} fields detected. Missing required: ${missingRequired.map(f => REQUIRED_LABELS[f]).join(', ')} — please fill manually below.`}
            {lowConfCount > 0 && <> &nbsp;·&nbsp; <strong>{lowConfCount} low-confidence</strong> value{lowConfCount !== 1 ? 's' : ''} flagged.</>}
          </span>
        </div>
      )}

      {/* OCR Diagnostics Panel — explains missing fields */}
      {!ocrRunning && !ocrFailed && diagnostics.length > 0 && (
        <DiagnosticsPanel
          diagnostics={diagnostics}
          ocrText={ocrText}
          imageType={imageType}
        />
      )}

      {/* Raw OCR debug */}
      {ocrText && !ocrRunning && (
        <div className="mb-5">
          <button onClick={() => setShowRaw(p => !p)} className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showRaw ? 'rotate-180' : ''}`} />
            {showRaw ? 'Hide' : 'Show'} raw OCR text (debug)
          </button>
          {showRaw && (
            <div className="mt-2 bg-slate-800 text-slate-200 text-xs rounded-xl p-4 max-h-44 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
              {ocrText}
            </div>
          )}
        </div>
      )}

      {/* Editable extracted values form */}
      {showOCRForm && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-liver-600" />
              <h2 className="font-semibold text-slate-700">
                {detectedCount === 0 ? 'Enter Values' : 'Review & Edit Extracted Values'}
              </h2>
            </div>
            {detectedCount > 0 && <span className="text-xs text-slate-400">{detectedCount}/{totalFields} auto-detected</span>}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Age */}
            <FieldRow
              label="Age" unit="years" type="number" placeholder="e.g. 45" step="1"
              value={formValues.age ?? ''} extracted={extracted.age}
              onChange={v => update('age', v)}
              onAutoDetect={() => autoDetectField('age')}
              showAutoDetect={!!ocrText} abnormal={false} normalLabel=""
              required={true}
              errorReason={diagnostics.find(d => d.field === 'age')?.reason}
            />

            {/* Gender */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase mb-1">
                Gender
                <span className="ml-1 text-[9px] bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Required</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={formValues.gender ?? ''}
                  onChange={e => update('gender', e.target.value)}
                  className="input-field flex-1"
                >
                  <option value="">Select…</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {ocrText && (
                  <button
                    onClick={() => autoDetectField('gender')}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-liver-50 hover:border-liver-300 text-slate-400 hover:text-liver-600 transition-colors"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {extracted.gender
                ? <p className="text-xs text-green-600 mt-1">✓ Detected: {extracted.gender.raw}</p>
                : (
                  <div className="mt-1">
                    <p className="text-xs text-red-400 font-medium">Required — not detected</p>
                    {diagnostics.find(d => d.field === 'gender') && (
                      <p className="text-[10px] text-amber-600 italic bg-amber-50 rounded px-1.5 py-1 flex items-start gap-1 mt-1 border border-amber-100">
                        <AlertTriangle className="w-2.5 h-2.5 shrink-0 mt-0.5" />
                        <span><b>Extraction Hint:</b> {diagnostics.find(d => d.field === 'gender')?.reason}</span>
                      </p>
                    )}
                  </div>
                )}
            </div>

            {/* Biomarker fields */}
            {[
              { key: 'bilirubin', step: '0.01', required: true },
              { key: 'alt',       step: '1',    required: true },
              { key: 'ast',       step: '1',    required: true },
              { key: 'platelets', step: '1',    required: false },
              { key: 'albumin',   step: '0.1',  required: false },
              { key: 'globulin',  step: '0.1',  required: false },
            ].map(({ key, step, required }) => {
              const rf      = RISK_FACTORS[key];
              const val     = parseFloat(formValues[key]);
              const abnormal = !isNaN(val) && (val < rf.min || val > rf.max);
              return (
                <FieldRow
                  key={key}
                  label={rf.label} unit={rf.unit} type="number"
                  placeholder={`${rf.min}–${rf.max}`} step={step}
                  value={formValues[key] ?? ''} extracted={extracted[key]}
                  onChange={v => update(key, v)}
                  onAutoDetect={() => autoDetectField(key)}
                  showAutoDetect={!!ocrText}
                  abnormal={abnormal}
                  normalLabel={`Normal: ${rf.min}–${rf.max} ${rf.unit}`}
                  required={required}
                  errorReason={diagnostics.find(d => d.field === key)?.reason}
                />
              );
            })}
          </div>

          <div className="mt-5 space-y-2">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                <strong>Platelets not on your report?</strong> That is normal for standalone LFT reports.
                Leave it blank — the system will use the <strong>LFT-Only Bayesian Formula</strong> automatically.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                <strong>Low confidence badge?</strong> The value was detected but may be inaccurate.
                Always verify against your original report before continuing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Missing required fields warning */}
      {!ocrRunning && missingRequired.length > 0 && detectedCount > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Cannot continue:</strong> Please fill in the required field{missingRequired.length > 1 ? 's' : ''}: <strong>{missingRequired.map(f => REQUIRED_LABELS[f]).join(', ')}</strong>.
          </span>
        </div>
      )}

      {/* Continue / re-run buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleContinue}
          disabled={!hasEnough || ocrRunning}
          className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue to Survey <ArrowRight className="w-4 h-4" />
        </button>
        {image && !ocrRunning && (
          <button onClick={() => runOCR(image)} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" /> Re-run OCR
          </button>
        )}
      </div>

      {!hasEnough && !ocrRunning && detectedCount > 0 && (
        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> All 5 required fields (Age, Gender, Bilirubin, ALT, AST) must be filled to continue.
        </p>
      )}
    </div>
  );
}
