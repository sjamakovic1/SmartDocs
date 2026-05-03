import type { Prisma } from '@prisma/client';

import { getStorageBucketName, supabase } from '../config/supabase';
import { StorageSignedUrlError, StorageUploadError } from './documentErrors';

export interface OriginalDocumentFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size?: number;
}

export async function uploadOriginalFile(
  file: OriginalDocumentFile,
  documentId: string,
): Promise<Prisma.DocumentUpdateInput> {
  const bucket = getStorageBucketName();
  const fileStoragePath = createStoragePath(documentId, file.originalname);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileStoragePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    throw new StorageUploadError(`Failed to upload original file to Supabase Storage: ${error.message}`);
  }

  return {
    fileStorageBucket: bucket,
    fileStoragePath,
    fileName: file.originalname,
    mimeType: file.mimetype,
    fileSize: file.size ?? file.buffer.byteLength,
  };
}

export async function removeOriginalFile(
  bucket: string | null,
  fileStoragePath: string,
): Promise<void> {
  const { error } = await supabase.storage
    .from(bucket ?? getStorageBucketName())
    .remove([fileStoragePath]);

  if (error) {
    console.warn(`Failed to delete original file from Supabase Storage: ${error.message}`);
  }
}

export async function createOriginalFileSignedUrlFromStoragePath(
  fileStoragePath: string,
  expiresIn: number,
  bucket: string | null,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket ?? getStorageBucketName())
    .createSignedUrl(fileStoragePath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new StorageSignedUrlError('Failed to create signed URL for original file.');
  }

  return data.signedUrl;
}

export function createStoragePath(documentId: string, originalFileName: string): string {
  const safeFileName = sanitizeFileName(originalFileName);
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');

  return `documents/${documentId}/${timestamp}-${safeFileName}`;
}

export function sanitizeFileName(fileName: string): string {
  const fallbackName = 'uploaded-file';
  const trimmed = fileName.trim();
  const extensionMatch = trimmed.match(/(\.[A-Za-z0-9]{1,12})$/);
  const extension = extensionMatch?.[1]?.toLowerCase() ?? '';
  const baseName = (extension ? trimmed.slice(0, -extension.length) : trimmed)
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .toLowerCase();

  return `${baseName || fallbackName}${extension}`;
}
