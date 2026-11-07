import { randomBytes } from 'node:crypto';
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex');
process.env.SESSION_SECRET = randomBytes(24).toString('base64url');
process.env.DATABASE_PATH = ':memory:';
process.env.AI_PROVIDER = 'rules';
