import Card from '../common/Card';

interface RawTextPanelProps {
  rawText?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  onOpenOriginalFile?: () => void;
}

export default function RawTextPanel({
  rawText,
  fileName,
  fileUrl,
  onOpenOriginalFile,
}: RawTextPanelProps) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-slate-950">Original file and extracted text</h2>
      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-medium text-slate-500">Original file</p>
        {fileUrl ? (
          <a className="mt-1 block font-semibold text-slate-950 hover:underline" href={fileUrl}>
            {fileName ?? 'Open file'}
          </a>
        ) : onOpenOriginalFile ? (
          <button
            className="mt-1 font-semibold text-slate-950 hover:underline"
            onClick={onOpenOriginalFile}
            type="button"
          >
            Open original file
          </button>
        ) : (
          <p className="mt-1 font-semibold text-slate-950">{fileName ?? 'No file attached'}</p>
        )}
      </div>
      <pre className="mt-4 max-h-80 overflow-auto rounded-md bg-slate-950 p-4 text-sm leading-6 text-slate-100">
        {rawText ?? 'No raw extracted text available.'}
      </pre>
    </Card>
  );
}
