export type StorageUploadRequest = Readonly<{
  objectKey: string;
  contentType: string;
  expiresInSeconds: number;
}>;

export type StorageUploadGrant = Readonly<{
  method: "PUT";
  url: string;
  headers: Readonly<Record<string, string>>;
  expiresAt: string;
}>;

export type StoredObjectMetadata = Readonly<{
  sizeBytes: number;
  contentType: string | null;
  etag: string | null;
}>;

export interface ObjectStorageProvider {
  readonly name: string;
  createUploadGrant(input: StorageUploadRequest): Promise<StorageUploadGrant>;
  headObject(objectKey: string): Promise<StoredObjectMetadata | null>;
  readPrefix(objectKey: string, maxBytes: number): Promise<Uint8Array>;
  createPrivateDownloadUrl(objectKey: string, fileName: string, expiresInSeconds: number): Promise<string>;
  publicUrl(objectKey: string): string | null;
  deleteObject(objectKey: string): Promise<void>;
}
