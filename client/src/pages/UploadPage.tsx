import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '../components/common/Button';
import Card from '../components/common/Card';
import FilePreview from '../components/upload/FilePreview';
import UploadDropzone from '../components/upload/UploadDropzone';
import { documentService } from '../services/documentService';
import { isSupportedUploadFile } from '../utils/uploadValidation';

export default function UploadPage() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  function handleFileSelect(file: File) {
    if (!isSupportedUploadFile(file)) {
      setSelectedFile(null);
      setUploadError('Unsupported format. Please upload a PDF, PNG, JPG, JPEG, CSV, or TXT file.');
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
  }

  function removeSelectedFile() {
    setSelectedFile(null);
    setUploadError(null);
  }

  async function handleUpload() {
    if (!selectedFile) {
      setUploadError('Choose a supported file before processing.');
      return;
    }

    if (!isSupportedUploadFile(selectedFile)) {
      setUploadError('Unsupported format. Please upload a PDF, PNG, JPG, JPEG, CSV, or TXT file.');
      return;
    }

    setIsUploading(true);
    const document = await documentService.mockUploadDocument(selectedFile);
    setIsUploading(false);
    navigate(`/documents/${document.id}`);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="space-y-6 p-6">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Upload document</h2>
          <p className="mt-1 text-sm text-slate-500">
            Upload a PDF, image, CSV, or TXT file for extraction and validation.
          </p>
        </div>

        <UploadDropzone
          error={uploadError}
          hasFile={Boolean(selectedFile)}
          onFileSelect={handleFileSelect}
        />

        <FilePreview file={selectedFile} onRemoveFile={removeSelectedFile} />

        <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          Extraction is currently mocked until backend integration. The original file will be stored
          and extracted data will be available for review.
        </div>

        <div className="flex justify-end">
          <Button disabled={isUploading} onClick={handleUpload}>
            {isUploading ? 'Processing...' : 'Process document'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
