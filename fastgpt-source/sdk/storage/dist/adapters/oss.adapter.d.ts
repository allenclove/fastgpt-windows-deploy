import OSS from 'ali-oss';
import type { IOssStorageOptions, IStorage } from '../interface';
import type { UploadObjectParams, UploadObjectResult, DownloadObjectParams, DownloadObjectResult, DeleteObjectParams, DeleteObjectsParams, DeleteObjectsResult, PresignedPutUrlParams, PresignedPutUrlResult, ListObjectsParams, ListObjectsResult, DeleteObjectResult, GetObjectMetadataParams, GetObjectMetadataResult, EnsureBucketResult, DeleteObjectsByPrefixParams, ExistsObjectParams, ExistsObjectResult, PresignedGetUrlParams, PresignedGetUrlResult, CopyObjectParams, CopyObjectResult, GeneratePublicGetUrlParams, GeneratePublicGetUrlResult } from '../types';
export declare class OssStorageAdapter implements IStorage {
    protected readonly options: IOssStorageOptions;
    protected readonly client: OSS;
    constructor(options: IOssStorageOptions);
    get bucketName(): string;
    checkObjectExists(params: ExistsObjectParams): Promise<ExistsObjectResult>;
    getObjectMetadata(params: GetObjectMetadataParams): Promise<GetObjectMetadataResult>;
    ensureBucket(): Promise<EnsureBucketResult>;
    uploadObject(params: UploadObjectParams): Promise<UploadObjectResult>;
    downloadObject(params: DownloadObjectParams): Promise<DownloadObjectResult>;
    deleteObject(params: DeleteObjectParams): Promise<DeleteObjectResult>;
    deleteObjectsByMultiKeys(params: DeleteObjectsParams): Promise<DeleteObjectsResult>;
    deleteObjectsByPrefix(params: DeleteObjectsByPrefixParams): Promise<DeleteObjectsResult>;
    generatePresignedPutUrl(params: PresignedPutUrlParams): Promise<PresignedPutUrlResult>;
    generatePresignedGetUrl(params: PresignedGetUrlParams): Promise<PresignedGetUrlResult>;
    generatePublicGetUrl(params: GeneratePublicGetUrlParams): GeneratePublicGetUrlResult;
    listObjects(params: ListObjectsParams): Promise<ListObjectsResult>;
    copyObjectInSelfBucket(params: CopyObjectParams): Promise<CopyObjectResult>;
    destroy(): Promise<void>;
}
//# sourceMappingURL=oss.adapter.d.ts.map