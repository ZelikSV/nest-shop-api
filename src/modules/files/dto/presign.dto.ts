import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsUUID } from 'class-validator';

import { EntityType } from '../enums/entity-type.enum';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

export class PresignDto {
  @ApiProperty({
    description: 'Entity ID — User ID (for avatar) or Order ID (for invoice)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  entityId: string;

  @ApiProperty({
    description: 'Entity type: user (avatar) or order (invoice)',
    enum: EntityType,
    example: EntityType.USER,
  })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({
    description: 'File content type',
    enum: ALLOWED_CONTENT_TYPES,
    example: 'image/jpeg',
  })
  @IsIn(ALLOWED_CONTENT_TYPES)
  contentType: AllowedContentType;
}
