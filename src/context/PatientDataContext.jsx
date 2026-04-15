// src/context/PatientDataContext.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';

const PatientDataContext = createContext(null);

const initialState = {
  uploadedFile:    null,
  processedData:   [],
  staticResults:   null,
  extractedData:   null,
  lifestyleData:   null,
  riskResults:     null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_UPLOADED_FILE':   return { ...state, uploadedFile: action.payload };
    case 'SET_PROCESSED_DATA':  return { ...state, processedData: action.payload };
    case 'SET_STATIC_RESULTS':  return { ...state, staticResults: action.payload };
    case 'SET_EXTRACTED_DATA':  return { ...state, extractedData: action.payload };
    case 'SET_LIFESTYLE_DATA':  return { ...state, lifestyleData: action.payload };
    case 'SET_RISK_RESULTS':    return { ...state, riskResults: action.payload };
    case 'CLEAR_STATIC':
      return { ...state, uploadedFile: null, processedData: [], staticResults: null };
    case 'CLEAR_DYNAMIC':
      return { ...state, extractedData: null, lifestyleData: null, riskResults: null };
    case 'CLEAR_ALL':
      return initialState;
    case 'HYDRATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

export function PatientDataProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('liverRiskPlatform');
      if (saved) {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'HYDRATE', payload: parsed });
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('liverRiskPlatform', JSON.stringify(state));
    } catch (_) {}
  }, [state]);

  const actions = {
    setUploadedFile:   (file)    => dispatch({ type: 'SET_UPLOADED_FILE',  payload: file }),
    setProcessedData:  (data)    => dispatch({ type: 'SET_PROCESSED_DATA', payload: data }),
    setStaticResults:  (results) => dispatch({ type: 'SET_STATIC_RESULTS', payload: results }),
    setExtractedData:  (data)    => dispatch({ type: 'SET_EXTRACTED_DATA', payload: data }),
    setLifestyleData:  (data)    => dispatch({ type: 'SET_LIFESTYLE_DATA', payload: data }),
    setRiskResults:    (results) => dispatch({ type: 'SET_RISK_RESULTS',   payload: results }),
    clearStatic:       ()        => dispatch({ type: 'CLEAR_STATIC' }),
    clearDynamic:      ()        => dispatch({ type: 'CLEAR_DYNAMIC' }),
    clearAll:          ()        => { dispatch({ type: 'CLEAR_ALL' }); localStorage.removeItem('liverRiskPlatform'); },
  };

  return (
    <PatientDataContext.Provider value={{ state, ...actions }}>
      {children}
    </PatientDataContext.Provider>
  );
}

export function usePatientData() {
  const ctx = useContext(PatientDataContext);
  if (!ctx) throw new Error('usePatientData must be used within PatientDataProvider');
  return ctx;
}
