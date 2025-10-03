#!/usr/bin/env node

/**
 * Seed Firestore using the Firebase Admin SDK.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccount.json npm run seed:admin
 *
 * Optional environment variables:
 *   - FIREBASE_SERVICE_ACCOUNT_PATH: path to the service account JSON file
 *   - FIRESTORE_SEED_DATA_PATH: path to the seed data JSON file
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const resolvePath = (maybeRelative) => {
  if (!maybeRelative) {
    return null;
  }

  return path.isAbsolute(maybeRelative)
    ? maybeRelative
    : path.resolve(process.cwd(), maybeRelative);
};

const defaultServiceAccountPath = path.resolve(__dirname, '..', 'serviceAccount.json');
const defaultSeedDataPath = path.resolve(__dirname, '..', 'src', 'services', 'seed-data.json');

const serviceAccountPath = resolvePath(process.env.FIREBASE_SERVICE_ACCOUNT_PATH) || defaultServiceAccountPath;
const seedDataPath = resolvePath(process.env.FIRESTORE_SEED_DATA_PATH) || defaultSeedDataPath;

const loadJson = (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse JSON from ${filePath}: ${error.message}`);
  }
};

const serviceAccount = loadJson(serviceAccountPath);
const seedData = loadJson(seedDataPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

typeof seedData.achievements === 'undefined' && (seedData.achievements = []);
typeof seedData.unlockRules === 'undefined' && (seedData.unlockRules = []);

const seedCollection = async (collectionName, items, getId) => {
  if (!Array.isArray(items) || items.length === 0) {
    console.log(`No documents provided for ${collectionName}, skipping.`);
    return;
  }

  const batch = db.batch();
  items.forEach((item) => {
    const docId = getId(item);
    if (!docId) {
      console.warn(`Skipping item without ID in ${collectionName}:`, item);
      return;
    }

    const docRef = db.collection(collectionName).doc(docId);
    batch.set(docRef, item, { merge: true });
  });

  await batch.commit();
  console.log(`Seeded ${items.length} document(s) into ${collectionName}.`);
};

const main = async () => {
  console.log('Seeding Firestore using admin privileges...');
  await seedCollection('achievements', seedData.achievements, (item) => item.id);
  await seedCollection('unlock_rules', seedData.unlockRules, (item) => item.featureId || item.id);
  console.log('Firestore seeding complete.');
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
