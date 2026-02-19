import { Body, Controller, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { FilesService } from './files.service';
import { PresignDto } from './dto/presign.dto';
import { PresignResponseDto } from './dto/presign-response.dto';
import { CompleteDto } from './dto/complete.dto';
import { FileRecord } from './file-record.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import { type AuthenticatedRequest } from 'src/common/types/authenticated-request.interface';

@ApiTags('Files v1')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseFilters(new HttpExceptionFilter())
@Controller({ path: 'files', version: '1' })
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('presign')
  @ApiOperation({
    summary: 'Generate presigned S3 upload URL',
    description:
      'Creates a FileRecord (status: pending) and returns a presigned PUT URL for direct S3 upload.',
  })
  @ApiResponse({ status: 201, type: PresignResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async presign(
    @Body() dto: PresignDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<PresignResponseDto> {
    return this.filesService.presign(req.user.id, dto.entityId, dto.contentType);
  }

  @Post('complete')
  @ApiOperation({
    summary: 'Mark file upload as complete',
    description: 'Transitions FileRecord from pending → ready and attaches it to the User entity.',
  })
  @ApiResponse({ status: 201, type: FileRecord })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'FileRecord not found' })
  async complete(@Body() dto: CompleteDto, @Req() req: AuthenticatedRequest): Promise<FileRecord> {
    return this.filesService.complete(dto.fileId, req.user.id);
  }
}
