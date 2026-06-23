// Cifrado en reposo de los tokens OAuth de Mercado Pago (AES-256-GCM).
// La clave (MP_TOKEN_ENC_KEY, base64 de 32 bytes) vive solo en el env de Vercel;
// la DB guarda únicamente el ciphertext. Cifrado/descifrado SOLO server-side.
//
// Formato del ciphertext (texto): base64(iv).base64(tag).base64(data)
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12; // recomendado para GCM

function clave(): Buffer {
  const b64 = process.env.MP_TOKEN_ENC_KEY;
  if (!b64) throw new Error('Falta MP_TOKEN_ENC_KEY');
  const key = Buffer.from(b64, 'base64');
  if (key.length !== 32) throw new Error('MP_TOKEN_ENC_KEY debe ser base64 de 32 bytes');
  return key;
}

export function cifrar(texto: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, clave(), iv);
  const data = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${data.toString('base64')}`;
}

export function descifrar(blob: string): string {
  const [ivB64, tagB64, dataB64] = blob.split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Token cifrado con formato inválido');
  const decipher = createDecipheriv(ALGO, clave(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
