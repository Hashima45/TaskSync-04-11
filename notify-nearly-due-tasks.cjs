#!/usr/bin/env node

/**
 * Production: Nearly-Due Task Notifications for GitHub Actions (Free!)
 */

const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

async function main() {
  console.log('🚀 Nearly-due notifications scan started');

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    throw new Error('SMTP_USER and SMTP_PASSWORD must be set');
  }

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  const db = admin.firestore();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });

  const now = new Date();
  const next24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const nowTs = admin.firestore.Timestamp.fromDate(now);
  const next24hTs = admin.firestore.Timestamp.fromDate(next24h);

  const usersSnap = await db.collection('users').get();
  let sent = 0;

  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data();
    if (!user.email) continue;

    // Flat 'tasks' collection filtered by user_id
    const tasksSnap = await db.collection('tasks')
      .where('user_id', '==', userDoc.id)
      .get();

    // Filter: not completed, not deleted, due within 24 hours
    const tasks = tasksSnap.docs
      .map(doc => doc.data())
      .filter(t => {
        if (t.status === 'completed') return false;
        if (t.deleted_at) return false;
        // due_at is a Firestore Timestamp
        const dueDate = t.due_at?.toDate ? t.due_at.toDate() : null;
        if (!dueDate) return false;
        return dueDate >= now && dueDate <= next24h;
      });

    if (tasks.length === 0) continue;

    console.log(`📧 Sending to ${user.email}: ${tasks.length} tasks`);

    const taskHtml = tasks.map(t => {
      const dueDate = t.due_at?.toDate ? t.due_at.toDate() : new Date(t.dueDate);
      const hoursLeft = Math.max(0, Math.round((dueDate - now) / (1000 * 60 * 60)));
      const priority = (t.priority_manual || 'medium').toUpperCase();
      const priorityColor = priority === 'HIGH' ? '#ef4444' : priority === 'LOW' ? '#22c55e' : '#f59e0b';
      return `
      <tr>
        <td style="padding: 12px; border-left: 4px solid #4f46e5;">
          <strong>${t.title}</strong>
          <br><span style="color: #666; font-size: 0.9em;">Due in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}</span>
        </td>
        <td style="padding: 12px; text-align: center;">
          <span style="background:${priorityColor};color:white;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">${priority}</span>
        </td>
        <td style="padding: 12px; text-align: right; font-size: 13px; color: #555;">
          ${dueDate.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </td>
      </tr>
    `;
    }).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; }
.header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 24px; text-align: center; }
.header h1 { margin: 0; font-size: 24px; }
.content { padding: 24px; }
.table { width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 8px; overflow: hidden; }
.cta { background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500; }
.footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 14px; color: #64748b; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Nearly Due Tasks</h1>
    </div>
    <div class="content">
      <p>Hi <strong>${user.name || 'User'}</strong>,</p>
      <p>You have <strong>${tasks.length}</strong> task(s) due in the next 24 hours:</p>
      <table class="table">
        <thead>
          <tr style="background: #e2e8f0;">
            <th style="padding: 12px; text-align: left;">Task</th>
            <th style="padding: 12px; text-align: center;">Priority</th>
            <th style="padding: 12px; text-align: right;">Due</th>
          </tr>
        </thead>
        <tbody>
          ${taskHtml}
        </tbody>
      </table>
      <p style="font-size: 14px; color: #64748b;">Stay organized!</p>
      <a href="https://tasksync-70aa9.web.app" class="cta">Open TaskSync</a>
    </div>
    <div class="footer">
      <p>TaskSync • Powered by GitHub Actions</p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"TaskSync" <${process.env.SMTP_USER}>`,
      replyTo: process.env.SMTP_USER,
      to: user.email,
      subject: `⏰ ${tasks.length} task(s) due soon`,
      html
    });

    sent++;
  }

  console.log(`✅ Scan complete. Sent ${sent} emails.`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

