// src/pages/StaticUpload.jsx
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { Upload, FileSpreadsheet, Download, ArrowLeft, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { usePatientData } from '../context/PatientDataContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const REQUIRED_COLS = ['age', 'gender', 'bilirubin', 'alt', 'ast', 'platelets', 'alcohol', 'smoking', 'bmi', 'hbv', 'hcv', 'diabetes'];

function downloadTemplate() {
  const headers = REQUIRED_COLS;
  const rows = [
    [45, 'Male',   1.1, 52, 35, 220, 'Never',      'Never',  22.5, 'No', 'No', 'No'],
    [62, 'Female', 2.3, 78, 65, 140, 'Regularly',  'Former', 28.1, 'Yes','No', 'Type 2'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Patients');
  XLSX.writeFile(wb, 'liver_risk_template.csv');
}

function validateRow(row, idx) {
  const errs = [];
  if (!row.age || isNaN(row.age) || row.age < 1 || row.age > 120)      errs.push('Invalid age');
  if (!row.gender || !['male','female','m','f'].includes(String(row.gender).toLowerCase())) errs.push('Invalid gender');
  return { row: idx + 2, errors: errs, valid: errs.length === 0 };
}

export default function StaticUpload() {
  const navigate = useNavigate();
  const { setProcessedData } = usePatientData();

  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState([]);
  const [headers, setHeaders]   = useState([]);
  const [totalRows, setTotal]   = useState(0);
  const [validation, setValid]  = useState(null);
  const [parsing, setParsing]   = useState(false);
  const [processing, setProc]   = useState(false);
  const [missingCols, setMiss]  = useState([]);

  const processFile = useCallback(async (f) => {
    setParsing(true);
    try {
      const buf  = await f.arrayBuffer();
      const wb   = XLSX.read(buf);
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (data.length === 0) { toast.error('File is empty'); setParsing(false); return; }

      const cols = Object.keys(data[0]).map(k => k.toLowerCase().trim());
      const miss = REQUIRED_COLS.filter(rc => !cols.some(c => c.includes(rc)));
      setMiss(miss);

      // Normalise keys
      const normalised = data.map(row => {
        const out = {};
        Object.keys(row).forEach(k => { out[k.toLowerCase().trim()] = row[k]; });
        return out;
      });

      const validations = normalised.map((r, i) => validateRow(r, i));
      const validRows   = validations.filter(v => v.valid).length;

      setHeaders(Object.keys(data[0]));
      setPreview(normalised.slice(0, 5));
      setTotal(data.length);
      setValid({ total: data.length, valid: validRows, invalid: data.length - validRows, details: validations.filter(v => !v.valid) });
      setFile(f);

      // Store all data
      setProcessedData(normalised);
    } catch (e) {
      toast.error('Failed to parse file: ' + e.message);
    }
    setParsing(false);
  }, [setProcessedData]);

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) { toast.error('Invalid file type or size > 100MB'); return; }
    if (accepted.length > 0) processFile(accepted[0]);
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
    maxSize: 100 * 1024 * 1024,
    multiple: false,
  });

  const handleProcess = () => {
    if (!file) { toast.error('Please upload a file first'); return; }
    if (missingCols.length > 0) { toast.error(`Missing columns: ${missingCols.join(', ')}`); return; }
    setProc(true);
    setTimeout(() => { navigate('/static/results'); }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-medical-100 rounded-xl flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-medical-600" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-slate-800">Static Analysis Module</h1>
            <p className="text-slate-500 text-sm">Upload patient dataset to compare all 9 techniques</p>
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div className="card mb-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
            isDragActive ? 'border-medical-400 bg-medical-50' : 'border-slate-200 hover:border-medical-300 hover:bg-slate-50'
          }`}
        >
          <input {...getInputProps()} />
          {parsing ? (
            <LoadingSpinner size="lg" text="Parsing file..." />
          ) : file ? (
            <div className="flex flex-col items-center gap-2">
              <FileSpreadsheet className="w-10 h-10 text-medical-500" />
              <p className="font-semibold text-slate-700">{file.name}</p>
              <p className="text-sm text-slate-400">{totalRows} rows detected · click or drag to replace</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className={`w-10 h-10 ${isDragActive ? 'text-medical-500' : 'text-slate-300'}`} />
              <div>
                <p className="font-semibold text-slate-600">{isDragActive ? 'Drop it here!' : 'Drag & drop your dataset'}</p>
                <p className="text-sm text-slate-400 mt-1">CSV, XLSX, or XLS · Max 100 MB</p>
              </div>
            </div>
          )}
        </div>

        {/* Template download */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
          <p className="text-sm text-slate-500">Need a template?</p>
          <button onClick={downloadTemplate} className="flex items-center gap-2 text-sm text-medical-600 hover:text-medical-800 font-medium transition-colors">
            <Download className="w-4 h-4" /> Download Sample CSV
          </button>
        </div>
      </div>

      {/* Missing columns warning */}
      {missingCols.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-semibold text-sm">Missing required columns</p>
            <p className="text-red-600 text-sm">{missingCols.join(', ')}</p>
          </div>
        </div>
      )}

      {/* Validation summary */}
      {validation && (
        <div className="card mb-6">
          <h3 className="font-semibold text-slate-700 mb-3">Validation Summary</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-slate-700">{validation.total}</p>
              <p className="text-xs text-slate-500">Total Rows</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{validation.valid}</p>
              <p className="text-xs text-green-600">Valid</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-500">{validation.invalid}</p>
              <p className="text-xs text-red-500">Invalid</p>
            </div>
          </div>
          {validation.invalid > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-red-600 font-medium flex items-center gap-1">
                <ChevronDown className="w-4 h-4" /> View {validation.invalid} invalid rows
              </summary>
              <ul className="mt-2 space-y-1 pl-4">
                {validation.details.map(d => (
                  <li key={d.row} className="text-red-500">Row {d.row}: {d.errors.join(', ')}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Preview table */}
      {preview.length > 0 && (
        <div className="card mb-6 overflow-x-auto">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <h3 className="font-semibold text-slate-700">Preview (first 5 rows)</h3>
            <span className="text-slate-400 text-sm">of {totalRows} total</span>
          </div>
          <table className="w-full text-sm text-left min-w-max">
            <thead>
              <tr className="border-b border-slate-100">
                {headers.slice(0, 8).map(h => (
                  <th key={h} className="py-2 px-3 font-semibold text-slate-500 text-xs uppercase">{h}</th>
                ))}
                {headers.length > 8 && <th className="py-2 px-3 text-slate-400 text-xs">+{headers.length - 8} more</th>}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                  {Object.values(row).slice(0, 8).map((v, j) => (
                    <td key={j} className="py-2 px-3 text-slate-600">{String(v)}</td>
                  ))}
                  {Object.keys(row).length > 8 && <td className="py-2 px-3 text-slate-400">...</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Process button */}
      {file && (
        <div className="flex gap-3">
          <button
            onClick={handleProcess}
            disabled={processing}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {processing ? <LoadingSpinner size="sm" /> : null}
            {processing ? 'Processing...' : 'Process Dataset →'}
          </button>
          <button onClick={() => { setFile(null); setPreview([]); setTotal(0); setValid(null); }} className="btn-secondary">
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
