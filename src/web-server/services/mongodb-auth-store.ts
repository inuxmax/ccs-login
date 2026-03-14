import { MongoClient, type Collection } from 'mongodb';

export interface DashboardUserRecord {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  role: 'admin';
  provider: 'google';
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_MONGODB_URI = 'mongodb://admin:phamdat112233@160.25.166.9:27017/ccs?authSource=admin';
const DEFAULT_DB_NAME = 'ccs';
const COLLECTION_NAME = 'dashboard_users';

let cachedClient: MongoClient | null = null;
let cachedCollection: Collection<DashboardUserRecord> | null = null;

function getMongoUri(): string {
  return process.env.CCS_MONGODB_URI || DEFAULT_MONGODB_URI;
}

function getMongoDbName(): string {
  return process.env.CCS_MONGODB_DB || DEFAULT_DB_NAME;
}

async function getCollection(): Promise<Collection<DashboardUserRecord>> {
  if (cachedCollection) {
    return cachedCollection;
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(getMongoUri());
    await cachedClient.connect();
  }

  const db = cachedClient.db(getMongoDbName());
  const collection = db.collection<DashboardUserRecord>(COLLECTION_NAME);

  await collection.createIndex({ googleId: 1 }, { unique: true });
  await collection.createIndex({ email: 1 }, { unique: true });

  cachedCollection = collection;
  return collection;
}

export function isGoogleDashboardAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && getMongoUri().trim()
  );
}

export async function upsertGoogleDashboardUser(profile: {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}): Promise<DashboardUserRecord> {
  const collection = await getCollection();
  const now = new Date().toISOString();

  const existingUser = await collection.findOne({
    $or: [{ googleId: profile.googleId }, { email: profile.email }],
  });

  if (existingUser) {
    await collection.updateOne(
      { _id: existingUser._id },
      {
        $set: {
          googleId: profile.googleId,
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          role: 'admin',
          provider: 'google',
          lastLoginAt: now,
          updatedAt: now,
        },
      }
    );

    const user = await collection.findOne({ _id: existingUser._id });
    if (!user) {
      throw new Error('Failed to persist Google dashboard user');
    }

    return user;
  }

  const firstAdmin = await collection.findOne({}, { sort: { createdAt: 1 } });
  if (firstAdmin) {
    throw new Error('Không có quyền truy cập.');
  }

  await collection.insertOne({
    googleId: profile.googleId,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    role: 'admin',
    provider: 'google',
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
  });

  const user = await collection.findOne({ googleId: profile.googleId });
  if (!user) {
    throw new Error('Failed to persist Google dashboard user');
  }

  return user;
}
