#!/usr/bin/env bash
# Firebase Deployment Helper for TaskSync Cloud Functions

echo ""
echo "================================================================================"
echo "🚀 TASKSYNC CLOUD FUNCTION DEPLOYMENT GUIDE"
echo "================================================================================"
echo ""
echo "This script will help deploy the nearly-due task notification function."
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null
then
    echo "❌ Firebase CLI not found"
    echo ""
    echo "📦 Install Firebase CLI globally:"
    echo "   npm install -g firebase-tools"
    echo ""
    echo "Then re-run this script."
    exit 1
fi

echo "✅ Firebase CLI found: $(firebase --version)"
echo ""

# Check if authenticated
if ! firebase projects:list &> /dev/null
then
    echo "❌ Not authenticated with Firebase"
    echo ""
    echo "🔐 Authenticate with Firebase:"
    echo "   firebase login"
    echo ""
    echo "Then re-run this script."
    exit 1
fi

echo "✅ Firebase authenticated"
echo ""

# List projects
echo "📋 Available Firebase projects:"
firebase projects:list --json | jq -r '.result[] | "   • \(.projectId): \(.displayName)"' 2>/dev/null || firebase projects:list

echo ""
echo "================================================================================"
echo "📧 SMTP EMAIL CONFIGURATION"
echo "================================================================================"
echo ""
echo "The nearly-due task notifications require SMTP credentials."
echo ""
echo "Recommended: Use Gmail App Password"
echo ""
echo "Steps to get Gmail App Password:"
echo "  1. Enable 2-Factor Authentication on your Google Account"
echo "  2. Go to: https://myaccount.google.com/apppasswords"
echo "  3. Select 'Mail' and 'Windows Computer'"
echo "  4. Copy the 16-character app password"
echo ""
echo "Set the credentials (replace with your actual values):"
echo "  firebase functions:config:set smtp.user=\"your-email@gmail.com\" smtp.password=\"your-app-password\""
echo ""

# Check if config is already set
echo "Checking current configuration..."
SMTP_USER=$(firebase functions:config:get smtp.user 2>/dev/null || echo "")
if [ -z "$SMTP_USER" ]
then
    echo "⚠️  SMTP credentials not configured yet"
    echo ""
    echo "📝 Configure now or manually set later?"
    echo "   (You can still deploy and configure email later)"
else
    echo "✅ SMTP user configured: $SMTP_USER"
fi

echo ""
echo "================================================================================"
echo "🚀 READY TO DEPLOY"
echo "================================================================================"
echo ""
echo "Deploy command:"
echo "  firebase deploy --only functions"
echo ""
echo "After deployment:"
echo "  • Cloud Function will run every 1 hour automatically"
echo "  • View logs: firebase functions:log"
echo "  • To test: firebase emulators:start --only functions"
echo ""
