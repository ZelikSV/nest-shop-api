import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: configService.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: configService.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucket = configService.getOrThrow<string>('S3_BUCKET_NAME');
  }

  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 300,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async generatePresignedDownloadUrl(key: string, expiresIn = 604800): Promise<string> {
    const cloudfrontUrl = this.configService.get<string>('CLOUDFRONT_BASE_URL');
    if (cloudfrontUrl) {
      return `${cloudfrontUrl}/${key}`;
    }
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  getFileUrl(key: string): string {
    const cloudfrontUrl = this.configService.get<string>('CLOUDFRONT_BASE_URL');
    if (cloudfrontUrl) {
      return `${cloudfrontUrl}/${key}`;
    }
    const region = this.configService.getOrThrow<string>('AWS_REGION');
    return `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
  }
}
