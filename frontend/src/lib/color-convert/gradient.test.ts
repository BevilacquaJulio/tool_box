import { describe, expect, it } from 'vitest';
import {
  buildConicGradient,
  buildCssVariable,
  buildGradientCss,
  buildLinearGradient,
  buildRadialGradient,
  buildSvgGradient,
  buildTailwindClass,
  formatStopList,
  type GradientConfig,
  type GradientStop,
} from './gradient';

const stops: GradientStop[] = [
  { id: '1', color: '#3B82F6', position: 0 },
  { id: '2', color: '#9333EA', position: 100 },
];

const config: GradientConfig = {
  type: 'linear',
  stops,
  angle: 135,
  centerX: 50,
  centerY: 50,
};

describe('gradient', () => {
  it('formata stops ordenados por posicao', () => {
    const unordered: GradientStop[] = [
      { id: '2', color: '#9333EA', position: 100 },
      { id: '1', color: '#3B82F6', position: 0 },
    ];

    expect(formatStopList(unordered)).toBe('#3B82F6 0%, #9333EA 100%');
  });

  it('gera linear-gradient', () => {
    expect(buildLinearGradient(config)).toBe('linear-gradient(135deg, #3B82F6 0%, #9333EA 100%)');
  });

  it('gera radial-gradient', () => {
    expect(buildRadialGradient({ ...config, type: 'radial', centerX: 30, centerY: 70 })).toBe(
      'radial-gradient(circle at 30% 70%, #3B82F6 0%, #9333EA 100%)',
    );
  });

  it('gera conic-gradient', () => {
    expect(buildConicGradient({ ...config, type: 'conic', angle: 0 })).toBe(
      'conic-gradient(from 0deg at 50% 50%, #3B82F6 0%, #9333EA 100%)',
    );
  });

  it('gera variavel CSS', () => {
    expect(buildCssVariable(config)).toContain('--gradient: linear-gradient(135deg, #3B82F6 0%, #9333EA 100%)');
  });

  it('gera classe Tailwind arbitraria', () => {
    expect(buildTailwindClass(config)).toBe('bg-[linear-gradient(135deg,#3B82F6_0%,#9333EA_100%)]');
  });

  it('gera SVG linear', () => {
    const svg = buildSvgGradient(config);
    expect(svg).toContain('<linearGradient');
    expect(svg).toContain('stop-color="#3B82F6"');
  });

  it('usa helper principal', () => {
    expect(buildGradientCss({ ...config, type: 'radial' })).toContain('radial-gradient');
  });
});
