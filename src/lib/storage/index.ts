import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/lib/env";

export const storageEnabled = Boolean(env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY);

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const ALLOWED_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/zip",
];

function client(endpoint = env.S3_ENDPOINT) {
  return new S3Client({
    region: env.S3_REGION,
    endpoint,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID ?? "", secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? "" },
  });
}

// Presigned URLs are opened by the browser, so sign them against the public endpoint.
const publicClient = () => client(env.S3_PUBLIC_ENDPOINT ?? env.S3_ENDPOINT);

export function buildStorageKey(organizationId: string, fileName: string) {
  const safe = fileName.replace(/[^\w.-]+/g, "_").slice(-100);
  return `orgs/${organizationId}/${crypto.randomUUID()}-${safe}`;
}

export async function createUploadUrl(key: string, contentType: string, size: number) {
  return getSignedUrl(
    publicClient(),
    new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, ContentType: contentType, ContentLength: size }),
    { expiresIn: 300 },
  );
}

export async function createDownloadUrl(key: string, fileName: string) {
  return getSignedUrl(
    publicClient(),
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
    }),
    { expiresIn: 300 },
  );
}

export async function deleteObject(key: string) {
  await client().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}

/** Returns the stored object's size in bytes, or null if it does not exist. */
export async function headObject(key: string): Promise<number | null> {
  try {
    const res = await client().send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    return res.ContentLength ?? 0;
  } catch (err) {
    if ((err as { name?: string }).name === "NotFound") return null;
    throw err;
  }
}

/** Pending uploads older than this are treated as abandoned and cleaned up. */
export const PENDING_UPLOAD_TTL_MS = 60 * 60 * 1000;

export { client as s3Client };
