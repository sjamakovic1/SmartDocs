import { useEffect, useState } from 'react';

import Button from '../common/Button';
import Card from '../common/Card';

interface FilePreviewProps {
  file: File | null;
  onRemoveFile: () => void;
}

export default function FilePreview({ file, onRemoveFile }: FilePreviewProps) {
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setImagePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setImagePreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!file) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 gap-4">
          {imagePreviewUrl ? (
            <img
              alt=""
              className="size-16 rounded-lg border border-slate-200 object-cover"
              src={imagePreviewUrl}
            />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold uppercase text-slate-500">
              File
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">Selected file</p>
            <p className="mt-1 truncate font-semibold text-slate-950">{file.name}</p>
            <p className="mt-1 text-sm text-slate-500">
              {file.type || 'Unknown type'} · {formatFileSize(file.size)}
            </p>
          </div>
        </div>
        <Button onClick={onRemoveFile} type="button" variant="ghost">
          Remove file
        </Button>
      </div>
    </Card>
  );
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
