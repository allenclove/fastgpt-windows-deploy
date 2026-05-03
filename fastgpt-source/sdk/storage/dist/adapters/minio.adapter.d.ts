import * as Minio from 'minio';
import type { IAwsS3CompatibleStorageOptions, IStorage } from '../interface';
import type { DeleteObjectParams, DeleteObjectsParams, DeleteObjectsResult, DeleteObjectResult, EnsureBucketResult, DeleteObjectsByPrefixParams } from '../types';
import { AwsS3StorageAdapter } from './aws-s3.adapter';
/**
 * @description MinIO 存储适配器（基于 minio SDK 和 AWS S3 SDK）
 *
 * @question 使用 `@aws-sdk/client-s3` 的 DeleteObjectCommand 删除对象时 SDK 会要求对象存储服务器返回有关对象的校验和，否则删除失败，但是 MinIO 社区版并不支持这个功能，只有云服务的 AIStor 支持。
 *
 * 因此，这里在使用 minio 作为 `vendor` 时 使用 Minio Client 的 removeObjects 方法来删除对象。
 *
 * @question 为什么不直接使用 Minio Client 来实现整个 Adapter 呢？
 *
 * 因为 Minio Client 的预签名函数不支持生成可自定义请求头的 URL，除非使用 POST Policy 来签名，否则会返回 403 错误，
 * 这里需要自定义请求头来添加对象的元数据，使用了 X-Amz-Meta-* 请求头。
 *
 * @note
 * - 只有 MinIO 这类 Self-Hosted 的对象存储服务会在存储桶不存在时自动创建存储桶。
 * - 推荐使用其他自建且兼容 S3 协议的对象存储服务使用 `aws-s3` 作为 `vendor` 来实现。
 *
 * @see https://github.com/minio/minio/issues/20845
 * @see https://github.com/aws/aws-sdk-net/issues/3641
 */
export declare class MinioStorageAdapter extends AwsS3StorageAdapter implements IStorage {
    protected readonly options: IAwsS3CompatibleStorageOptions;
    protected readonly minioClient: Minio.Client;
    constructor(options: IAwsS3CompatibleStorageOptions);
    deleteObject(params: DeleteObjectParams): Promise<DeleteObjectResult>;
    deleteObjectsByMultiKeys(params: DeleteObjectsParams): Promise<DeleteObjectsResult>;
    /**
     * @note 这里的实现可以使用 `@aws-sdk/client-s3` 来列出对象，然后使用 `minio` 来删除对象，但是这里直接使用 `minio` 的 `listObjectsV2` 方法来列出对象了。
     */
    deleteObjectsByPrefix(params: DeleteObjectsByPrefixParams): Promise<DeleteObjectsResult>;
    ensureBucket(): Promise<EnsureBucketResult>;
    ensurePublicBucketPolicy(): Promise<void>;
    removeBucketLifecycle(): Promise<void>;
}
//# sourceMappingURL=minio.adapter.d.ts.map