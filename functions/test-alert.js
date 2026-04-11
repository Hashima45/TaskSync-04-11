const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tasksync-70aa9-firebase-adminsdk-fbsvc-9544c84015.json'), 'utf8')))
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'tasksyncscheduler@gmail.com',
    pass: 'aorqkvmtqurpahjl'
  }
});

(async () => {
  try {
    await transporter.sendMail({
      from: 'TaskSync <tasksyncscheduler@gmail.com>',
      to: '2302971@ub.edu.ph',
      subject: '⏰ Reminder: 2 task(s) due soon',
      html: `
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
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>📋 TaskSync</h1>
        <p>Your tasks need attention!</p>
      </div>

      <div class="content">
        <div class="greeting">
          Hi there! 👋
          <br><br>
          You have upcoming tasks that need your attention. Let's make sure nothing falls through the cracks!
        </div>

        <div class="task-count">
          <strong>2</strong> urgent task(s) waiting for you
        </div>

        <div style="background: #f9fafb; border-left: 4px solid #667eea; border-radius: 6px; padding: 16px; margin-bottom: 15px;">
          <div style="font-size: 16px; font-weight: 600; color: #1a202c; margin-bottom: 10px;">📌 Project Report</div>
          <div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px;">
            <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-weight: 600; text-transform: uppercase; background: #fee2e2; color: #b91c1c;">HIGH</span>
            <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-weight: 600; background: #e0e7ff; color: #4f46e5;">WORK</span>
            <span style="color: #666; display: flex; align-items: center; gap: 4px;">⏱️ Due in 8 hours</span>
          </div>
        </div>

        <div style="background: #f9fafb; border-left: 4px solid #667eea; border-radius: 6px; padding: 16px; margin-bottom: 15px;">
          <div style="font-size: 16px; font-weight: 600; color: #1a202c; margin-bottom: 10px;">🧪 Unit Tests</div>
          <div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px;">
            <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-weight: 600; text-transform: uppercase; background: #fef3c7; color: #b45309;">MEDIUM</span>
            <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-weight: 600; background: #e0e7ff; color: #4f46e5;">DEVELOPMENT</span>
            <span style="color: #666; display: flex; align-items: center; gap: 4px;">⏱️ Due in 18 hours</span>
          </div>
        </div>

        <div class="divider"></div>

        <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Don't let these tasks slip away! Review them now and stay on top of your productivity. 🚀
        </p>

        <center>
          <a href="https://tasksync-app.web.app" class="cta-button">
            View Tasks in TaskSync →
          </a>
        </center>
      </div>

      <div class="footer">
        <p><strong>TaskSync</strong> - Your AI-Powered Task Management</p>
        <p>Notifications • Scheduling • Smart Recommendations</p>
        <p style="margin-top: 10px; opacity: 0.7;">This is an automated notification. Please don't reply to this email.</p>
      </div>
    </div>
  </body>
</html>
      `
    });
    console.log('✅ Email sent with TaskSync aesthetic design!');
    process.exit(0);
  } catch (e) {
    console.error('❌', e.message);
    process.exit(1);
  }
})();
