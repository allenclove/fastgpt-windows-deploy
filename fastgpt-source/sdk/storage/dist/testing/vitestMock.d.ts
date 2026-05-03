import type { MockedFunction } from 'vitest';
import type { IStorage } from '../interface';
import type { StorageObjectKey, StorageObjectMetadata } from '../types';
type VitestLike = {
    fn: <T extends (...args: any[]) => any>(impl?: T) => MockedFunction<T>;
};
type StoredObject = {
    body: Buffer;
    metadata: StorageObjectMetadata;
    contentType?: string;
    contentLength?: number;
    contentDisposition?: string;
    etag?: string;
};
export type VitestStorageMock = IStorage & {
    /** 便于在测试中直接读写内存对象（key -> object）。 */
    __objects: Map<StorageObjectKey, StoredObject>;
    /** 清空内存对象。 */
    __reset: () => void;
    /** 直接写入一个对象（绕过 uploadObject）。 */
    __putObject: (key: StorageObjectKey, obj: Partial<StoredObject> & {
        body: Buffer;
    }) => void;
};
export type CreateVitestStorageMockParams = {
    vi: VitestLike;
    bucketName?: string;
    /**
     * 用于构造 presigned/public URL 的 base（仅 mock 用）。
     * 例如：`https://mock-storage.local`
     */
    baseUrl?: string;
};
export declare function createVitestStorageMock(params: CreateVitestStorageMockParams): VitestStorageMock;
export {};
//# sourceMappingURL=vitestMock.d.ts.map