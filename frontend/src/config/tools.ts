import {
  BracketsCurly,
  Database,
  Files,
  FilmStrip,
  GitDiff,
  Hash,
  Key,
  Palette,
  QrCode,
  type Icon,
} from '@phosphor-icons/react';

export type ToolCategory = 'Segurança' | 'Dados' | 'Arquivos' | 'Criação';

export const TOOL_CATEGORIES: readonly ToolCategory[] = [
  'Segurança',
  'Dados',
  'Arquivos',
  'Criação',
];

export type ToolDefinition = {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  path: string;
  icon: Icon;
  available: boolean;
  tags: string[];
  category: ToolCategory;
  processing: 'local' | 'hybrid';
  featured: boolean;
  shortcutNumber: number;
};

export const tools: ToolDefinition[] = [
  {
    id: 'hash',
    title: 'Hash de senha',
    description:
      'Identifique bcrypt, Argon2, scrypt e outros formatos. Gere um novo hash com o mesmo algoritmo e os mesmos parâmetros.',
    shortDescription: 'Identifica algoritmo e gera hash compatível com o original.',
    path: '/hash',
    icon: Hash,
    available: true,
    tags: ['bcrypt', 'argon2', 'scrypt', 'pbkdf2', 'md5', 'sha256'],
    category: 'Segurança',
    processing: 'local',
    featured: false,
    shortcutNumber: 1,
  },
  {
    id: 'jwt',
    title: 'Gerador de JWT',
    description:
      'Gere tokens JWT com segredo e claims aleatórios. Escolha o nível HMAC adequado para cada teste.',
    shortDescription: 'Gera tokens e segredos HMAC para testes de autenticação.',
    path: '/jwt',
    icon: Key,
    available: true,
    tags: ['token', 'auth', 'hs256', 'hs384', 'hs512', 'hmac'],
    category: 'Segurança',
    processing: 'local',
    featured: false,
    shortcutNumber: 2,
  },
  {
    id: 'json',
    title: 'JSON Formatter',
    description:
      'Formate, minifique, valide e converta JSON, YAML, XML e CSV com indicação precisa de linha e coluna.',
    shortDescription: 'Formata, valida, ordena chaves e converte JSON, YAML, XML e CSV.',
    path: '/json',
    icon: BracketsCurly,
    available: true,
    tags: ['json', 'yaml', 'xml', 'csv', 'format', 'validate'],
    category: 'Dados',
    processing: 'local',
    featured: true,
    shortcutNumber: 3,
  },
  {
    id: 'diff',
    title: 'Comparador de textos',
    description:
      'Compare textos e códigos lado a lado, destaque diferenças por caractere e exporte em HTML ou patch.',
    shortDescription: 'Diff lado a lado com realce por caractere e exportação.',
    path: '/diff',
    icon: GitDiff,
    available: true,
    tags: ['diff', 'compare', 'code', 'patch', 'highlight'],
    category: 'Dados',
    processing: 'local',
    featured: false,
    shortcutNumber: 4,
  },
  {
    id: 'db-verify',
    title: 'Verificação de banco',
    description:
      'Teste host, banco, usuário e senha MySQL/MariaDB com diagnóstico de TCP, TLS, schema, privilégios e escrita temporária.',
    shortDescription: 'Diagnóstico MySQL/MariaDB de conexão, TLS e privilégios via API interna.',
    path: '/db-verify',
    icon: Database,
    available: true,
    tags: ['mysql', 'mariadb', 'database', 'tls', 'connection'],
    category: 'Dados',
    processing: 'hybrid',
    featured: false,
    shortcutNumber: 5,
  },
  {
    id: 'convert',
    title: 'Conversor de arquivos',
    description:
      'Converta imagens (PNG, WebP, AVIF, HEIC, RAW) e documentos (PDF, DOCX, XLSX, CSV, Markdown, HTML) direto no navegador.',
    shortDescription: 'Converte imagens, documentos e planilhas localmente em lote ou individual.',
    path: '/converter',
    icon: Files,
    available: true,
    tags: ['png', 'webp', 'heic', 'pdf', 'docx', 'xlsx', 'csv', 'md'],
    category: 'Arquivos',
    processing: 'local',
    featured: true,
    shortcutNumber: 6,
  },
  {
    id: 'media-extract',
    title: 'Extrator de mídia',
    description:
      'Analise links públicos do YouTube, Instagram, TikTok e arquivos diretos para inspecionar metadados e baixar com segurança via API interna.',
    shortDescription: 'Extrai metadados e baixa vídeos, áudios ou imagens públicas por URL.',
    path: '/media-extract',
    icon: FilmStrip,
    available: true,
    tags: ['youtube', 'instagram', 'tiktok', 'video', 'mp4', 'audio', 'download', 'url'],
    category: 'Arquivos',
    processing: 'hybrid',
    featured: true,
    shortcutNumber: 7,
  },
  {
    id: 'qrcode',
    title: 'QR Code',
    description:
      'Gere QR Codes para URL, texto, Wi-Fi, Pix, vCard, e-mail e telefone. Exporte em PNG ou SVG localmente.',
    shortDescription: 'QR Code para URL, Pix, Wi-Fi, vCard e mais em PNG ou SVG.',
    path: '/qrcode',
    icon: QrCode,
    available: true,
    tags: ['url', 'wifi', 'pix', 'vcard', 'png', 'svg'],
    category: 'Criação',
    processing: 'local',
    featured: true,
    shortcutNumber: 8,
  },
  {
    id: 'colors',
    title: 'Laboratório de cores',
    description:
      'Converta HEX, RGB, HSL, HSV e CMYK. Monte paletas, valide contraste WCAG e construa degradês CSS e Tailwind.',
    shortDescription: 'Converte formatos, valida contraste WCAG e gera paletas e degradês.',
    path: '/colors',
    icon: Palette,
    available: true,
    tags: ['hex', 'rgb', 'hsl', 'cmyk', 'wcag', 'gradient'],
    category: 'Criação',
    processing: 'local',
    featured: true,
    shortcutNumber: 9,
  },
];
