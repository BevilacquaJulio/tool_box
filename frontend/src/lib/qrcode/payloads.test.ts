import { describe, expect, it } from 'vitest';
import { buildQrPayload, crc16Ccitt } from './payloads';

describe('buildQrPayload', () => {
  it('monta payload de texto', () => {
    expect(buildQrPayload({ contentType: 'text', text: 'Ola mundo' })).toBe('Ola mundo');
  });

  it('monta payload de URL', () => {
    expect(buildQrPayload({ contentType: 'url', url: 'example.com' })).toBe('https://example.com/');
  });

  it('monta payload de Wi-Fi', () => {
    expect(
      buildQrPayload({
        contentType: 'wifi',
        ssid: 'MinhaRede',
        password: 'segredo123',
        encryption: 'WPA',
        hidden: false,
      }),
    ).toBe('WIFI:T:WPA;S:MinhaRede;P:segredo123;H:false;;');
  });

  it('monta payload de telefone', () => {
    expect(buildQrPayload({ contentType: 'phone', phone: '+5511999999999' })).toBe(
      'tel:+5511999999999',
    );
  });

  it('monta payload Pix com CRC', () => {
    const payload = buildQrPayload({
      contentType: 'pix',
      key: 'email@exemplo.com',
      merchantName: 'Loja Exemplo',
      merchantCity: 'Sao Paulo',
    });

    expect(payload.startsWith('000201')).toBe(true);
    expect(payload.endsWith(crc16Ccitt(payload.slice(0, -4)))).toBe(true);
  });
});

describe('crc16Ccitt', () => {
  it('calcula CRC16 conhecido', () => {
    expect(crc16Ccitt('123456789')).toBe('29B1');
  });
});
