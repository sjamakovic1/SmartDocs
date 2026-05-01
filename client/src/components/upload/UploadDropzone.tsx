import type { ChangeEvent, DragEvent } from 'react';
import { useState } from 'react';

import { getSupportedFormatsLabel, uploadAccept } from '../../utils/uploadValidation';

interface UploadDropzoneProps {
  error?: string | null;
  hasFile: boolean;
  onFileSelect: (file: File) => void;
}

export default function UploadDropzone({ error, hasFile, onFileSelect }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    event.target.value = '';
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      onFileSelect(file);
    }
  }

  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition ${
        isDragging
          ? 'border-indigo-500 bg-indigo-50'
          : hasFile
            ? 'border-indigo-300 bg-indigo-50/70'
            : 'border-indigo-200 bg-indigo-50/40 hover:border-indigo-400 hover:bg-indigo-50'
      } ${error ? 'border-red-300 bg-red-50' : ''}`}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        accept={uploadAccept}
        className="sr-only"
        type="file"
        onChange={handleChange}
      />
      <span className="flex size-12 items-center justify-center rounded-lg bg-white text-lg font-bold text-indigo-700 shadow-sm ring-1 ring-indigo-100">
        +
      </span>
      <span className="mt-4 text-base font-semibold text-slate-950">
        Drop your document here, or click to browse
      </span>
      <span className="mt-2 text-sm text-slate-600">
        Supported formats: {getSupportedFormatsLabel()}
      </span>
      <span className="mt-3 text-xs text-slate-500">
        The original file will be stored and extracted data will be available for review.
      </span>
      {error ? <span className="mt-4 text-sm font-medium text-red-700">{error}</span> : null}
    </label>
  );
}
