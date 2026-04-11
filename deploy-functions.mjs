/**
 * Deploys Firebase Cloud Functions using service account credentials (ADC)
 */

import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Use global firebase-tools installation path
const FIREBASE_TOOLS_PATH = 'C:/Users/ANGEL/AppData/Roaming/npm/node_modules/firebase-tools';

const SERVICE_ACCOUNT_PATH = resolve(__dirname, 'tasksync-70aa9-firebase-adminsdk-fbsvc-9544c84015.json');
const PROJECT_ID = 'tasksync-70aa9';

// Set credentials for Application Default Credentials
process.env.GOOGLE_APPLICATION_CREDENTIALS = SERVICE_ACCOUNT_PATH;
process.env.GCLOUD_PROJECT = PROJECT_ID;
process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: PROJECT_ID });

console.log('\n================================================================================');
console.log('🚀 DEPLOYING CLOUD FUNCTIONS with Service Account Auth');
console.log('================================================================================');
console.log(`\n📁 Service Account: ${SERVICE_ACCOUNT_PATH}`);
console.log(`🔥 Project: ${PROJECT_ID}\n`);

try {
  const firebaseTools = require(FIREBASE_TOOLS_PATH);

  console.log('⏳ Deploying functions...\n');

  await firebaseTools.deploy({
    project: PROJECT_ID,
    only: 'functions',
    cwd: __dirname,
    force: true,
  });

  console.log('\n✅ Cloud Functions deployed successfully!');
  console.log('\n📋 Deployed: checkNearlyDueTasks');
  console.log('   Schedule: Every 1 hour');
  console.log('   Purpose: Sends email notifications for tasks due within 24 hours');
  console.log('\n🔗 View in Firebase Console:');
  console.log(`   https://console.firebase.google.com/project/${PROJECT_ID}/functions`);

} catch (error) {
  console.error('\n❌ Deployment failed:', error.message);

  if (error.message.includes('authenticate') || error.message.includes('login')) {
    console.log('\n📋 Manual deployment required:');
    console.log('   1. Open a terminal');
    console.log('   2. Run: firebase login');
    console.log('   3. Sign in with your Google account');
    console.log('   4. Run: firebase deploy --only functions');
  }

  process.exit(1);
}
