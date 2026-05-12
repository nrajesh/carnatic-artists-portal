import { randomUUID } from "crypto";
import jpeg from "jpeg-js";
import { deleteFile, StorageError, uploadFile } from "@/lib/storage";

export const PROFILE_PHOTO_MAX_UPLOAD_BYTES = 1 * 1024 * 1024;
export const PROFILE_PHOTO_CONTENT_TYPE = "image/jpeg";

const MANAGED_PROFILE_PHOTO_TYPES = new Set([PROFILE_PHOTO_CONTENT_TYPE]);

export type ManagedProfilePhotoUpload = {
  url: string;
  objectKey: string;
};

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

export async function uploadArtistProfilePhoto(params: {
  artistId: string;
  file: File;
}): Promise<ManagedProfilePhotoUpload> {
  return uploadManagedProfilePhoto({
    objectKey: profilePhotoKeyForArtist(params.artistId),
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
