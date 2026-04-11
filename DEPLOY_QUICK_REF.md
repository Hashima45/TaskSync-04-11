# DEPLOYMENT QUICK REFERENCE

## 📋 Pre-Deployment Checklist
- [x] Cloud Function code written and ready
- [x] TypeScript compiled successfully  
- [x] Firebase CLI installed globally
- [ ] Firebase authenticated (need to do this)
- [ ] SMTP credentials configured (optional)

## ⚡ Quick Start (3 Steps)

### Step 1: Authenticate
```bash
firebase login
```
(Browser will open - sign in with your Google account)

### Step 2: Set Email Credentials (Optional)
```bash
firebase functions:config:set ^
  smtp.user="your-email@gmail.com" ^
  smtp.password="your-16-char-app-password"
```

### Step 3: Deploy
```bash
cd functions
npm run deploy
```

Or:
```bash
firebase deploy --only functions
```

## 🎯 Expected Success Output

```
✔  Deploy complete!

Function URL (checkNearlyDueTasks):
https://us-central1-tasksync-70aa9.cloudfunctions.net/checkNearlyDueTasks

Deployed functions in project tasksync-70aa9:
  checkNearlyDueTasks (HTTPS, public)
```

## 📧 Get Gmail App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" and select your device
3. Copy the 16-character password
4. Use in: `smtp.password="<paste-here>"`

## 📊 After Deployment

View logs:
```bash
firebase functions:log
```

List functions:
```bash
firebase functions:list
```

Reconfigure email:
```bash
firebase functions:config:set smtp.user="..." smtp.password="..."
firebase deploy --only functions
```

---

## 📝 Full Deployment Guide
See: DEPLOYMENT_GUIDE.md
