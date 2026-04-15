// src/components/layout/Footer.jsx
import { Link } from 'react-router-dom';
import { Activity, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-medical-600 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-white">LiverRisk </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              A research-backed liver cancer risk assessment platform powered by 9 statistical
              techniques from 10 IEEE research papers.
            </p>
            <p className="text-xs text-slate-500 mt-3">v1.0.0</p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/static"  className="hover:text-medical-400 transition-colors">Static Analysis Module</Link></li>
              <li><Link to="/dynamic" className="hover:text-medical-400 transition-colors">Dynamic Assessment</Link></li>
              <li><Link to="/about"   className="hover:text-medical-400 transition-colors">Methodology</Link></li>
              <li><Link to="/about"   className="hover:text-medical-400 transition-colors">References</Link></li>
            </ul>
          </div>

          {/* Papers acknowledgment */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Research Foundation</h4>
            <p className="text-sm text-slate-400">
              Validated against <strong className="text-white">10 IEEE research papers</strong> spanning
              2020–2025. All statistical methods are derived from peer-reviewed clinical studies.
            </p>
            <p className="text-sm text-slate-400 mt-2">
              ⚠️ This platform is for <strong className="text-yellow-400">educational purposes only</strong>.
              Not a substitute for medical advice.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            © 2025 LiverRisk Prediction Platform. All rights reserved.
          </p>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            Built with <Heart className="w-3 h-3 text-red-400" /> for early cancer prediction research
          </p>
        </div>
      </div>
    </footer>
  );
}
