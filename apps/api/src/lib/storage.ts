import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface DocumentStorage {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array>;
}

export class LocalDocumentStorage implements DocumentStorage {
  constructor(
    private readonly directory = process.env.ISO_STORAGE_DIR ?? ".storage",
  ) {}
  private path(key: string) {
    if (!/^[0-9a-f-]{36}\.pdf$/i.test(key))
      throw new Error("Invalid document key");
    return join(this.directory, key);
  }
  async put(key: string, bytes: Uint8Array) {
    await mkdir(this.directory, { recursive: true });
    await writeFile(this.path(key), bytes);
  }
  async get(key: string) {
    return readFile(this.path(key));
  }
}

export const documentStorage: DocumentStorage = new LocalDocumentStorage();
