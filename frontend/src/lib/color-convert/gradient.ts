export type GradientType = 'linear' | 'radial' | 'conic';

export type GradientStop = {
  id: string;
  color: string;
  position: number;
};

export type GradientConfig = {
  type: GradientType;
  stops: GradientStop[];
  angle: number;
  centerX: number;
  centerY: number;
};

export type GradientOutputs = {
  css: string;
  cssVariable: string;
  tailwind: string;
  svg: string;
  backgroundImage: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeHex(color: string): string {
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const hex = trimmed.slice(1);
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toUpperCase();
  }
  return trimmed;
}

export function sortStops(stops: GradientStop[]): GradientStop[] {
  return [...stops].sort((left, right) => left.position - right.position);
}

export function formatStopList(stops: GradientStop[]): string {
  return sortStops(stops)
    .map((stop) => `${normalizeHex(stop.color)} ${clamp(stop.position, 0, 100)}%`)
    .join(', ');
}

export function buildLinearGradient(config: GradientConfig): string {
  return `linear-gradient(${config.angle}deg, ${formatStopList(config.stops)})`;
}

export function buildRadialGradient(config: GradientConfig): string {
  const centerX = clamp(config.centerX, 0, 100);
  const centerY = clamp(config.centerY, 0, 100);
  return `radial-gradient(circle at ${centerX}% ${centerY}%, ${formatStopList(config.stops)})`;
}

export function buildConicGradient(config: GradientConfig): string {
  const centerX = clamp(config.centerX, 0, 100);
  const centerY = clamp(config.centerY, 0, 100);
  return `conic-gradient(from ${config.angle}deg at ${centerX}% ${centerY}%, ${formatStopList(config.stops)})`;
}

export function buildGradientCss(config: GradientConfig): string {
  switch (config.type) {
    case 'radial':
      return buildRadialGradient(config);
    case 'conic':
      return buildConicGradient(config);
    default:
      return buildLinearGradient(config);
  }
}

export function buildCssVariable(config: GradientConfig, name = '--gradient'): string {
  return `:root {\n  ${name}: ${buildGradientCss(config)};\n}\n\nbackground: var(${name});`;
}

export function buildTailwindClass(config: GradientConfig): string {
  const gradient = buildGradientCss(config).replace(/,\s+/g, ',').replace(/ /g, '_');
  return `bg-[${gradient}]`;
}

function linearCoords(angle: number): { x1: string; y1: string; x2: string; y2: string } {
  const radians = ((angle - 90) * Math.PI) / 180;
  const x = Math.cos(radians);
  const y = Math.sin(radians);
  const x1 = `${50 - x * 50}%`;
  const y1 = `${50 - y * 50}%`;
  const x2 = `${50 + x * 50}%`;
  const y2 = `${50 + y * 50}%`;
  return { x1, y1, x2, y2 };
}

export function buildSvgGradient(config: GradientConfig, width = 800, height = 600): string {
  const sorted = sortStops(config.stops);
  const stopsMarkup = sorted
    .map(
      (stop) =>
        `      <stop offset="${clamp(stop.position, 0, 100)}%" stop-color="${normalizeHex(stop.color)}" />`,
    )
    .join('\n');

  if (config.type === 'linear') {
    const coords = linearCoords(config.angle);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="gradient" x1="${coords.x1}" y1="${coords.y1}" x2="${coords.x2}" y2="${coords.y2}">
${stopsMarkup}
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#gradient)" />
</svg>`;
  }

  if (config.type === 'radial') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <radialGradient id="gradient" cx="${clamp(config.centerX, 0, 100)}%" cy="${clamp(config.centerY, 0, 100)}%" r="70%">
${stopsMarkup}
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#gradient)" />
</svg>`;
  }

  const cssGradient = buildConicGradient(config);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;background:${cssGradient};"></div>
  </foreignObject>
</svg>`;
}

export function buildGradientOutputs(config: GradientConfig): GradientOutputs {
  const css = buildGradientCss(config);
  return {
    css,
    cssVariable: buildCssVariable(config),
    tailwind: buildTailwindClass(config),
    svg: buildSvgGradient(config),
    backgroundImage: css,
  };
}

function parseHexChannel(value: string): number {
  return Number.parseInt(value, 16);
}

function hexToRgbaChannels(hex: string): { r: number; g: number; b: number; a: number } {
  const normalized = normalizeHex(hex).replace('#', '');
  return {
    r: parseHexChannel(normalized.slice(0, 2)),
    g: parseHexChannel(normalized.slice(2, 4)),
    b: parseHexChannel(normalized.slice(4, 6)),
    a: 1,
  };
}

export async function renderGradientPng(
  config: GradientConfig,
  width = 800,
  height = 600,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas não suportado neste navegador.');
  }

  const sorted = sortStops(config.stops);

  if (config.type === 'linear') {
    const radians = ((config.angle - 90) * Math.PI) / 180;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const x = Math.cos(radians);
    const y = Math.sin(radians);
    const gradient = context.createLinearGradient(
      halfWidth - x * halfWidth,
      halfHeight - y * halfHeight,
      halfWidth + x * halfWidth,
      halfHeight + y * halfHeight,
    );

    for (const stop of sorted) {
      const { r, g, b, a } = hexToRgbaChannels(stop.color);
      gradient.addColorStop(clamp(stop.position, 0, 100) / 100, `rgba(${r}, ${g}, ${b}, ${a})`);
    }

    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  } else if (config.type === 'radial') {
    const centerX = (clamp(config.centerX, 0, 100) / 100) * width;
    const centerY = (clamp(config.centerY, 0, 100) / 100) * height;
    const radius = Math.max(width, height) * 0.7;
    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);

    for (const stop of sorted) {
      const { r, g, b, a } = hexToRgbaChannels(stop.color);
      gradient.addColorStop(clamp(stop.position, 0, 100) / 100, `rgba(${r}, ${g}, ${b}, ${a})`);
    }

    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  } else {
    const centerX = (clamp(config.centerX, 0, 100) / 100) * width;
    const centerY = (clamp(config.centerY, 0, 100) / 100) * height;
    const gradient = context.createConicGradient(
      (config.angle * Math.PI) / 180,
      centerX,
      centerY,
    );

    for (const stop of sorted) {
      const { r, g, b, a } = hexToRgbaChannels(stop.color);
      gradient.addColorStop(clamp(stop.position, 0, 100) / 100, `rgba(${r}, ${g}, ${b}, ${a})`);
    }

    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Não foi possível gerar o PNG.'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

export function downloadGradientPng(config: GradientConfig, filename = 'gradient.png'): Promise<void> {
  return renderGradientPng(config).then((blob) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  });
}

export function createDefaultGradientStops(): GradientStop[] {
  return [
    { id: crypto.randomUUID(), color: '#3B82F6', position: 0 },
    { id: crypto.randomUUID(), color: '#9333EA', position: 100 },
  ];
}

export const GRADIENT_TYPES: Array<{ value: GradientType; label: string }> = [
  { value: 'linear', label: 'Linear' },
  { value: 'radial', label: 'Radial' },
  { value: 'conic', label: 'Cônico' },
];
