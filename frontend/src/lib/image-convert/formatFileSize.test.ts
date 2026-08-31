import { describe, expect, it } from 'vitest';
import { detectImageFormat, formatFileSize } from './index';

describe('formatFileSize', () => {
  it('formata bytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
  });

  it('formata kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });

  it('formata megabytes', () => {
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.00 MB');
  });
});

describe('detectImageFormat', () => {
  it('detecta extensao png', () => {
    const file = new File([''], 'logo.png', { type: 'image/png' });
    expect(detectImageFormat(file)).toBe('png');
  });

  it('normaliza jpeg para jpg', () => {
    const file = new File([''], 'foto.jpeg', { type: 'image/jpeg' });
    expect(detectImageFormat(file)).toBe('jpg');
  });
});
