// src/components/layout/Layout.jsx
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import Breadcrumb from '../ui/Breadcrumb';

export default function Layout() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!isHome && <Breadcrumb />}
        <div className={isHome ? '' : 'mt-2'}>
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}
