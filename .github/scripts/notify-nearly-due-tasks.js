#!/usr/bin/env node

/**
 * GitHub Actions Script: Notify users of nearly-due tasks
 * Runs every hour to check for tasks due within 24 hours and send email notifications
 */

import admin from 'firebase-admin';
import nodemailer from 'nodemailer';

// Initialize Firebase Admin
let serviceAccount;
try {
  const secretJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!secretJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
  }
  serviceAccount = JSON.parse(secretJson);
  console.log('✅ Firebase credentials loaded successfully');
} catch (error) {
  console.error('❌ Failed to parse Firebase credentials:', error.message);
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  console.log('✅ Firebase Admin SDK initialized');
  console.log(`   Project ID: ${serviceAccount.project_id}`);
  console.log(`   Service Account Email: ${serviceAccount.client_email}`);
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
  process.exit(1);
}

const db = admin.firestore();

// Configure email transporter
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'tasksyncscheduler@gmail.com',
    pass: 'aorqkvmtqurpahjl',
  },
});

async function sendNearlyDueNotification(email, userName, tasks) {
  // Helper function to get priority badge color
  function getPriorityBadge(priority) {
    const p = (priority || 'medium').toLowerCase();
    if (p === 'high') return { background: '#fee2e2', color: '#b91c1c', text: 'HIGH' };
    if (p === 'low') return { background: '#dcfce7', color: '#15803d', text: 'LOW' };
    return { background: '#fef3c7', color: '#b45309', text: 'MEDIUM' };
  }

  // Generate task cards
  const taskCards = tasks
    .map((task) => {
      const dueDate = task.due_at?.toDate?.() ?? new Date(task.dueDate);
      const now = new Date();
      const hoursUntilDue = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
      const priority = getPriorityBadge(task.priority);
      const category = task.category || 'General';
      
      return `
        <div style="background: #f9fafb; border-left: 4px solid #667eea; border-radius: 6px; padding: 16px; margin-bottom: 15px;">
          <div style="font-size: 16px; font-weight: 600; color: #1a202c; margin-bottom: 10px;">
            ${task.title}
          </div>
          <div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px;">
            <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-weight: 600; text-transform: uppercase; background: ${priority.background}; color: ${priority.color};">
              ${priority.text}
            </span>
            <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-weight: 600; background: #e0e7ff; color: #4f46e5;">
              ${category}
            </span>
            <span style="color: #666; display: flex; align-items: center; gap: 4px;">
              ⏱️ Due in ${hoursUntilDue} hours
            </span>
          </div>
        </div>
      `;
    })
    .join('');

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f7fa; }
      .container { max-width: 600px; margin: 0 auto; background: white; }
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 40px 30px;
        text-align: center;
        color: white;
      }
      .header h1 {
        font-size: 28px;
        margin-bottom: 8px;
        font-weight: 700;
      }
      .header p {
        font-size: 14px;
        opacity: 0.95;
      }
      .content {
        padding: 40px 30px;
      }
      .greeting {
        font-size: 16px;
        color: #333;
        margin-bottom: 25px;
        line-height: 1.6;
      }
      .task-count {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        margin-bottom: 25px;
        font-size: 14px;
        text-align: center;
      }
      .task-count strong {
        font-size: 20px;
      }
      .cta-button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 14px 28px;
        text-decoration: none;
        border-radius: 8px;
        display: inline-block;
        margin-top: 25px;
        font-weight: 600;
        font-size: 14px;
        border: none;
        cursor: pointer;
      }
      .footer {
        background: #f9fafb;
        padding: 25px 30px;
        text-align: center;
        color: #666;
        font-size: 12px;
        border-top: 1px solid #e5e7eb;
      }
      .footer p {
        margin: 5px 0;
      }
      .divider {
        height: 1px;
        background: #e5e7eb;
        margin: 20px 0;
      }
      @media (max-width: 600px) {
        .container { max-width: 100%; }
        .content { padding: 25px 20px; }
        .header { padding: 30px 20px; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <!-- Header -->
      <div class="header">
        <h1>📋 TaskSync</h1>
        <p>Your tasks need attention!</p>
      </div>

      <!-- Content -->
      <div class="content">
        <div class="greeting">
          Hi <strong>${userName}</strong>! 👋
          <br><br>
          You have <strong>${tasks.length}</strong> task(s) due within the next 24 hours. Let's make sure nothing falls through the cracks!
        </div>

        <div class="task-count">
          <strong>${tasks.length}</strong> urgent task(s) waiting for you
        </div>

        <!-- Task Items -->
        ${taskCards}

        <div class="divider"></div>

        <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Stay focused and productive! Review these tasks now to avoid missing any deadlines. 🚀
        </p>

        <center>
          <a href="https://tasksync-app.web.app" class="cta-button">
            View Tasks in TaskSync →
          </a>
        </center>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p><strong>TaskSync</strong> - Your AI-Powered Task Management</p>
        <p>Notifications • Scheduling • Smart Recommendations</p>
        <p style="margin-top: 10px; opacity: 0.7;">This is an automated notification. Please don't reply to this email.</p>
      </div>
    </div>
  </body>
</html>
  `;

  try {
    await emailTransporter.sendMail({
      from: 'TaskSync <tasksyncscheduler@gmail.com>',
      to: email,
      subject: `⏰ Reminder: ${tasks.length} task(s) due soon`,
      html: htmlContent,
    });
    console.log(`✅ Email sent to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${email}:`, error);
  }
}

async function checkNearlyDueTasks() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  console.log(`\n⏰ Checking for tasks due between ${now.toISOString()} and ${tomorrow.toISOString()}...`);

  try {
    // Test Firestore connection with a simple read
    console.log('📡 Testing Firestore connection...');
    const testDoc = await db.collection('_test').doc('connection').get();
    console.log('✅ Firestore connection successful');

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users`);

    let totalNotificationsSent = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userEmail = userData.email;
      const userName = userData.displayName || userData.email;
      const userId = userDoc.id;

      if (!userEmail) {
        console.log(`⚠️ User ${userId} has no email, skipping...`);
        continue;
      }

      // Get non-completed tasks for this user
      const tasksSnapshot = await db
        .collection('tasks')
        .where('user_id', '==', userId)
        .where('status', '!=', 'completed')
        .get();

      // Filter tasks due within 24 hours
      const nearlyDueTasks = tasksSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((task) => {
          const dueDate = task.due_at?.toDate?.() ?? (task.dueDate ? new Date(task.dueDate) : null);
          if (!dueDate || Number.isNaN(dueDate.getTime())) return false;
          const isDueWithin24h = dueDate >= now && dueDate <= tomorrow;
          return isDueWithin24h;
        })
        .sort((a, b) => {
          const dateA = a.due_at?.toDate?.() ?? new Date(a.dueDate);
          const dateB = b.due_at?.toDate?.() ?? new Date(b.dueDate);
          return dateA - dateB;
        });

      // Send email if there are nearly-due tasks
      if (nearlyDueTasks.length > 0) {
        console.log(
          `📧 User ${userName} has ${nearlyDueTasks.length} nearly-due task(s)`
        );
        await sendNearlyDueNotification(userEmail, userName, nearlyDueTasks);
        totalNotificationsSent++;
      } else {
        console.log(`✓ User ${userName} has no nearly-due tasks`);
      }
    }

    console.log(
      `\n✅ Check completed! Sent ${totalNotificationsSent} notification(s)\n`
    );
  } catch (error) {
    console.error('❌ Error checking nearly-due tasks:', error);
    process.exit(1);
  }
}

// Run the check
checkNearlyDueTasks().then(() => process.exit(0));
