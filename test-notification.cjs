#!/usr/bin/env node

/**
 * Local Test Script: Send Test Notification Email
 * Run this to test email notifications without GitHub Actions
 */

const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Load Firebase credentials
const serviceAccountPath = path.join(__dirname, 'tasksync-70aa9-firebase-adminsdk-fbsvc-9544c84015.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Configure email transporter
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: '2002188@ub.edu.ph',
    pass: 'xtgsfplcuhtnisrw',
  },
});

async function sendTestNotification() {
  console.log('\n🧪 Testing Nearly-Due Task Notification System\n');

  const testEmail = '2002188@ub.edu.ph';
  const testTasks = [
    {
      title: '📝 Complete Project Report',
      category: 'Work',
      dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
    },
    {
      title: '🧪 Run Unit Tests',
      category: 'Development',
      dueDate: new Date(Date.now() + 18 * 60 * 60 * 1000), // 18 hours from now
    },
  ];

  try {
    // Build task list HTML
    const taskList = testTasks
      .map(
        (task) =>
          `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
          <strong>${task.title}</strong>
          <br/>
          <small style="color: #666;">${task.category || 'No category'}</small>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: right;">
          ${task.dueDate.toLocaleDateString()}
        </td>
      </tr>
    `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background-color: #f9fafb; padding: 20px; }
            .footer { background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .cta-button { background-color: #4f46e5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; }
            .test-badge { color: #f59e0b; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 TaskSync - Nearly Due Tasks <span class="test-badge">[TEST]</span></h1>
            </div>
            <div class="content">
              <p>Hi <strong>Test User</strong>,</p>
              <p>This is a <strong>TEST</strong> notification. You have <strong>${testTasks.length}</strong> task(s) due in the next 24 hours:</p>
              
              <table>
                <thead>
                  <tr style="background-color: #e5e7eb;">
                    <th style="padding: 10px; text-align: left;">Task</th>
                    <th style="padding: 10px; text-align: right;">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${taskList}
                </tbody>
              </table>

              <p>This is how your real notifications will look! The system will send you these emails automatically when tasks are due within 24 hours.</p>
              
              <a href="https://mittenlike-stealable-fredrick.ngrok-free.app" class="cta-button">View in TaskSync</a>
            </div>
            <div class="footer">
              <p>TaskSync - Your AI-Powered Task Management</p>
              <p>This is a test notification for development purposes.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log('📧 Sending test email to:', testEmail);
    
    await emailTransporter.sendMail({
      from: '2002188@ub.edu.ph',
      to: testEmail,
      subject: '⏰ TEST: 2 task(s) due soon',
      html: htmlContent,
    });

    console.log('✅ Test email sent successfully!');
    console.log('\n📬 Check your inbox at 2002188@ub.edu.ph for the test email.\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error sending test email:', error.message);
    process.exit(1);
  }
}

// Run the test
sendTestNotification();
