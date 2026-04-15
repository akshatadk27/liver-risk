// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PatientDataProvider } from './context/PatientDataContext'
import ErrorBoundary from './components/ui/ErrorBoundary'
import Layout from './components/layout/Layout'
import { useScrollToTop } from './hooks/useScrollToTop'

// Pages
import Home                   from './pages/Home'
import StaticUpload           from './pages/StaticUpload'
import StaticResults          from './pages/StaticResults'
import DynamicImageUpload     from './pages/DynamicImageUpload'
import DynamicLifestyleSurvey from './pages/DynamicLifestyleSurvey'
import DynamicResults         from './pages/DynamicResults'
import AboutPage              from './pages/AboutPage'

// ScrollToTop renders nothing — just runs the hook on every route change
function ScrollToTop() {
  useScrollToTop();
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <PatientDataProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/"                element={<Home />} />
              <Route path="/static"          element={<StaticUpload />} />
              <Route path="/static/results"  element={<StaticResults />} />
              <Route path="/dynamic"         element={<DynamicImageUpload />} />
              <Route path="/dynamic/survey"  element={<DynamicLifestyleSurvey />} />
              <Route path="/dynamic/results" element={<DynamicResults />} />
              <Route path="/about"           element={<AboutPage />} />
              <Route path="*"               element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </PatientDataProvider>
    </ErrorBoundary>
  )
}
