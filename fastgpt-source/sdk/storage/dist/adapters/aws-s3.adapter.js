import { CopyObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, HeadBucketCommand, HeadObjectCommand, ListObjectsV2Command, NotFound, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { EmptyObjectError } from '../errors';
import { camelCase, chunk, isNotNil, kebabCase, trim } from 'es-toolkit';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DEFAULT_PRESIGNED_URL_EXPIRED_SECONDS } from '../constants';
export class AwsS3StorageAdapter {
    options;
    client;
    get bucketName() {
        return this.options.bucket;
    }
    constructor(options) {
        this.options = options;
        if (options.vendor !== 'aws-s3' && options.vendor !== 'minio') {
            throw new Error('Invalid storage vendor');
        }
        this.client = new S3Client({
            region: options.region,
            credentials: options.credentials,
            endpoint: options.endpoint,
            forcePathStyle: options.forcePathStyle,
            maxAttempts: options.maxRetries
        });
    }
    async checkObjectExists(params) {
        const { key } = params;
        let exists = false;
        try {
            await this.client.send(new HeadObjectCommand({
                Bucket: this.options.bucket,
                Key: key
            }));
            exists = true;
        }
        catch (error) {
            if (error instanceof NotFound) {
                exists = false;
            }
            else {
                throw error;
            }
        }
        return {
            key,
            exists,
            bucket: this.options.bucket
        };
    }
    async getObjectMetadata(params) {
        const { key } = params;
        const result = await this.client.send(new HeadObjectCommand({
            Bucket: this.options.bucket,
            Key: key
        }));
        let metadata = {};
        if (result.Metadata) {
            for (const [k, v] of Object.entries(result.Metadata)) {
                if (!k)
                    continue;
                metadata[camelCase(k)] = String(v);
            }
        }
        return {
            key,
            metadata,
            etag: result.ETag,
            bucket: this.options.bucket,
            contentType: result.ContentType,
            contentLength: result.ContentLength
        };
    }
    async ensureBucket() {
        await this.client.send(new HeadBucketCommand({ Bucket: this.options.bucket }));
        return {
            exists: true,
            created: false,
            bucket: this.options.bucket
        };
    }
    async uploadObject(params) {
        const { key, body, contentType, contentLength, contentDisposition, metadata } = params;
        let meta = {};
        if (metadata) {
            for (const [k, v] of Object.entries(metadata)) {
                if (!k)
                    continue;
                meta[kebabCase(k)] = String(v);
            }
        }
        const upload = new Upload({
            client: this.client,
            params: {
                Bucket: this.options.bucket,
                Key: key,
                Body: body,
                ContentType: contentType,
                ContentLength: contentLength,
                ContentDisposition: contentDisposition,
                Metadata: meta
            }
        });
        await upload.done();
        return {
            key,
            bucket: this.options.bucket
        };
    }
    async downloadObject(params) {
        const { key } = params;
        const result = await this.client.send(new GetObjectCommand({
            Bucket: this.options.bucket,
            Key: key
        }));
        if (!result.Body) {
            throw new EmptyObjectError('Object is undefined');
        }
        return {
            key,
            bucket: this.options.bucket,
            body: result.Body
        };
    }
    async deleteObject(params) {
        const { key } = params;
        await this.client.send(new DeleteObjectCommand({
            Key: key,
            Bucket: this.options.bucket
        }));
        return {
            key,
            bucket: this.options.bucket
        };
    }
    async deleteObjectsByMultiKeys(params) {
        const { keys } = params;
        if (keys.length === 0) {
            return {
                bucket: this.options.bucket,
                keys: []
            };
        }
        const chunks = chunk(keys, 1000);
        const fails = [];
        for (const chunk of chunks) {
            const result = await this.client.send(new DeleteObjectsCommand({
                Bucket: this.options.bucket,
                Delete: {
                    Objects: chunk.map((key) => ({ Key: key })),
                    Quiet: true
                }
            }));
            fails.push(...(result.Errors?.map((error) => error.Key).filter(isNotNil) ?? []));
        }
        return {
            bucket: this.options.bucket,
            keys: fails
        };
    }
    async deleteObjectsByPrefix(params) {
        const { prefix } = params;
        if (!prefix) {
            throw new Error('Prefix is required');
        }
        let fails = [];
        let isTruncated = false;
        let continuationToken = undefined;
        do {
            const listResponse = await this.client.send(new ListObjectsV2Command({
                Bucket: this.options.bucket,
                Prefix: prefix,
                ContinuationToken: continuationToken,
                MaxKeys: 1000
            }));
            if (!listResponse.Contents || listResponse.Contents.length === 0) {
                return {
                    bucket: this.options.bucket,
                    keys: []
                };
            }
            const objectsToDelete = listResponse.Contents.map((content) => ({ Key: content.Key }));
            const deleteResponse = await this.client.send(new DeleteObjectsCommand({
                Bucket: this.options.bucket,
                Delete: {
                    Objects: objectsToDelete,
                    Quiet: true
                }
            }));
            fails.push(...(deleteResponse.Errors?.map((error) => error.Key).filter(isNotNil) ?? []));
            isTruncated = listResponse.IsTruncated ?? false;
            continuationToken = listResponse.NextContinuationToken;
        } while (isTruncated);
        return {
            bucket: this.options.bucket,
            keys: fails
        };
    }
    async generatePresignedPutUrl(params) {
        const { key, expiredSeconds, metadata, contentType } = params;
        const expiresIn = expiredSeconds ? expiredSeconds : DEFAULT_PRESIGNED_URL_EXPIRED_SECONDS;
        // For S3-compatible vendors, metadata is carried by `x-amz-meta-*` headers.
        // We return the expected header map so callers can do browser direct-upload with the same metadata.
        const meta = {};
        if (metadata) {
            for (const [k, v] of Object.entries(metadata)) {
                if (!k)
                    continue;
                meta[kebabCase(k)] = String(v);
            }
        }
        const convertToS3Headers = (meta) => {
            return Object.keys(meta)
                .filter((key) => key !== 'Content-Type')
                .map((key) => `x-amz-meta-${key}`);
        };
        const url = await getSignedUrl(this.client, new PutObjectCommand({
            Bucket: this.options.bucket,
            Key: key,
            Metadata: meta,
            ContentType: contentType
        }), {
            expiresIn,
            unhoistableHeaders: new Set(convertToS3Headers(meta))
        });
        const headers = {};
        for (const [key, value] of Object.entries(meta)) {
            if (key.toLowerCase() === 'content-type') {
                continue;
            }
            headers[`x-amz-meta-${key}`] = value;
        }
        if (contentType) {
            headers['Content-Type'] = contentType;
        }
        return {
            key,
            url: url,
            bucket: this.options.bucket,
            metadata: headers
        };
    }
    async generatePresignedGetUrl(params) {
        const { key, expiredSeconds } = params;
        const expiresIn = expiredSeconds ? expiredSeconds : DEFAULT_PRESIGNED_URL_EXPIRED_SECONDS;
        const url = await getSignedUrl(this.client, new GetObjectCommand({
            Bucket: this.options.bucket,
            Key: key
        }), {
            expiresIn
        });
        return {
            key,
            url: url,
            bucket: this.options.bucket
        };
    }
    generatePublicGetUrl(params) {
        const { key } = params;
        let url;
        if (this.options.forcePathStyle) {
            if (this.options.publicAccessExtraSubPath) {
                url = `${this.options.endpoint}/${trim(this.options.publicAccessExtraSubPath, '/')}/${this.options.bucket}/${key}`;
            }
            else {
                url = `${this.options.endpoint}/${this.options.bucket}/${key}`;
            }
        }
        else {
            const endpoint = new URL(this.options.endpoint);
            const protocol = endpoint.protocol;
            const host = endpoint.host;
            if (this.options.publicAccessExtraSubPath) {
                url = `${protocol}//${this.options.bucket}.${host}/${trim(this.options.publicAccessExtraSubPath, '/')}/${key}`;
            }
            else {
                url = `${protocol}//${this.options.bucket}.${host}/${key}`;
            }
        }
        return {
            key,
            url: url,
            bucket: this.options.bucket
        };
    }
    async listObjects(params) {
        const { prefix } = params;
        let keys = [];
        let isTruncated = false;
        let continuationToken = undefined;
        do {
            const result = await this.client.send(new ListObjectsV2Command({
                Bucket: this.options.bucket,
                Prefix: prefix,
                ContinuationToken: continuationToken,
                MaxKeys: 1000
            }));
            if (!result.Contents || result.Contents.length === 0) {
                return {
                    bucket: this.options.bucket,
                    keys
                };
            }
            keys = keys.concat(result.Contents.map((content) => content.Key).filter(isNotNil));
            isTruncated = result.IsTruncated ?? false;
            continuationToken = result.NextContinuationToken;
        } while (isTruncated);
        return {
            bucket: this.options.bucket,
            keys
        };
    }
    async copyObjectInSelfBucket(params) {
        const { sourceKey, targetKey } = params;
        const encodedSourceKey = sourceKey
            .split('/')
            .map((segment) => encodeURIComponent(segment))
            .join('/');
        await this.client.send(new CopyObjectCommand({
            Bucket: this.options.bucket,
            CopySource: `${this.options.bucket}/${encodedSourceKey}`,
            Key: targetKey
        }));
        return {
            bucket: this.options.bucket,
            sourceKey,
            targetKey
        };
    }
    async destroy() {
        this.client.destroy();
    }
}
//# sourceMappingURL=aws-s3.adapter.js.map