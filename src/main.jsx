// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: { borderRadius: '12px', fontSize: '14px', fontFamily: 'system-ui, sans-serif' },
        success: { iconTheme: { primary: '#22c55e', secondary: 'white' } },
        error:   { iconTheme: { primary: '#ef4444', secondary: 'white' } },
      }}
    />
  </React.StrictMode>,
)
