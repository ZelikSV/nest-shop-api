import { ApiProperty } from '@nestjs/swagger';

export class PresignResponseDto {
  @ApiProperty({ description: 'FileRecord UUID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  fileId: string;

  @ApiProperty({ description: 'S3 object key', example: 'users/123/avatars/abc.jpg' })
  key: string;

  @ApiProperty({
    description: 'Presigned S3 upload URL (PUT this URL to upload the file directly)',
  })
  uploadUrl: string;

  @ApiProperty({ description: 'Content type', example: 'image/jpeg' })
  contentType: string;
}
