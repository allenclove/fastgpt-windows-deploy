import { AwsS3StorageAdapter } from './adapters/aws-s3.adapter';
import { CosStorageAdapter } from './adapters/cos.adapter';
import { MinioStorageAdapter } from './adapters/minio.adapter';
import { OssStorageAdapter } from './adapters/oss.adapter';
import type { IStorageOptions } from './interface';
export declare function createStorage(options: IStorageOptions): AwsS3StorageAdapter | OssStorageAdapter | CosStorageAdapter | MinioStorageAdapter;
//# sourceMappingURL=factory.d.ts.map