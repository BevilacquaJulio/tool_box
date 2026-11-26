import { describe, expect, it } from 'vitest';
import {
  formatMediaDuration,
  getMediaDownloadLabel,
  getMediaKindLabel,
  getPlatformLabel,
} from './format';

describe('media-extract format helpers', () => {
  it('formata duração em minutos e horas corretamente', () => {
    expect(formatMediaDuration(0)).toBe('0:00');
    expect(formatMediaDuration(65)).toBe('1:05');
    expect(formatMediaDuration(3661)).toBe('1:01:01');
    expect(formatMediaDuration(undefined)).toBeNull();
    expect(formatMediaDuration(-5)).toBeNull();
  });

  it('retorna rótulos em português para plataformas, tipos e ação de download', () => {
    expect(getPlatformLabel('youtube')).toBe('YouTube');
    expect(getPlatformLabel('direct')).toBe('Arquivo direto');
    expect(getPlatformLabel('generic')).toBe('Link genérico');
    expect(getMediaKindLabel('video')).toBe('Vídeo');
    expect(getMediaKindLabel('audio')).toBe('Áudio');
    expect(getMediaKindLabel('image')).toBe('Imagem');
    expect(getMediaKindLabel('unknown')).toBe('Mídia');
    expect(getMediaDownloadLabel('audio')).toBe('Baixar áudio');
    expect(getMediaDownloadLabel('video')).toBe('Baixar vídeo');
    expect(getMediaDownloadLabel('image')).toBe('Baixar imagem');
  });
});
