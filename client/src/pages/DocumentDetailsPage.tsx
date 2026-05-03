import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

import Button from '../components/common/Button';
import Card from '../components/common/Card';
import StatusBadge from '../components/common/StatusBadge';
import DocumentForm from '../components/documents/DocumentForm';
import LineItemsTable from '../components/documents/LineItemsTable';
import RawTextPanel from '../components/documents/RawTextPanel';
import ValidationIssuesList from '../components/documents/ValidationIssuesList';
import { getApiErrorMessage } from '../services/api';
import {
  documentService,
  normalizeDocumentResponse,
  type DocumentUpdatePayload,
} from '../services/documentService';
import type { Document } from '../types/document';
import { formatDate } from '../utils/formatDate';

const rejectReasonOptions = [
  'Unsupported document type',
  'Unreadable file',
  'Multiple documents in one image',
  'Not an invoice or purchase order',
  'Duplicate/invalid document',
  'Other',
];

export default function DocumentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState(rejectReasonOptions[0]);
  const [customRejectReason, setCustomRejectReason] = useState('');

  useEffect(() => {
    if (!id) {
      return;
    }

    const documentId = id;
    let isMounted = true;

    async function loadCurrentDocument(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const loadedDocument = await documentService.getDocumentById(documentId);
        if (isMounted) {
          setDocument(loadedDocument);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCurrentDocument();

    return () => {
      isMounted = false;
    };
  }, [id]);

  async function saveDocument() {
    if (!document) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const updatedDocument = await documentService.updateDocument(
        document.id,
        buildDocumentUpdatePayload(document),
      );

      setDocument(updatedDocument);
      setFeedback('Changes saved and validation refreshed.');
    } catch (error) {
      setFeedback(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDocument() {
    if (!document) {
      return;
    }

    if (document.validationIssues.some((issue) => !issue.resolved)) {
      setFeedback('Document cannot be confirmed while validation errors remain.');
      return;
    }

    setIsProcessing(true);
    setFeedback(null);

    try {
      setDocument(await documentService.confirmDocument(document.id));
      setFeedback('Document confirmed as validated.');
    } catch (error) {
      const errorDocument = getErrorDocument(error);
      if (errorDocument) {
        setDocument(errorDocument);
      }
      setFeedback(getApiErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  }

  async function rejectDocument() {
    if (!document) {
      return;
    }

    const finalReason = getFinalRejectReason(rejectReason, customRejectReason);

    if (!finalReason) {
      setFeedback('Choose a rejection reason before rejecting this document.');
      return;
    }

    setIsProcessing(true);
    setFeedback(null);

    try {
      setDocument(await documentService.rejectDocument(document.id, finalReason));
      setIsRejectDialogOpen(false);
      setCustomRejectReason('');
      setFeedback('Document rejected.');
    } catch (error) {
      setFeedback(getApiErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  }

  async function reopenDocument() {
    if (!document) {
      return;
    }

    setIsProcessing(true);
    setFeedback(null);

    try {
      setDocument(await documentService.reopenDocument(document.id));
      setFeedback('Document reopened for review.');
    } catch (error) {
      setFeedback(getApiErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  }

  async function openOriginalFile() {
    if (!document) {
      return;
    }

    setFeedback(null);

    try {
      const signedUrl = await documentService.getOriginalFileUrl(document.id);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setFeedback(getApiErrorMessage(error));
    }
  }

  if (isLoading) {
    return <DocumentDetailsLoadingState />;
  }

  if (errorMessage || !document) {
    return (
      <DocumentDetailsErrorState
        errorMessage={errorMessage}
        onBackToDocuments={() => navigate('/documents')}
      />
    );
  }

  const openIssueCount = getOpenIssueCount(document);
  const isRejected = document.status === 'REJECTED';
  const canConfirm = openIssueCount === 0 && !isRejected;
  const finalRejectReason = getFinalRejectReason(rejectReason, customRejectReason);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <DocumentHeader document={document} feedback={feedback} />
        <DocumentActions
          canConfirm={canConfirm}
          isProcessing={isProcessing}
          isRejected={isRejected}
          isSaving={isSaving}
          onConfirm={confirmDocument}
          onReject={() => setIsRejectDialogOpen(true)}
          onReopen={reopenDocument}
          onSave={saveDocument}
        />
      </div>

      {isRejectDialogOpen ? (
        <RejectDocumentPanel
          customRejectReason={customRejectReason}
          finalRejectReason={finalRejectReason}
          isProcessing={isProcessing}
          rejectReason={rejectReason}
          onCancel={() => setIsRejectDialogOpen(false)}
          onConfirm={rejectDocument}
          onCustomRejectReasonChange={setCustomRejectReason}
          onRejectReasonChange={setRejectReason}
        />
      ) : null}

      {isRejected ? (
        <RejectedDocumentNotice document={document} />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <DocumentForm
            document={document}
            isReadOnly={isRejected}
            onDocumentChange={setDocument}
          />
          <LineItemsTable
            isReadOnly={isRejected}
            lineItems={document.lineItems}
            onLineItemsChange={(lineItems) => setDocument({ ...document, lineItems })}
          />
          <RawTextPanel
            fileName={document.fileName}
            fileUrl={document.fileUrl}
            onOpenOriginalFile={openOriginalFile}
            rawText={document.rawText}
          />
        </div>
        <ValidationIssuesList issues={document.validationIssues} />
      </div>
    </div>
  );
}

function getOpenIssueCount(document: Document): number {
  return document.validationIssues.filter((issue) => !issue.resolved).length;
}

function getFinalRejectReason(rejectReason: string, customRejectReason: string): string {
  return rejectReason === 'Other' ? customRejectReason.trim() : rejectReason;
}

function buildDocumentUpdatePayload(document: Document): DocumentUpdatePayload {
  return {
    documentType: document.documentType,
    documentNumber: document.documentNumber,
    supplierName: document.supplierName,
    issueDate: document.issueDate,
    dueDate: document.dueDate,
    currency: document.currency,
    subtotal: document.subtotal,
    taxRate: document.taxRate,
    tax: document.tax,
    total: document.total,
    lineItems: document.lineItems,
  };
}

function DocumentDetailsLoadingState(): React.JSX.Element {
  return (
    <Card className="p-6">
      <p className="text-slate-500">Loading document...</p>
    </Card>
  );
}

function DocumentDetailsErrorState({
  errorMessage,
  onBackToDocuments,
}: {
  errorMessage: string | null;
  onBackToDocuments: () => void;
}): React.JSX.Element {
  return (
    <Card className={errorMessage ? 'border-red-200 bg-red-50 p-6' : 'p-6'}>
      <p className={errorMessage ? 'font-semibold text-red-800' : 'text-slate-500'}>
        {errorMessage ? 'Could not load document.' : 'Document not found.'}
      </p>
      {errorMessage ? <p className="mt-1 text-sm text-red-700">{errorMessage}</p> : null}
      <Button className="mt-4" onClick={onBackToDocuments} variant="secondary">
        Back to documents
      </Button>
    </Card>
  );
}

function DocumentHeader({
  document,
  feedback,
}: {
  document: Document;
  feedback: string | null;
}): React.JSX.Element {
  return (
    <div>
      <Link className="text-sm font-semibold text-slate-600 hover:text-slate-950" to="/documents">
        Back to documents
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h2 className="min-w-0 break-words text-2xl font-bold text-slate-950">
          {document.documentNumber ?? 'Untitled document'}
        </h2>
        <StatusBadge status={document.status} />
      </div>
      <p className="mt-1 text-slate-500">
        Created {formatDate(document.createdAt)} - Updated {formatDate(document.updatedAt)}
      </p>
      {feedback ? (
        <p className="mt-3 inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}

function DocumentActions({
  canConfirm,
  isProcessing,
  isRejected,
  isSaving,
  onConfirm,
  onReject,
  onReopen,
  onSave,
}: {
  canConfirm: boolean;
  isProcessing: boolean;
  isRejected: boolean;
  isSaving: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onReopen: () => void;
  onSave: () => void;
}): React.JSX.Element {
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap xl:justify-end">
      {isRejected ? (
        <Button className="w-full sm:w-auto" disabled={isProcessing} onClick={onReopen}>
          {isProcessing ? 'Reopening...' : 'Reopen for review'}
        </Button>
      ) : (
        <>
          <Button className="w-full sm:w-auto" disabled={isSaving} onClick={onSave} variant="secondary">
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
          <Button
            className="w-full sm:w-auto"
            disabled={!canConfirm || isProcessing || isSaving}
            onClick={onConfirm}
          >
            Confirm as Validated
          </Button>
          <Button
            className="w-full sm:w-auto"
            disabled={isProcessing || isSaving}
            onClick={onReject}
            variant="danger"
          >
            Reject document
          </Button>
        </>
      )}
    </div>
  );
}

function RejectDocumentPanel({
  customRejectReason,
  finalRejectReason,
  isProcessing,
  rejectReason,
  onCancel,
  onConfirm,
  onCustomRejectReasonChange,
  onRejectReasonChange,
}: {
  customRejectReason: string;
  finalRejectReason: string;
  isProcessing: boolean;
  rejectReason: string;
  onCancel: () => void;
  onConfirm: () => void;
  onCustomRejectReasonChange: (value: string) => void;
  onRejectReasonChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <Card className="border-red-200 bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-950">Reject document</h3>
          <p className="mt-1 text-sm text-slate-500">
            Select a reason before moving this document out of the review queue.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-[280px_1fr]">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Reason</span>
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                value={rejectReason}
                onChange={(event) => onRejectReasonChange(event.target.value)}
              >
                {rejectReasonOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            {rejectReason === 'Other' ? (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Custom note
                </span>
                <input
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  value={customRejectReason}
                  onChange={(event) => onCustomRejectReasonChange(event.target.value)}
                  placeholder="Enter rejection reason"
                />
              </label>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="w-full sm:w-auto" onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button
            className="w-full sm:w-auto"
            disabled={!finalRejectReason || isProcessing}
            onClick={onConfirm}
            variant="danger"
          >
            {isProcessing ? 'Rejecting...' : 'Confirm reject'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function RejectedDocumentNotice({ document }: { document: Document }): React.JSX.Element {
  return (
    <Card className="border-red-200 bg-red-50 p-4">
      <p className="font-semibold text-red-800">This document was rejected.</p>
      <p className="mt-1 text-sm text-red-700">
        Reason: {document.rejectReason ?? 'No reason provided'}
      </p>
    </Card>
  );
}

function getErrorDocument(error: unknown): Document | null {
  if (axios.isAxiosError(error) && error.response?.data?.document) {
    return normalizeDocumentResponse(error.response.data.document);
  }

  return null;
}
