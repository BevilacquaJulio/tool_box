import { SignJWT } from 'jose';
import type {
  GenerateRandomJwtInput,
  GenerateRandomJwtResult,
  HmacAlgorithm,
} from './types';

const SECRET_BYTE_LENGTH: Record<HmacAlgorithm, number> = {
  HS256: 32,
  HS384: 48,
  HS512: 64,
};

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

function randomSecret(algorithm: HmacAlgorithm): string {
  return randomToken(SECRET_BYTE_LENGTH[algorithm]);
}

function randomPayload(): Record<string, unknown> {
  return {
    sub: randomToken(4),
  };
}

export async function generateRandomJwt(
  input: GenerateRandomJwtInput,
): Promise<GenerateRandomJwtResult> {
  const secret = randomSecret(input.algorithm);
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
