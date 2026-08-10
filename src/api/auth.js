import crypto from 'node:crypto';
import { AppError } from './errors.js';

const encode = (value) => Buffer.from(value).toString('base64url');
const sign = (value, secret) => crypto.createHmac('sha256', secret).update(value).digest('base64url');

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function createToken(secret, ttlSeconds = 900, now = Date.now()) {
  const header = encode(JSON.stringify({ alg: 'HS256', typ: 'SNT' }));
  const payload = encode(JSON.stringify({ sub: 'private-app', exp: Math.floor(now / 1000) + ttlSeconds }));
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${sign(unsigned, secret)}`;
}

export function verifyToken(token, secret, now = Date.now()) {
  const [header, payload, signature, extra] = String(token ?? '').split('.');
  if (!header || !payload || !signature || extra) return false;
  const unsigned = `${header}.${payload}`;
  if (!safeEqual(signature, sign(unsigned, secret))) return false;
  try {
    const body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return body.sub === 'private-app' && Number(body.exp) > Math.floor(now / 1000);
  } catch {
    return false;
  }
}

export function createAuth(secret, ttlSeconds = 900) {
  if (!secret || secret.length < 24) throw new Error('API_SECRET must contain at least 24 characters');

  const issue = (request, response, next) => {
    const supplied = request.get('x-api-key') ?? '';
    if (!safeEqual(supplied, secret)) return next(new AppError(401, 'UNAUTHORIZED', 'Invalid API key'));
    return response.json({ token: createToken(secret, ttlSeconds), expiresIn: ttlSeconds });
  };

  const requireToken = (request, _response, next) => {
    const authorization = request.get('authorization') ?? '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!verifyToken(token, secret)) {
      return next(new AppError(401, 'UNAUTHORIZED', 'A valid session token is required'));
    }
    return next();
  };

  return { issue, requireToken };
}
