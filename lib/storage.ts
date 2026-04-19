import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import {
  RequestChecksumCalculation,
  ResponseChecksumValidation,
} from '@aws-sdk/middleware-flexible-checksums';
import { createDefaultUserAgentProvider as createBrowserUserAgentProvider } from '@aws-sdk/util-user-agent-browser';
import { FetchHttpHandler } from '@smithy/fetch-http-handler';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import s3ClientPackage from '@aws-sdk/client-s3/package.json';

/** Workers / unenv have no real `fs`; default Node HTTP handler can trigger `[unenv] fs.readFile`. */
const r2RequestHandler = new FetchHttpHandler({});

/**
 * The Node S3 runtime uses `@aws-sdk/util-user-agent-node`, which reads `package.json` via `fs.readFile`
 * for TypeScript version detection  -  that fails on Workers (unenv). Browser UA avoids any filesystem access.
 */
const r2DefaultUserAgentProvider = createBrowserUserAgentProvider({
  serviceId: 's3',
  clientVersion: s3ClientPackage.version,
});

// ---------------------------------------------------------------------------
// StorageError
// ---------------------------------------------------------------------------

export class StorageError extends Error {
  constructor(
    public readonly code:
      | 'FILE_TOO_LARGE'
      | 'UNSUPPORTED_FILE_TYPE'
      | 'STORAGE_UNAVAILABLE',
    message: string,
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

// ---------------------------------------------------------------------------
// Env resolution (localhost + Cloudflare Workers)
// ---------------------------------------------------------------------------

function pickString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t !== '' ? t : undefined;
}

/**
 * Resolve one R2-related env value. Order:
 * 1. `process.env` - local `.env.local` and any injected vars
 * 2. `cloudflare:workers` `env` - **required for R2 secrets** on OpenNext: S3 keys often do not appear on
 *    `process.env` inside the Node-compat server isolate, but Workers always exposes them here
 * 3. OpenNext `getCloudflareContext` (sync then async) - fallback
 */
async function resolveR2EnvString(key: string): Promise<string | undefined> {
  const pe = pickString(process.env[key]);
  if (pe) return pe;

  try {
    const { env } = await import(/* webpackIgnore: true */ 'cloudflare:workers');
    const w = pickString(env[key]);
    if (w) return w;
  } catch {
    // Not running on Workers, or bundler without cloudflare:workers (tests, local Node)
  }

  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const env = getCloudflareContext({ async: false }).env as unknown as Record<
      string,
      unknown
    >;
    const c = pickString(env[key]);
    if (c) return c;
  } catch {
    //
  }

  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const env = (await getCloudflareContext({ async: true })).env as unknown as Record<
      string,
      unknown
    >;
    const c = pickString(env[key]);
    if (c) return c;
  } catch {
    //
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// R2 S3 client
// ---------------------------------------------------------------------------

async function getS3Client(): Promise<S3Client> {
  const accountId = await resolveR2EnvString('R2_ACCOUNT_ID');
  const accessKeyId = await resolveR2EnvString('R2_ACCESS_KEY_ID');
  const secretAccessKey = await resolveR2EnvString('R2_SECRET_ACCESS_KEY');

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new StorageError(
      'STORAGE_UNAVAILABLE',
      'R2 credentials are not configured',
    );
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    requestHandler: r2RequestHandler,
    defaultUserAgentProvider: r2DefaultUserAgentProvider,
    /** Default `WHEN_SUPPORTED` adds CRC32 and pulls Node zlib/stream paths; R2 does not require it. */
    requestChecksumCalculation: RequestChecksumCalculation.WHEN_REQUIRED,
    responseChecksumValidation: ResponseChecksumValidation.WHEN_REQUIRED,
  });
}

async function getBucketName(): Promise<string> {
  const bucket = await resolveR2EnvString('R2_BUCKET_NAME');
  if (!bucket) {
    throw new StorageError(
      'STORAGE_UNAVAILABLE',
      'R2_BUCKET_NAME is not configured',
    );
  }
  return bucket;
}

async function getPublicUrl(): Promise<string> {
  const publicUrl = await resolveR2EnvString('R2_PUBLIC_URL');
  if (!publicUrl) {
    throw new StorageError(
      'STORAGE_UNAVAILABLE',
      'R2_PUBLIC_URL is not configured',
    );
  }
  return publicUrl;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Upload a file buffer to R2. Returns the public URL of the uploaded file.
 * Throws StorageError with appropriate code on failure.
 */
export async function uploadFile(params: {
  key: string;
  buffer: Buffer;
  contentType: string;
  sizeBytes: number;
}): Promise<string> {
  const { key, buffer, contentType, sizeBytes } = params;

  // Validate size
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new StorageError(
      'FILE_TOO_LARGE',
      `File size ${sizeBytes} bytes exceeds the 5 MB limit`,
    );
  }

  // Validate MIME type
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new StorageError(
      'UNSUPPORTED_FILE_TYPE',
      `Content type "${contentType}" is not supported. Allowed types: ${[...ALLOWED_CONTENT_TYPES].join(', ')}`,
    );
  }

  try {
    const client = await getS3Client();
    const bucket = await getBucketName();

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ContentLength: sizeBytes,
      }),
    );

    const publicUrl = await getPublicUrl();
    return `${publicUrl}/${key}`;
  } catch (err) {
    if (err instanceof StorageError) {
      throw err;
    }
    throw new StorageError(
      'STORAGE_UNAVAILABLE',
      `Storage operation failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Delete a file from R2 by key. No-op if the file does not exist.
 */
export async function deleteFile(key: string): Promise<void> {
  try {
    const client = await getS3Client();
    const bucket = await getBucketName();

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  } catch (err) {
    if (err instanceof StorageError) {
      throw err;
    }
    throw new StorageError(
      'STORAGE_UNAVAILABLE',
      `Storage operation failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Generate a pre-signed GET URL for a private file (valid for 1 hour).
 */
export async function getPresignedUrl(key: string): Promise<string> {
  try {
    const client = await getS3Client();
    const bucket = await getBucketName();

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return await getSignedUrl(client, command, { expiresIn: 3600 }); // 1 hour
  } catch (err) {
    if (err instanceof StorageError) {
      throw err;
    }
    throw new StorageError(
      'STORAGE_UNAVAILABLE',
      `Storage operation failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
