import { SignJWT } from 'jose';
import type { GenerateRandomJwtInput, GenerateRandomJwtResult } from './types';
import { DEFAULT_SECRET_LENGTH, MAX_SECRET_LENGTH, MIN_SECRET_LENGTH } from './types';

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomToken(length: number): string {
  return toBase64Url(randomBytes(length));
}

// Cada caractere base64url de bytes aleatórios carrega 6 bits uniformes; cortar no tamanho pedido mantém isso.
function randomSecret(length: number): string {
  return randomToken(Math.ceil((length * 3) / 4)).slice(0, length);
}

function randomPayload(): Record<string, unknown> {
  return {
    sub: randomToken(4),
  };
}

export async function generateRandomJwt(
  input: GenerateRandomJwtInput,
): Promise<GenerateRandomJwtResult> {
  const min = MIN_SECRET_LENGTH[input.algorithm];
  const length = input.secretLength ?? DEFAULT_SECRET_LENGTH[input.algorithm];
  if (!Number.isInteger(length) || length < min || length > MAX_SECRET_LENGTH) {
    throw new Error(
      `O segredo de ${input.algorithm} precisa ter entre ${min} e ${MAX_SECRET_LENGTH} caracteres.`,
    );
  }

  const secret = randomSecret(length);
  const payload = randomPayload();

  const header = {
    alg: input.algorithm,
  };

  const key = new TextEncoder().encode(secret);
  const token = await new SignJWT(payload).setProtectedHeader(header).sign(key);

  return {
    token,
    secret,
    algorithm: input.algorithm,
  };
}
