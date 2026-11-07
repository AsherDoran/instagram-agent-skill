import { randomBytes } from 'node:crypto';
console.log(`ADMIN_PASSWORD=${randomBytes(12).toString('base64url')}`);
console.log(`SESSION_SECRET=${randomBytes(32).toString('base64url')}`);
console.log(`ENCRYPTION_KEY=${randomBytes(32).toString('hex')}`);
