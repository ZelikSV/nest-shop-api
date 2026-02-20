import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CompleteDto {
  @ApiProperty({
    description: 'FileRecord UUID to mark as ready',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  fileId: string;
}
