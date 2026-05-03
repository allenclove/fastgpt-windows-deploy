import COS from 'cos-nodejs-sdk-v5';
import type { ICosStorageOptions, IStorage } from '../interface';
import type { UploadObjectParams, UploadObjectResult, DownloadObjectParams, DownloadObjectResult, DeleteObjectParams, DeleteObjectsParams, DeleteObjectsResult, PresignedPutUrlParams, PresignedPutUrlResult, ListObjectsParams, ListObjectsResult, DeleteObjectResult, GetObjectMetadataParams, GetObjectMetadataResult, EnsureBucketResult, DeleteObjectsByPrefixParams, ExistsObjectParams, ExistsObjectResult, PresignedGetUrlParams, PresignedGetUrlResult, CopyObjectParams, CopyObjectResult, GeneratePublicGetUrlParams, GeneratePublicGetUrlResult } from '../types';
export declare class CosStorageAdapter implements IStorage {
    protected readonly options: ICosStorageOptions;
    protected readonly client: COS;
    get bucketName(): string;
    constructor(options: ICosStorageOptions);
    private handleCosError;
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
//# sourceMappingURL=cos.adapter.d.ts.map