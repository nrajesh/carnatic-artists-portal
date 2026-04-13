/**
 * Unit tests for lib/storage.ts
 * Validates: Requirements 1.2, 3.4
 *
 * Tests mock the S3 client to verify:
 * - File too large throws StorageError with code FILE_TOO_LARGE
 * - Unsupported MIME type throws StorageError with code UNSUPPORTED_FILE_TYPE
 * - S3 client error is wrapped as StorageError with code STORAGE_UNAVAILABLE
 * - Valid upload returns the correct public URL
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StorageError } from '../storage';

// ---------------------------------------------------------------------------
// Mock @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner
// ---------------------------------------------------------------------------

const mockSend = vi.fn();
const mockGetSignedUrl = vi.fn();

vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: vi.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    PutObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    DeleteObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    GetObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => {
  return {
    getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_ENV = {
  R2_ACCOUNT_ID: 'test-account-id',
  R2_ACCESS_KEY_ID: 'test-access-key',
  R2_SECRET_ACCESS_KEY: 'test-secret-key',
  R2_BUCKET_NAME: 'test-bucket',
  R2_PUBLIC_URL: 'https://cdn.example.com',
};

function setEnv(overrides: Partial<typeof VALID_ENV> = {}) {
  const env = { ...VALID_ENV, ...overrides };
  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }
}

function clearEnv() {
  for (const key of Object.keys(VALID_ENV)) {
    delete process.env[key];
  }
}

const smallBuffer = Buffer.from('fake-image-data');
const FIVE_MB = 5 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StorageError', () => {
  it('has the correct name and code', () => {
    const err = new StorageError('FILE_TOO_LARGE', 'too big');
    expect(err.name).toBe('StorageError');
    expect(err.code).toBe('FILE_TOO_LARGE');
    expect(err.message).toBe('too big');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(StorageError);
  });
});

describe('uploadFile', () => {
  beforeEach(() => {
    setEnv();
    mockSend.mockReset();
    mockGetSignedUrl.mockReset();
  });

  afterEach(() => {
    clearEnv();
  });

  it('throws StorageError FILE_TOO_LARGE when sizeBytes exceeds 5 MB', async () => {
    // Re-import to pick up fresh module state after mocks are set
    const { uploadFile } = await import('../storage');

    await expect(
      uploadFile({
        key: 'profiles/artist-1/photo.jpg',
        buffer: smallBuffer,
        contentType: 'image/jpeg',
        sizeBytes: FIVE_MB + 1,
      }),
    ).rejects.toMatchObject({
      name: 'StorageError',
      code: 'FILE_TOO_LARGE',
    });
  });

  it('throws StorageError FILE_TOO_LARGE for exactly 5 MB + 1 byte', async () => {
    const { uploadFile } = await import('../storage');

    await expect(
      uploadFile({
        key: 'profiles/artist-1/photo.jpg',
        buffer: smallBuffer,
        contentType: 'image/jpeg',
        sizeBytes: FIVE_MB + 1,
      }),
    ).rejects.toBeInstanceOf(StorageError);
  });

  it('does NOT throw FILE_TOO_LARGE for exactly 5 MB', async () => {
    mockSend.mockResolvedValueOnce({});
    const { uploadFile } = await import('../storage');

    await expect(
      uploadFile({
        key: 'profiles/artist-1/photo.jpg',
        buffer: smallBuffer,
        contentType: 'image/jpeg',
        sizeBytes: FIVE_MB,
      }),
    ).resolves.toBeDefined();
  });

  it('throws StorageError UNSUPPORTED_FILE_TYPE for unsupported MIME type', async () => {
    const { uploadFile } = await import('../storage');

    await expect(
      uploadFile({
        key: 'profiles/artist-1/doc.pdf',
        buffer: smallBuffer,
        contentType: 'application/pdf',
        sizeBytes: 1024,
      }),
    ).rejects.toMatchObject({
      name: 'StorageError',
      code: 'UNSUPPORTED_FILE_TYPE',
    });
  });

  it('throws StorageError UNSUPPORTED_FILE_TYPE for text/plain', async () => {
    const { uploadFile } = await import('../storage');

    await expect(
      uploadFile({
        key: 'profiles/artist-1/file.txt',
        buffer: smallBuffer,
        contentType: 'text/plain',
        sizeBytes: 100,
      }),
    ).rejects.toMatchObject({
      name: 'StorageError',
      code: 'UNSUPPORTED_FILE_TYPE',
    });
  });

  it('accepts all allowed MIME types without throwing UNSUPPORTED_FILE_TYPE', async () => {
    mockSend.mockResolvedValue({});
    const { uploadFile } = await import('../storage');

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    for (const contentType of allowedTypes) {
      await expect(
        uploadFile({
          key: `profiles/artist-1/photo`,
          buffer: smallBuffer,
          contentType,
          sizeBytes: 1024,
        }),
      ).resolves.toBeDefined();
    }
  });

  it('wraps S3 client errors as StorageError STORAGE_UNAVAILABLE', async () => {
    mockSend.mockRejectedValueOnce(new Error('Network timeout'));
    const { uploadFile } = await import('../storage');

    await expect(
      uploadFile({
        key: 'profiles/artist-1/photo.jpg',
        buffer: smallBuffer,
        contentType: 'image/jpeg',
        sizeBytes: 1024,
      }),
    ).rejects.toMatchObject({
      name: 'StorageError',
      code: 'STORAGE_UNAVAILABLE',
    });
  });

  it('returns the correct public URL on successful upload', async () => {
    mockSend.mockResolvedValueOnce({});
    const { uploadFile } = await import('../storage');

    const url = await uploadFile({
      key: 'profiles/artist-1/photo.jpg',
      buffer: smallBuffer,
      contentType: 'image/jpeg',
      sizeBytes: 1024,
    });

    expect(url).toBe('https://cdn.example.com/profiles/artist-1/photo.jpg');
  });

  it('constructs public URL as R2_PUBLIC_URL + "/" + key', async () => {
    mockSend.mockResolvedValueOnce({});
    const { uploadFile } = await import('../storage');

    const key = 'backgrounds/artist-42/banner.png';
    const url = await uploadFile({
      key,
      buffer: smallBuffer,
      contentType: 'image/png',
      sizeBytes: 2048,
    });

    expect(url).toBe(`${VALID_ENV.R2_PUBLIC_URL}/${key}`);
  });
});

describe('deleteFile', () => {
  beforeEach(() => {
    setEnv();
    mockSend.mockReset();
  });

  afterEach(() => {
    clearEnv();
  });

  it('resolves without error on successful delete', async () => {
    mockSend.mockResolvedValueOnce({});
    const { deleteFile } = await import('../storage');

    await expect(deleteFile('profiles/artist-1/photo.jpg')).resolves.toBeUndefined();
  });

  it('wraps S3 client errors as StorageError STORAGE_UNAVAILABLE', async () => {
    mockSend.mockRejectedValueOnce(new Error('Access denied'));
    const { deleteFile } = await import('../storage');

    await expect(deleteFile('profiles/artist-1/photo.jpg')).rejects.toMatchObject({
      name: 'StorageError',
      code: 'STORAGE_UNAVAILABLE',
    });
  });
});

describe('getPresignedUrl', () => {
  beforeEach(() => {
    setEnv();
    mockSend.mockReset();
    mockGetSignedUrl.mockReset();
  });

  afterEach(() => {
    clearEnv();
  });

  it('returns a pre-signed URL string', async () => {
    const expectedUrl = 'https://r2.example.com/profiles/artist-1/photo.jpg?X-Amz-Signature=abc123';
    mockGetSignedUrl.mockResolvedValueOnce(expectedUrl);
    const { getPresignedUrl } = await import('../storage');

    const url = await getPresignedUrl('profiles/artist-1/photo.jpg');
    expect(url).toBe(expectedUrl);
  });

  it('wraps errors as StorageError STORAGE_UNAVAILABLE', async () => {
    mockGetSignedUrl.mockRejectedValueOnce(new Error('Signing failed'));
    const { getPresignedUrl } = await import('../storage');

    await expect(getPresignedUrl('profiles/artist-1/photo.jpg')).rejects.toMatchObject({
      name: 'StorageError',
      code: 'STORAGE_UNAVAILABLE',
    });
  });
});
