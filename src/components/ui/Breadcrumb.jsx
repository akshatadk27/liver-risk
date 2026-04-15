// src/components/ui/Breadcrumb.jsx
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS = {
  '':        'Home',
  'static':  'Static Module',
  'results': 'Results',
  'dynamic': 'Dynamic Module',
  'survey':  'Lifestyle Survey',
  'about':   'About',
};

export default function Breadcrumb() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  const crumbs = [
    { label: 'Home', href: '/' },
    ...segments.map((seg, i) => ({
      label: ROUTE_LABELS[seg] || seg,
      href: '/' + segments.slice(0, i + 1).join('/'),
    })),
  ];

  return (
    <nav className="flex items-center gap-1 text-sm text-slate-500 py-2 px-1">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300" />}
          {i === 0 && <Home className="w-3 h-3" />}
          {i < crumbs.length - 1 ? (
            <Link to={crumb.href} className="hover:text-medical-600 transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-slate-700 font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
