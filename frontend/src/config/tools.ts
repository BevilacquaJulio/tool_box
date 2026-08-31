import { BracketsCurly, Database, Files, GitDiff, Hash, Key, Palette, QrCode, type Icon } from '@phosphor-icons/react';

export type ToolDefinition = {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  path: string;
  icon: Icon;
  available: boolean;
  tags: string[];
  category: 'Segurança' | 'Criação' | 'Dados' | 'Arquivos';
  processing: 'local' | 'hybrid';
  featured: boolean;
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
    tags: ['bcrypt', 'argon2', 'scrypt'],
    category: 'Segurança',
    processing: 'local',
    featured: false,
  },
  {
    id: 'jwt',
    title: 'Gerador de JWT',
    description:
      'Gere tokens JWT com segredo e claims aleatórios. Escolha o nível HMAC adequado para cada teste.',
    shortDescription: 'Gera tokens e segredos para testes de autenticação.',
    path: '/jwt',
    icon: Key,
    available: true,
    tags: ['token', 'auth'],
    category: 'Segurança',
    processing: 'local',
    featured: false,
  },
  {
    id: 'qrcode',
    title: 'QR Code',
    description:
      'Gere QR Codes para URL, texto, Wi-Fi, Pix, vCard, e-mail e telefone. Exporte PNG ou SVG localmente.',
    shortDescription: 'QR Code para URL, Pix, Wi-Fi, vCard e mais. Exporta PNG ou SVG.',
    path: '/qrcode',
    icon: QrCode,
    available: true,
    tags: ['url', 'wifi', 'pix', 'vcard', 'png', 'svg'],
    category: 'Criação',
    processing: 'local',
    featured: true,
  },
  {
    id: 'json',
    title: 'JSON Formatter',
    description:
      'Formate, minifique, valide e converta JSON, YAML, XML e CSV com indicação precisa de erros.',
    shortDescription: 'Formata, valida e converte JSON, YAML, XML e CSV.',
    path: '/json',
    icon: BracketsCurly,
    available: true,
    tags: ['json', 'yaml', 'xml', 'csv', 'format', 'validate'],
    category: 'Dados',
    processing: 'local',
    featured: true,
  },
  {
    id: 'diff',
    title: 'Comparador de textos',
    description:
      'Compare textos e códigos lado a lado, destaque mudanças e exporte o resultado em HTML.',
    shortDescription: 'Diff lado a lado com destaque de alterações.',
    path: '/diff',
    icon: GitDiff,
    available: true,
    tags: ['diff', 'compare', 'code', 'text', 'highlight'],
    category: 'Dados',
    processing: 'local',
    featured: false,
  },
  {
    id: 'colors',
    title: 'Laboratório de cores',
    description:
      'Converta HEX, RGB, HSL, HSV e CMYK. Crie paletas, verifique contraste e ajuste luminosidade.',
    shortDescription: 'Converte HEX, RGB, HSL e monta paletas com checagem de contraste.',
    path: '/colors',
    icon: Palette,
    available: true,
    tags: ['hex', 'rgb', 'hsl', 'wcag', 'palette', 'picker'],
    category: 'Criação',
    processing: 'local',
    featured: true,
  },
  {
    id: 'convert',
    title: 'Conversor de arquivos',
    description:
      'Converta imagens, documentos e planilhas em formatos úteis, direto no navegador.',
    shortDescription: 'Converte imagens, documentos e planilhas no navegador.',
    path: '/converter',
    icon: Files,
    available: true,
    tags: ['png', 'webp', 'pdf', 'docx', 'xlsx', 'csv', 'json', 'xml', 'md', 'html'],
    category: 'Arquivos',
    processing: 'local',
    featured: true,
  },
  {
    id: 'db-verify',
    title: 'Verificacao de banco',
    description:
      'Teste host, banco, usuario e senha MySQL com diagnostico rigoroso de conexao, schema e permissoes basicas.',
    shortDescription: 'Valida conexao MySQL com teste completo via API interna.',
    path: '/db-verify',
    icon: Database,
    available: true,
    tags: ['mysql', 'database', 'connection', 'host', 'credentials'],
    category: 'Dados',
    processing: 'hybrid',
    featured: false,
  },
];
