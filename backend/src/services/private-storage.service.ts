import { access, copyFile, mkdir, rm } from "node:fs/promises";
import { createReadStream, type ReadStream } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

export interface PrivateStorageAdapter {
  write(storageKey: string, sourcePath: string): Promise<void>;
  read(storageKey: string): Promise<ReadStream>;
  delete(storageKey: string): Promise<void>;
}

function pathForStorageKey(rootDirectory: string, storageKey: string): string {
  if (!/^attachments\/[a-z0-9-]+$/i.test(storageKey)) {
    throw new Error("Storage key tidak valid.");
  }

  const target = resolve(rootDirectory, storageKey);
  const relativeTarget = relative(rootDirectory, target);
  if (relativeTarget.startsWith("..") || relativeTarget.includes(`..${sep}`)) {
    throw new Error("Storage key berada di luar direktori privat.");
  }

  return target;
}

export class LocalPrivateStorageAdapter implements PrivateStorageAdapter {
  private readonly rootDirectory: string;

  constructor(rootDirectory: string) {
    this.rootDirectory = resolve(rootDirectory);
  }

  async write(storageKey: string, sourcePath: string): Promise<void> {
    const target = pathForStorageKey(this.rootDirectory, storageKey);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(sourcePath, target);
  }

  async read(storageKey: string): Promise<ReadStream> {
    const target = pathForStorageKey(this.rootDirectory, storageKey);
    await access(target);
    return createReadStream(target);
  }

  async delete(storageKey: string): Promise<void> {
    const target = pathForStorageKey(this.rootDirectory, storageKey);
    await rm(target, { force: true });
  }
}

export function createPrivateStorageAdapter(options: {
  driver: string;
  bucket: string;
}): PrivateStorageAdapter {
  if (options.driver !== "local") {
    throw new Error(`Storage driver ${options.driver} belum tersedia.`);
  }

  return new LocalPrivateStorageAdapter(options.bucket);
}
