import { useLocation } from 'react-router-dom';

type PageCopy = { title: string; subtitle: string };

const DOCUMENT_REVIEW_PAGE_COPY: PageCopy = {
  title: 'Document review',
  subtitle: 'Review extracted fields, validation issues, and source text.',
};

const FALLBACK_PAGE_COPY: PageCopy = {
  title: 'Smart Document Processing',
  subtitle: 'Review workspace',
};

const PAGE_COPY: Record<string, PageCopy> = {
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
  const copy = getPageCopy(location.pathname);

  return (
    <header className="border-b border-slate-200 bg-white px-4 py-5 shadow-sm sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div>
          <h1 className="break-words text-2xl font-bold tracking-tight text-slate-950">
            {copy.title}
          </h1>
          <p className="mt-1 max-w-[18rem] break-words text-sm text-slate-500 sm:max-w-none">
            {copy.subtitle}
          </p>
        </div>
      </div>
    </header>
  );
}

function getPageCopy(pathname: string): PageCopy {
  if (PAGE_COPY[pathname]) {
    return PAGE_COPY[pathname];
  }

  if (pathname.startsWith('/documents/')) {
    return DOCUMENT_REVIEW_PAGE_COPY;
  }

  return FALLBACK_PAGE_COPY;
}
