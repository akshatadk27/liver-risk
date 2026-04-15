// src/components/ui/LoadingSpinner.jsx
export default function LoadingSpinner({ size = 'md', text = '', className = '' }) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-3', lg: 'w-12 h-12 border-4' };
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className={`${sizes[size]} rounded-full border-slate-200 border-t-medical-500 animate-spin`} />
      {text && <p className="text-slate-500 text-sm font-medium">{text}</p>}
    </div>
  );
}
