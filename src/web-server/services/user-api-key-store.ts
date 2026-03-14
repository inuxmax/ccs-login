import crypto from 'crypto';
import { MongoClient, type Collection } from 'mongodb';

export interface UserApiKeyRecord {
  keyId: string;
  ownerId: string;
  ownerEmail: string;
  name: string;
  description: string;
  prefix: string;
  keyHash: string;
  lastFour: string;
  status: 'active' | 'revoked';
  scopes: string[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  metadata?: {
    source?: string;
  };
}

export interface UserApiKeyListItem {
  keyId: string;
  name: string;
  description: string;
  prefix: string;
  lastFour: string;
  status: 'active' | 'revoked';
  scopes: string[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface CreateUserApiKeyInput {
  ownerId: string;
  ownerEmail: string;
  name: string;
  description?: string;
  scopes?: string[];
}

export interface UpdateUserApiKeyInput {
  name?: string;
  description?: string;
}

const DEFAULT_MONGODB_URI = 'mongodb://admin:phamdat112233@160.25.166.9:27017/ccs?authSource=admin';
const DEFAULT_DB_NAME = 'ccs';
const COLLECTION_NAME = 'user_api_keys';

let cachedClient: MongoClient | null = null;
let cachedCollection: Collection<UserApiKeyRecord> | null = null;

function getMongoUri(): string {
  return process.env.CCS_MONGODB_URI || DEFAULT_MONGODB_URI;
}

function getMongoDbName(): string {
  return process.env.CCS_MONGODB_DB || DEFAULT_DB_NAME;
}

async function getCollection(): Promise<Collection<UserApiKeyRecord>> {
  if (cachedCollection) {
    return cachedCollection;
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(getMongoUri());
    await cachedClient.connect();
  }

  const db = cachedClient.db(getMongoDbName());
  const collection = db.collection<UserApiKeyRecord>(COLLECTION_NAME);

  await collection.createIndex({ keyId: 1 }, { unique: true });
  await collection.createIndex({ ownerId: 1, createdAt: -1 });
  await collection.createIndex({ ownerId: 1, status: 1, createdAt: -1 });

  cachedCollection = collection;
  return collection;
}

function normalizeScopes(scopes?: string[]): string[] {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return ['frontend'];
  }

  return Array.from(
    new Set(
      scopes
        .filter((scope): scope is string => typeof scope === 'string')
        .map((scope) => scope.trim())
        .filter((scope) => scope.length > 0)
    )
  );
}

function toListItem(record: UserApiKeyRecord): UserApiKeyListItem {
  return {
    keyId: record.keyId,
    name: record.name,
    description: record.description,
    prefix: record.prefix,
    lastFour: record.lastFour,
    status: record.status,
    scopes: record.scopes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastUsedAt: record.lastUsedAt,
    revokedAt: record.revokedAt,
  };
}

function generateKeyId(): string {
  return `uak_${Date.now().toString(36)}${crypto.randomBytes(6).toString('hex')}`;
}

function generateRawKey(keyId: string): string {
  const secret = crypto.randomBytes(24).toString('base64url');
  return `ccs_uak_${keyId}_${secret}`;
}

function hashRawKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

function validateName(name: string): string {
  const normalized = name.trim();
  if (!normalized) {
    throw new Error('Key name is required.');
  }
  if (normalized.length > 120) {
    throw new Error('Key name must be 120 characters or fewer.');
  }
  return normalized;
}

function validateDescription(description: string | undefined): string {
  const normalized = (description || '').trim();
  if (normalized.length > 500) {
    throw new Error('Description must be 500 characters or fewer.');
  }
  return normalized;
}

export async function listUserApiKeys(ownerId: string): Promise<UserApiKeyListItem[]> {
  const collection = await getCollection();
  const items = await collection.find({ ownerId }).sort({ createdAt: -1 }).toArray();
  return items.map(toListItem);
}

export async function createUserApiKey(
  input: CreateUserApiKeyInput
): Promise<{ item: UserApiKeyListItem; rawKey: string }> {
  const collection = await getCollection();
  const now = new Date().toISOString();
  const keyId = generateKeyId();
  const rawKey = generateRawKey(keyId);
  const prefix = `ccs_uak_${keyId}`;

  const record: UserApiKeyRecord = {
    keyId,
    ownerId: input.ownerId,
    ownerEmail: input.ownerEmail,
    name: validateName(input.name),
    description: validateDescription(input.description),
    prefix,
    keyHash: hashRawKey(rawKey),
    lastFour: rawKey.slice(-4),
    status: 'active',
    scopes: normalizeScopes(input.scopes),
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
    revokedAt: null,
    metadata: {
      source: 'dashboard',
    },
  };

  await collection.insertOne(record);

  return {
    item: toListItem(record),
    rawKey,
  };
}

export async function updateUserApiKey(
  ownerId: string,
  keyId: string,
  input: UpdateUserApiKeyInput
): Promise<UserApiKeyListItem | null> {
  const collection = await getCollection();
  const existing = await collection.findOne({ ownerId, keyId });

  if (!existing) {
    return null;
  }

  const update: Partial<UserApiKeyRecord> = {
    updatedAt: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    update.name = validateName(input.name);
  }

  if (input.description !== undefined) {
    update.description = validateDescription(input.description);
  }

  await collection.updateOne({ ownerId, keyId }, { $set: update });

  const updated = await collection.findOne({ ownerId, keyId });
  return updated ? toListItem(updated) : null;
}

export async function revokeUserApiKey(
  ownerId: string,
  keyId: string
): Promise<UserApiKeyListItem | null> {
  const collection = await getCollection();
  const existing = await collection.findOne({ ownerId, keyId });

  if (!existing) {
    return null;
  }

  if (existing.status === 'revoked') {
    return toListItem(existing);
  }

  const now = new Date().toISOString();
  await collection.updateOne(
    { ownerId, keyId },
    {
      $set: {
        status: 'revoked',
        revokedAt: now,
        updatedAt: now,
      },
    }
  );

  const updated = await collection.findOne({ ownerId, keyId });
  return updated ? toListItem(updated) : null;
}
