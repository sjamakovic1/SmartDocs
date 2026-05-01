import { useLocation } from 'react-router-dom';

const pageCopy: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Dashboard',
    subtitle: 'Monitor document status, validation issues, and extracted totals.',
  },
  '/upload': {
    title: 'Upload document',
    subtitle: 'Add a business document and review the mocked extraction result.',
  },
  '/documents': {
    title: 'Documents',
    subtitle: 'Search, filter, and open documents that need review.',
  },
};

export default function Header() {
  const location = useLocation();
  const copy =
    pageCopy[location.pathname] ??
    (location.pathname.startsWith('/documents/')
      ? {
          title: 'Document review',
          subtitle: 'Review extracted fields, validation issues, and source text.',
        }
      : {
          title: 'Smart Document Processing',
          subtitle: 'Review workspace',
        });

  return (
    <header className="border-b border-slate-200 bg-white px-4 py-5 shadow-sm sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">{copy.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{copy.subtitle}</p>
        </div>
      </div>
    </header>
  );
}
