import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AnalyzeMediaDto } from './dto/analyze-media.dto';
import { MediaExtractService } from './media-extract.service';
import { buildContentDisposition } from './media-extract.utils';

@ApiTags('media-extract')
@ApiSecurity('internal-api-key')
@Controller('media-extract')
export class MediaExtractController {
  constructor(private readonly mediaExtractService: MediaExtractService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  analyze(@Body() body: AnalyzeMediaDto) {
    return this.mediaExtractService.analyze(body.url, body.mode);
  }

  @Get('download/:token')
  async download(@Param('token') token: string, @Res() response: Response): Promise<void> {
    const result = await this.mediaExtractService.downloadByToken(token);

    response.setHeader('Content-Type', result.contentType);
    response.setHeader('Content-Disposition', buildContentDisposition(result.filename));
    response.setHeader('Cache-Control', 'no-store');
    if (result.contentLength !== undefined) {
      response.setHeader('Content-Length', String(result.contentLength));
    }

    const onClose = () => {
      if (!response.writableEnded) {
        result.abort?.();
      }
    };
    response.on('close', onClose);

    result.stream.on('error', () => {
      response.off('close', onClose);
      result.abort?.();
      if (!response.headersSent) {
        response.status(HttpStatus.BAD_GATEWAY).json({
          error: {
            code: 'DOWNLOAD_FAILED',
            message: 'Falha ao transferir a mídia solicitada.',
          },
        });
      } else if (!response.destroyed) {
        response.destroy();
      }
    });

    result.stream.pipe(response);
  }
}
