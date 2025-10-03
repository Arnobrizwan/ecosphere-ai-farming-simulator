#!/bin/bash

# EcoSphere AI Farming Simulator - Deployment Script
# Deploy to Firebase (Firestore rules + Cloud Functions)

set -e

echo "🚀 EcoSphere Deployment Script"
echo "================================"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Login to Firebase (if not already logged in)
echo "🔐 Checking Firebase authentication..."
firebase login --reauth

# Select project
echo "📋 Select Firebase project..."
firebase use --add

# Install Cloud Functions dependencies
echo "📦 Installing Cloud Functions dependencies..."
cd functions
npm install
cd ..

# Deploy Firestore rules
echo "🔥 Deploying Firestore security rules..."
firebase deploy --only firestore:rules

# Deploy Cloud Functions
echo "☁️ Deploying Cloud Functions..."
firebase deploy --only functions

# Deploy indexes (if any)
echo "📑 Deploying Firestore indexes..."
firebase deploy --only firestore:indexes

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📊 Next steps:"
echo "  1. Verify Firestore rules: https://console.firebase.google.com"
echo "  2. Test Cloud Functions in Firebase Console"
echo "  3. Monitor function logs: firebase functions:log"
echo ""
echo "🧪 To test locally:"
echo "  firebase emulators:start"
echo ""
