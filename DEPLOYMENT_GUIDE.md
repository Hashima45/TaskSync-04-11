# 🚀 Firebase Cloud Function Deployment Guide

## Current Status
✅ Cloud Function code: Ready  
✅ Code compiled: No errors  
✅ Firebase CLI: Installed globally  
❌ Firebase authentication: Required  

## Step 1: Authenticate with Firebase

Run this command in your terminal:

```bash
firebase login
```

This will:
1. Open your default browser automatically
2. Ask you to sign in with your Google account
3. Ask for permission to access Firebase
4. Return a confirmation token to the terminal

**Important:** Use the Google account that owns your Firebase project (tasksync-70aa9)

## Step 2: Configure SMTP Email (Optional but Recommended)

The nearly-due task notification system needs email credentials. You have two options:

### Option A: Using Gmail (Simplest)

1. **Get Gmail App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Make sure 2-Step Verification is ON (if not, enable it first)
   - Select "Mail" and "Windows Computer"
   - Google will generate a 16-character app password
   - Copy this password

2. **Set in Firebase:**
   ```bash
   firebase functions:config:set smtp.user="your-email@gmail.com" smtp.password="your-16-char-password"
   ```

### Option B: Using SendGrid or Other SMTP

If you prefer a different email service, set your SMTP credentials:
   ```bash
   firebase functions:config:set smtp.user="your-email@sendgrid.com" smtp.password="your-api-key"
   ```

### Option C: Deploy without Email Now, Configure Later

You can deploy first and configure email anytime:
   ```bash
   firebase deploy --only functions
   ```

Then configure email whenever you're ready.

## Step 3: Deploy the Cloud Function

Run this command from the project root directory:

```bash
firebase deploy --only functions
```

Expected output:
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/tasksync-70aa9
Function URL: [your-function-url]
```

## Step 4: Verify Deployment

Check that the function deployed successfully:

```bash
firebase functions:list
```

You should see:
```
checkNearlyDueTasks     HTTPS    Zone: us-central1
```

View function logs (new logs appear in real-time):

```bash
firebase functions:log
```

## ✨ Next Steps After Successful Deployment

Once deployed, the `checkNearlyDueTasks` function will:
- Run automatically every 1 hour
- Check all users' tasks in Firestore
- Send emails for tasks due within 24 hours
- Continue running 24/7 without any user interaction

### To Test

1. Create a task in TaskSync
2. Set the due date to sometime in the next 24 hours
3. Wait up to 1 hour for the Cloud Function to run
4. Check the email account for the notification

### To View Logs

```bash
firebase functions:log
```

Shows real-time logs of function executions.

### To Reconfigure Email Later

```bash
firebase functions:config:set smtp.user="newemail@gmail.com" smtp.password="newpassword"
firebase deploy --only functions
```

---

## 🔗 Useful Links

- Firebase Console: https://console.firebase.google.com
- Your Project: https://console.firebase.google.com/project/tasksync-70aa9
- Gmail App Passwords: https://myaccount.google.com/apppasswords
- Firebase CLI Docs: https://firebase.google.com/docs/cli

## ❓ Troubleshooting

**"firebase is not recognized"**
- Add Firebase CLI to PATH or use npx firebase instead
- Restart your terminal

**"You do not have permission to create this project"**
- Make sure you're logged in with the correct Google account
- Run `firebase logout` then `firebase login` again

**"SMTP credentials not working"**
- Double-check the email and password
- For Gmail, make sure you're using an App Password, not your regular password
- Make sure 2-Step Verification is enabled on your Google Account

**"Function not receiving email config"**
- After setting config, redeploy: `firebase deploy --only functions`
- Check logs: `firebase functions:log`
