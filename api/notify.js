import admin from 'firebase-admin';
import nodemailer from 'nodemailer';

let db;

function initializeFirebase() {
  if (!admin.apps.length) {
    let serviceAccount;
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (err) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', err);
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON');
      }
    } else {
      throw new Error('FIREBASE_SERVICE_ACCOUNT not set');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  
  return admin.firestore();
}

async function sendNearlyDueNotification(transporter, fromEmail, toEmail, userName, tasks) {
  const taskList = tasks
    .map((task) => {
      let dueDate;
      if (task.due_at?.toDate) {
        dueDate = task.due_at.toDate();
      } else {
        dueDate = new Date(task.dueDate);
      }

      const hoursUntilDue = Math.max(
        0,
        Math.round((dueDate.getTime() - Date.now()) / (1000 * 60 * 60))
      );
      const priority = (task.priority_manual || task.priority || 'medium').toUpperCase();
      const priorityColor =
        priority === 'HIGH' ? '#ef4444' :
        priority === 'LOW' ? '#22c55e' : '#f59e0b';

      return `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
        <strong>${task.title}</strong>
        <br><span style="color: #666; font-size: 0.9em;">Due in ${hoursUntilDue} hour${hoursUntilDue !== 1 ? 's' : ''}</span>
      </td>
      <td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #e5e7eb;">
        <span style="background:${priorityColor};color:white;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;">${priority}</span>
      </td>
      <td style="padding: 12px 16px; text-align: right; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #555;">
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
      <p>Hi <strong>${userName || 'User'}</strong>,</p>
      <p>You have <strong>${tasks.length}</strong> task(s) due in the next 24 hours:</p>
      <table class="table">
        <thead>
          <tr style="background: #e2e8f0;">
            <th style="padding: 12px 16px; text-align: left;">Task</th>
            <th style="padding: 12px 16px; text-align: center;">Priority</th>
            <th style="padding: 12px 16px; text-align: right;">Due</th>
          </tr>
        </thead>
        <tbody>
          ${taskList}
        </tbody>
      </table>
      <p style="font-size: 14px; color: #64748b;">Stay organized and manage your time effectively!</p>
      <a href="https://tasksync-70aa9.web.app" class="cta">Open TaskSync</a>
    </div>
    <div class="footer">
      <p>TaskSync • Powered by Vercel Cron</p>
    </div>
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"TaskSync" <${fromEmail}>`,
      replyTo: fromEmail,
      to: toEmail,
      subject: `⏰ ${tasks.length} task(s) due soon`,
      html
    });
    
    console.log(`📧 Email sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send email to ${toEmail}:`, error);
    return false;
  }
}

export default async function handler(req, res) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🚀 Nearly-due notifications scan started');

  try {
    db = initializeFirebase();

    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;

    if (!smtpPassword || !smtpUser) {
      throw new Error('SMTP credentials not set');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPassword
      }
    });

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    console.log(`⏰ Checking for tasks due between ${now.toISOString()} and ${tomorrow.toISOString()}...`);

    const usersSnapshot = await db.collection('users').get();
    let totalNotifications = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userEmail = userData.email;
      const userName = userData.displayName || userData.email || 'TaskSync User';
      const userId = userDoc.id;

      if (!userEmail) {
        console.log(`⚠️ User ${userId} has no email, skipping...`);
        continue;
      }

      const tasksSnapshot = await db
        .collection('tasks')
        .where('user_id', '==', userId)
        .get();

      const nearlyDueTasks = tasksSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((task) => {
          if (task.status === 'completed') return false;
          if (task.deleted_at) return false;

          let dueDate = null;
          if (task.due_at?.toDate) {
            dueDate = task.due_at.toDate();
          } else if (task.dueDate) {
            dueDate = new Date(task.dueDate);
          }

          if (!dueDate || isNaN(dueDate.getTime())) return false;
          return dueDate >= now && dueDate <= tomorrow;
        });

      if (nearlyDueTasks.length > 0) {
        const sent = await sendNearlyDueNotification(
          transporter,
          smtpUser,
          userEmail,
          userName,
          nearlyDueTasks
        );
        if (sent) totalNotifications++;
      }
    }

    console.log(`✅ Scan complete. Sent ${totalNotifications} notification(s).`);
    res.status(200).json({
      success: true,
      message: `Sent ${totalNotifications} notification(s)`
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      error: error.message || 'Unknown error'
    });
  }
}
