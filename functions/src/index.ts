import {setGlobalOptions} from "firebase-functions";
import {onSchedule} from "firebase-functions/scheduler";
import {defineSecret} from "firebase-functions/params";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import * as nodemailer from "nodemailer";

setGlobalOptions({maxInstances: 10});

initializeApp();

// ==========================================
// EMAIL NOTIFICATION CONFIGURATION
// ==========================================

// Define secrets for SMTP credentials (set via Firebase CLI)
// Run: firebase functions:secrets:set SMTP_USER
// Run: firebase functions:secrets:set SMTP_PASSWORD
const smtpUser = defineSecret("SMTP_USER");
const smtpPassword = defineSecret("SMTP_PASSWORD");

// ==========================================
// SCHEDULED FUNCTION: Check for nearly-due tasks
// ==========================================
export const checkNearlyDueTasks = onSchedule(
  {
    // Run every hour
    schedule: "every 1 hours",
    timeZone: "Asia/Manila",
    secrets: [smtpUser, smtpPassword],
  },
  async () => {
    const db = getFirestore();
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Create transporter inside handler so secrets are resolved
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser.value(),
        pass: smtpPassword.value(),
      },
    });

    console.log(
      `⏰ Checking for tasks due between ${now.toISOString()} and ${tomorrow.toISOString()}...`
    );

    try {
      // Get all users
      const usersSnapshot = await db.collection("users").get();
      let totalNotifications = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userEmail = userData.email;
        const userName =
          userData.displayName || userData.email || "TaskSync User";
        const userId = userDoc.id;

        if (!userEmail) {
          console.log(`⚠️ User ${userId} has no email, skipping...`);
          continue;
        }

        // Get non-completed tasks for this user
        const tasksSnapshot = await db
          .collection("tasks")
          .where("user_id", "==", userId)
          .get();

        // Filter to nearly-due, non-completed, non-deleted tasks
        const nearlyDueTasks = tasksSnapshot.docs
          .map((doc) => ({id: doc.id, ...doc.data()}))
          .filter((task: any) => {
            // Skip completed or deleted tasks
            if (task.status === "completed") return false;
            if (task.deleted_at) return false;

            // Parse due date — Firestore stores as Timestamp (due_at)
            let dueDate: Date | null = null;
            if (task.due_at?.toDate) {
              dueDate = task.due_at.toDate();
            } else if (task.dueDate) {
              dueDate = new Date(task.dueDate);
            }

            if (!dueDate || isNaN(dueDate.getTime())) return false;

            return dueDate >= now && dueDate <= tomorrow;
          });

        // Send email if there are nearly-due tasks
        if (nearlyDueTasks.length > 0) {
          const sent = await sendNearlyDueNotification(
            transporter,
            smtpUser.value(),
            userEmail,
            userName,
            nearlyDueTasks
          );
          if (sent) totalNotifications++;
        }
      }

      console.log(
        `✅ Task check completed. Sent ${totalNotifications} notification(s).`
      );
    } catch (error) {
      console.error("❌ Error checking tasks:", error);
    }
  }
);

// ==========================================
// EMAIL HELPER FUNCTION
// ==========================================
async function sendNearlyDueNotification(
  transporter: nodemailer.Transporter,
  fromEmail: string,
  toEmail: string,
  userName: string,
  tasks: any[]
): Promise<boolean> {
  const taskList = tasks
    .map((task) => {
      let dueDate: Date;
      if (task.due_at?.toDate) {
        dueDate = task.due_at.toDate();
      } else {
        dueDate = new Date(task.dueDate);
      }

      const hoursUntilDue = Math.max(
        0,
        Math.round(
          (dueDate.getTime() - Date.now()) / (1000 * 60 * 60)
        )
      );
      const priority = (task.priority_manual || task.priority || "medium")
        .toUpperCase();

      const priorityColor =
        priority === "HIGH" ? "#ef4444" :
          priority === "LOW" ? "#22c55e" : "#f59e0b";

      return `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
        <strong style="color: #111827;">${task.title}</strong>
        <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">
          Due in <strong>${hoursUntilDue}</strong> hour${hoursUntilDue !== 1 ? "s" : ""}
        </div>
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="background: ${priorityColor}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">
          ${priority}
        </span>
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280; font-size: 13px;">
        ${dueDate.toLocaleDateString("en-US", {month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"})}
      </td>
    </tr>`;
    })
    .join("");

  const htmlContent = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 28px 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 700;">⏰ TaskSync Reminder</h1>
          <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">You have ${tasks.length} task${tasks.length !== 1 ? "s" : ""} due soon!</p>
        </div>

        <!-- Content -->
        <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin: 0 0 16px; color: #374151; font-size: 15px;">
            Hi <strong>${userName}</strong>,
          </p>
          <p style="margin: 0 0 20px; color: #6b7280; font-size: 14px;">
            The following task${tasks.length !== 1 ? "s are" : " is"} due within the next <strong>24 hours</strong>:
          </p>
          
          <!-- Task Table -->
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 10px 16px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 600;">Task</th>
                <th style="padding: 10px 16px; text-align: center; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 600;">Priority</th>
                <th style="padding: 10px 16px; text-align: right; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 600;">Due</th>
              </tr>
            </thead>
            <tbody>
              ${taskList}
            </tbody>
          </table>

          <!-- CTA Button -->
          <div style="text-align: center; margin-top: 28px;">
            <a href="https://tasksync-70aa9.web.app" style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
              Open TaskSync
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
          <p style="margin: 0;">TaskSync — AI-Powered Task Management</p>
          <p style="margin: 4px 0 0;">You're receiving this because you have tasks due soon.</p>
        </div>
      </div>
    </body>
  </html>`;

  const mailOptions = {
    from: `"TaskSync" <${fromEmail}>`,
    to: toEmail,
    subject: `⏰ TaskSync: ${tasks.length} task${tasks.length !== 1 ? "s" : ""} due soon`,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${toEmail} for ${tasks.length} task(s)`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending email to ${toEmail}:`, error);
    return false;
  }
}
