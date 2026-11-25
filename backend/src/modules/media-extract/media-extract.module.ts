import { Module } from '@nestjs/common';
import { DownloadTokenService } from './download-token.service';
import { MediaExtractController } from './media-extract.controller';
import { MediaExtractService } from './media-extract.service';
import { PlatformExtractorsService } from './platform-extractors.service';
import { RemoteFetchService } from './remote-fetch.service';
import { YtdlpService } from './ytdlp.service';

@Module({
  controllers: [MediaExtractController],
  providers: [
    MediaExtractService,
    PlatformExtractorsService,
    RemoteFetchService,
    DownloadTokenService,
    YtdlpService,
  ],
})
export class MediaExtractModule {}
