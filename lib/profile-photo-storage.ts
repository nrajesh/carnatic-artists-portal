import { randomUUID } from "crypto";
import jpeg from "jpeg-js";
import { deleteFile, managedObjectKeyFromPublicUrl, StorageError, uploadFile } from "@/lib/storage";

export const PROFILE_PHOTO_MAX_UPLOAD_BYTES = 1 * 1024 * 1024;
export const PROFILE_PHOTO_CONTENT_TYPE = "image/jpeg";

const MANAGED_PROFILE_PHOTO_TYPES = new Set([PROFILE_PHOTO_CONTENT_TYPE]);

export type ManagedProfilePhotoUpload = {
  url: string;
  objectKey: string;
};

const REMOTE_IMAGE_FETCH_USER_AGENT = "artist-discovery-portal/1.0";

async function uploadManagedProfilePhoto(params: {
  objectKey: string;
  file: File;
}): Promise<ManagedProfilePhotoUpload> {
  const validationError = validateManagedProfilePhotoFile(params.file);
  if (validationError) {
    throw new StorageError(
      params.file.size > PROFILE_PHOTO_MAX_UPLOAD_BYTES
        ? "FILE_TOO_LARGE"
        : "UNSUPPORTED_FILE_TYPE",
      validationError,
    );
  }

  const buffer = Buffer.from(await params.file.arrayBuffer());
  if (!bufferMatchesContentType(buffer, params.file.type)) {
    throw new StorageError("UNSUPPORTED_FILE_TYPE", "Profile photo file contents are invalid.");
  }
  const sanitizedBuffer = reencodeJpegWithoutMetadata(buffer);
  if (sanitizedBuffer.length > PROFILE_PHOTO_MAX_UPLOAD_BYTES) {
    throw new StorageError("FILE_TOO_LARGE", "Profile photo must be 1 MB or smaller.");
  }

  const url = await uploadFile({
    key: params.objectKey,
    buffer: sanitizedBuffer,
    contentType: PROFILE_PHOTO_CONTENT_TYPE,
    sizeBytes: sanitizedBuffer.length,
  });

  return { url, objectKey: params.objectKey };
}

export function profilePhotoKeyForArtist(artistId: string): string {
  return `profile-photos/artists/${artistId}/${randomUUID()}.jpg`;
}

export function profilePhotoKeyForRegistration(registrationId: string): string {
  return `profile-photos/registrations/${registrationId}/${randomUUID()}.jpg`;
}

export function backgroundImageKeyForArtist(artistId: string): string {
  return `background-images/artists/${artistId}/${randomUUID()}.jpg`;
}

export function backgroundImageKeyForRegistration(registrationId: string): string {
  return `background-images/registrations/${registrationId}/${randomUUID()}.jpg`;
}

export function isUploadedProfilePhotoFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File && value.size > 0;
}

export function validateManagedProfilePhotoFile(file: File): string | null {
  if (file.size > PROFILE_PHOTO_MAX_UPLOAD_BYTES) {
    return "Profile photo must be 1 MB or smaller after processing.";
  }
  if (!MANAGED_PROFILE_PHOTO_TYPES.has(file.type)) {
    return "Profile photo must be a JPEG image.";
  }
  return null;
}

function bufferMatchesContentType(buffer: Buffer, contentType: string): boolean {
  if (contentType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (contentType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}

function reencodeJpegWithoutMetadata(buffer: Buffer): Buffer {
  try {
    const decoded = jpeg.decode(buffer, { useTArray: true, maxMemoryUsageInMB: 32 });
    const encoded = jpeg.encode(decoded, 86);
    return Buffer.from(encoded.data);
  } catch {
    throw new StorageError("UNSUPPORTED_FILE_TYPE", "Profile photo file contents are invalid.");
  }
}

export async function uploadRegistrationProfilePhoto(params: {
  registrationId: string;
  file: File;
}): Promise<ManagedProfilePhotoUpload> {
  const objectKey = profilePhotoKeyForRegistration(params.registrationId);
  return uploadManagedProfilePhoto({
    objectKey,
    file: params.file,
  });
}

async function fetchRemoteImage(sourceUrl: string): Promise<Buffer> {
  if (!/^https?:\/\//i.test(sourceUrl)) {
    throw new StorageError("UNSUPPORTED_FILE_TYPE", "Image URL must start with HTTP or HTTPS.");
  }

  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent": REMOTE_IMAGE_FETCH_USER_AGENT,
      accept: "image/*,*/*;q=0.8",
    },
  });
  if (!response.ok) {
    throw new StorageError(
      "STORAGE_UNAVAILABLE",
      `Could not download the image URL (${response.status}).`,
    );
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new StorageError("UNSUPPORTED_FILE_TYPE", "Image URL did not return an image.");
  }
  return Buffer.from(await response.arrayBuffer());
}

async function buildProfilePhotoDerivativeFromRemote(buffer: Buffer): Promise<Buffer> {
  try {
    // Re-encode JPEG without metadata using pure JS (jpeg-js)
    // This is safe for Cloudflare Workers and avoids heavy dependencies like sharp.
    return reencodeJpegWithoutMetadata(buffer);
  } catch {
    throw new StorageError("UNSUPPORTED_FILE_TYPE", "Could not process the profile photo URL.");
  }
}

export async function uploadRegistrationProfilePhotoFromUrl(params: {
  registrationId: string;
  sourceUrl: string;
}): Promise<ManagedProfilePhotoUpload> {
  const buffer = await fetchRemoteImage(params.sourceUrl);
  const derivative = await buildProfilePhotoDerivativeFromRemote(buffer);
  if (derivative.length > PROFILE_PHOTO_MAX_UPLOAD_BYTES) {
    throw new StorageError("FILE_TOO_LARGE", "Profile photo must be 1 MB or smaller.");
  }

  const objectKey = profilePhotoKeyForRegistration(params.registrationId);
  const url = await uploadFile({
    key: objectKey,
    buffer: derivative,
    contentType: PROFILE_PHOTO_CONTENT_TYPE,
    sizeBytes: derivative.length,
  });

  return { url, objectKey };
}

export async function uploadArtistProfilePhoto(params: {
  artistId: string;
  file: File;
}): Promise<ManagedProfilePhotoUpload> {
  return uploadManagedProfilePhoto({
    objectKey: profilePhotoKeyForArtist(params.artistId),
    file: params.file,
  });
}

export async function uploadArtistBackgroundImage(params: {
  artistId: string;
  file: File;
}): Promise<ManagedProfilePhotoUpload> {
  return uploadManagedProfilePhoto({
    objectKey: backgroundImageKeyForArtist(params.artistId),
    file: params.file,
  });
}

export async function uploadRegistrationBackgroundImage(params: {
  registrationId: string;
  file: File;
}): Promise<ManagedProfilePhotoUpload> {
  return uploadManagedProfilePhoto({
    objectKey: backgroundImageKeyForRegistration(params.registrationId),
    file: params.file,
  });
}

export async function deleteManagedProfilePhotoBestEffort(objectKey: string | null | undefined) {
  if (!objectKey) return;
  try {
    await deleteFile(objectKey);
  } catch {
    // Clearing the DB reference is the moderation-critical path; storage cleanup can be retried.
  }
}

export async function deleteManagedFileByUrlBestEffort(url: string | null | undefined) {
  try {
    const objectKey = await managedObjectKeyFromPublicUrl(url);
    if (!objectKey) return;
    await deleteManagedProfilePhotoBestEffort(objectKey);
  } catch {
    // Background image cleanup should never block registration moderation flows.
  }
}
