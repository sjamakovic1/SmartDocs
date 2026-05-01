import { NavLink } from 'react-router-dom';

const links = [
  { label: 'Dashboard', to: '/' },
  { label: 'Documents', to: '/documents' },
  { label: 'Upload documents', to: '/upload' },
];

export default function Sidebar() {
  return (
    <aside className="w-full border-b border-slate-200 bg-white px-4 py-5 shadow-sm lg:sticky lg:top-0 lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-5 lg:shadow-none">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-bold text-white shadow-sm">
          SD
        </div>
        <div>
          <div className="text-xl font-bold tracking-tight text-slate-950">SmartDocs</div>
          <div className="mt-0.5 text-sm text-slate-500">Document processing</div>
        </div>
      </div>
      <nav className="flex flex-wrap gap-2 lg:flex-col">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `inline-flex min-h-10 items-center rounded-md px-3 py-2 text-sm font-semibold transition ${
                isActive
                  ? 'bg-slate-950 !text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
