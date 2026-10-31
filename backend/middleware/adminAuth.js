import jwt from 'jsonwebtoken';

const ADMIN_TOKEN_ISSUER = 'dhanvo-admin';
const ADMIN_TOKEN_AUDIENCE = 'dhanvo-admin-portal';

function getAdminJwtSecret() {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('ADMIN_JWT_SECRET must contain at least 32 bytes');
  }
  return secret;
}

export function createAdminToken(email) {
  return jwt.sign(
    { role: 'admin', email },
    getAdminJwtSecret(),
    {
      subject: 'admin',
      issuer: ADMIN_TOKEN_ISSUER,
      audience: ADMIN_TOKEN_AUDIENCE,
      expiresIn: '1h',
    }
  );
}

export function requireAdmin(req, res, next) {
  let secret;
  try {
    secret = getAdminJwtSecret();
  } catch {
    return res.status(503).json({
      success: false,
      message: 'Admin access is not configured on the server',
    });
  }

  const authorization = req.get('authorization') || '';
  const [scheme, token, ...extra] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token || extra.length > 0) {
    return res.status(401).json({ success: false, message: 'Admin authentication required' });
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: ADMIN_TOKEN_ISSUER,
      audience: ADMIN_TOKEN_AUDIENCE,
    });
    const configuredEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    if (decoded.role !== 'admin' || decoded.sub !== 'admin' || decoded.email !== configuredEmail) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    req.admin = { email: decoded.email };
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Admin session is invalid or expired' });
  }
}
