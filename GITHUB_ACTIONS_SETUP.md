# GitHub Actions - Nearly-Due Task Notifications Setup

This GitHub Actions workflow automatically sends email notifications to users when they have tasks due within the next 24 hours. It runs **every hour** completely free!

## Setup Instructions

### Step 1: Get Your Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/project/tasksync-70aa9/settings/serviceaccounts/adminsdk)
2. Click **"Generate New Private Key"**
3. A JSON file will download — **keep it safe!**

### Step 2: Convert the Service Account Key

The downloaded JSON needs to be a single-line string for GitHub Secrets:

**Windows (PowerShell):**
```powershell
$json = Get-Content "path\to\downloaded\key.json" -Raw
$escaped = $json -replace '"', '\"' -replace "`n", "\n"
$escaped | Set-Clipboard
```

**Mac/Linux:**
```bash
cat path/to/downloaded/key.json | jq -c . | pbcopy
```

### Step 3: Add GitHub Secrets

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"** and add these 3 secrets:

| Secret Name | Value |
|-------------|-------|
| `FIREBASE_SERVICE_ACCOUNT` | The JSON string from Step 2 |
| `SMTP_USER` | Your Gmail address (e.g., `your-email@gmail.com`) |
| `SMTP_PASSWORD` | Your Gmail [App Password](https://support.google.com/accounts/answer/185833) |

### Step 4: Test the Workflow

1. Go to your repo → **Actions** tab
2. Click **"Send Nearly-Due Task Notifications"**
3. Click **"Run workflow"** → **"Run workflow"**
4. Watch it run (should complete in ~30 seconds)

### Step 5: Automatic Scheduling

The workflow will now run **automatically every hour** starting at the top of each hour (UTC).

To change the schedule, edit `.github/workflows/notify-nearly-due-tasks.yml`:

```yaml
schedule:
  - cron: '0 * * * *'  # Every hour at :00
  # Examples:
  # - cron: '0 9 * * *'   # Daily at 9 AM UTC
  # - cron: '0 */6 * * *'  # Every 6 hours
```

## Troubleshooting

### ❌ Workflow fails - "Unauthorized"

**Solution:** Check that your `FIREBASE_SERVICE_ACCOUNT` secret is correctly formatted (single-line JSON string with escaped quotes and newlines).

### ❌ Emails not sending

**Possible causes:**
1. **SMTP credentials wrong** — verify Gmail address and app password are correct
2. **Gmail 2FA not enabled** — Google requires [App Passwords](https://support.google.com/accounts/answer/185833)
3. **Email service issue** — check GitHub Actions logs for details

### ✅ Everything works!

Emails will be sent to users' registered email addresses in Firebase whenever they have tasks due within 24 hours.

## Cost

**Completely free!** GitHub Actions provides 2,000 monthly action minutes for free accounts, and this workflow uses only ~30 seconds per run.

- 60 runs/month × 30 seconds = 30 minutes/month ✅
- Still plenty of minutes left for other workflows

## Notes

- Workflow runs in **UTC timezone** — adjust cron schedule if needed
- First run will be at the top of the next hour
- Check **Actions** tab to view logs and execution history
