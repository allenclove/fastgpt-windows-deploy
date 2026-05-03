import OSS from 'ali-oss';
import { camelCase, difference, kebabCase } from 'es-toolkit';
import { DEFAULT_PRESIGNED_URL_EXPIRED_SECONDS } from '../constants';
export class OssStorageAdapter {
    options;
    client;
    constructor(options) {
        this.options = options;
        if (options.vendor !== 'oss') {
            throw new Error('Invalid storage vendor');
        }
        this.client = new OSS({
            accessKeyId: options.credentials.accessKeyId,
            accessKeySecret: options.credentials.secretAccessKey,
            region: options.region,
            endpoint: options.endpoint,
            bucket: options.bucket,
            cname: options.cname,
            internal: options.internal,
            secure: options.secure,
            // @ts-expect-error ali-oss SDK 类型未定义但存在此属性
            enableProxy: options.proxy ? true : false
        });
    }
    get bucketName() {
        return this.options.bucket;
    }
    async checkObjectExists(params) {
        const { key } = params;
        let exists = false;
        try {
            await this.client.head(key);
            exists = true;
        }
        catch (error) {
            if (error?.code === 'NoSuchKey') {
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
        const result = await this.client.head(key);
        let metadata = {};
        if (result.meta) {
            for (const [k, v] of Object.entries(result.meta)) {
                if (!k)
                    continue;
                metadata[camelCase(k)] = String(v);
            }
        }
        const headers = result.res.headers;
        return {
            key,
            metadata,
            etag: result.meta?.etag,
            bucket: this.options.bucket,
            contentType: headers['content-type'],
            contentLength: headers['content-length'] ? Number(headers['content-length']) : undefined
        };
    }
    async ensureBucket() {
        await this.client.getBucketInfo(this.options.bucket);
        return {
            exists: true,
            created: false,
            bucket: this.options.bucket
        };
    }
    async uploadObject(params) {
        const { key, body, contentType, contentLength, contentDisposition, metadata } = params;
        const headers = {
            'x-oss-storage-class': 'Standard',
            'x-oss-forbid-overwrite': 'false'
        };
        if (contentType)
            headers['Content-Type'] = contentType;
        if (contentLength !== undefined)
            headers['Content-Length'] = String(contentLength);
        if (contentDisposition)
            headers['Content-Disposition'] = contentDisposition;
        let meta = {};
        if (metadata) {
            for (const [k, v] of Object.entries(metadata)) {
                if (!k)
                    continue;
                meta[kebabCase(k)] = String(v);
            }
        }
        await this.client.put(key, body, {
            headers,
            mime: contentType,
            meta
        });
        return {
            key,
            bucket: this.options.bucket
        };
    }
    async downloadObject(params) {
        const { key } = params;
        const result = await this.client.getStream(key);
        return {
            key,
            bucket: this.options.bucket,
            body: result.stream
        };
    }
    async deleteObject(params) {
        const { key } = params;
        await this.client.delete(key);
        return {
            bucket: this.options.bucket,
            key
        };
    }
    async deleteObjectsByMultiKeys(params) {
        const { keys } = params;
        const result = await this.client.deleteMulti(keys, { quiet: true });
        return {
            bucket: this.options.bucket,
            keys: difference(keys, result.deleted ?? [])
        };
    }
    async deleteObjectsByPrefix(params) {
        const { prefix } = params;
        if (!prefix) {
            throw new Error('Prefix is required');
        }
        const fails = [];
        let marker = undefined;
        let isTruncated = false;
        do {
            const listResponse = await this.client.list({
                prefix,
                'max-keys': 1000,
                marker
            }, {
                timeout: 60000
            });
            if (!listResponse.objects || listResponse.objects.length === 0) {
                return {
                    bucket: this.options.bucket,
                    keys: []
                };
            }
            const objectsToDelete = listResponse.objects.map((object) => object.name);
            const deleteResponse = await this.deleteObjectsByMultiKeys({ keys: objectsToDelete });
            fails.push(...deleteResponse.keys);
            isTruncated = listResponse.isTruncated ?? false;
            marker = listResponse.nextMarker;
        } while (isTruncated);
        return {
            bucket: this.options.bucket,
            keys: fails
        };
    }
    async generatePresignedPutUrl(params) {
        const { key, expiredSeconds, metadata, contentType } = params;
        const expiresIn = expiredSeconds ? expiredSeconds : DEFAULT_PRESIGNED_URL_EXPIRED_SECONDS;
        const headersToSign = {};
        if (metadata) {
            for (const [k, v] of Object.entries(metadata)) {
                if (!k)
                    continue;
                headersToSign[`x-oss-meta-${kebabCase(k)}`] = String(v);
            }
        }
        if (contentType) {
            headersToSign['Content-Type'] = contentType;
        }
        // @ts-expect-error ali-oss SDK 类型未定义但存在此方法
        // @see https://github.com/ali-sdk/ali-oss?tab=readme-ov-file#signatureurlv4method-expires-request-objectname-additionalheaders
        const url = await this.client.signatureUrlV4('PUT', expiresIn, {
            headers: {
                ...headersToSign
            }
        }, key);
        return {
            key,
            url: url,
            bucket: this.options.bucket,
            metadata: headersToSign
        };
    }
    async generatePresignedGetUrl(params) {
        const { key, expiredSeconds } = params;
        const expiresIn = expiredSeconds ? expiredSeconds : DEFAULT_PRESIGNED_URL_EXPIRED_SECONDS;
        const url = this.client.signatureUrl(key, {
            method: 'GET',
            expires: expiresIn
        });
        return {
            key,
            url: url,
            bucket: this.options.bucket
        };
    }
    generatePublicGetUrl(params) {
        const { key } = params;
        let protocol = 'https:';
        if (!this.options.secure) {
            protocol = 'http:';
        }
        let url;
        if (this.options.cname) {
            url = `${protocol}//${this.options.endpoint}/${key}`;
        }
        else {
            url = `${protocol}//${this.options.bucket}.${this.options.region}.aliyuncs.com/${key}`;
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
        let marker = undefined;
        let isTruncated = false;
        do {
            const listResponse = await this.client.list({
                prefix,
                'max-keys': 1000,
                marker
            }, {
                timeout: 60000
            });
            if (!listResponse.objects || listResponse.objects.length === 0) {
                return {
                    bucket: this.options.bucket,
                    keys: []
                };
            }
            keys = keys.concat(listResponse.objects.map((object) => object.name));
            isTruncated = listResponse.isTruncated ?? false;
            marker = listResponse.nextMarker;
        } while (isTruncated);
        return {
            keys,
            bucket: this.options.bucket
        };
    }
    async copyObjectInSelfBucket(params) {
        const { sourceKey, targetKey } = params;
        await this.client.copy(targetKey, sourceKey);
        return {
            bucket: this.options.bucket,
            sourceKey,
            targetKey
        };
    }
    async destroy() { }
}
//# sourceMappingURL=oss.adapter.js.map