@echo off
REM Firebase Deployment Helper for TaskSync Cloud Functions - Windows

echo.
echo ================================================================================
echo 🚀 TASKSYNC CLOUD FUNCTION DEPLOYMENT GUIDE
echo ================================================================================
echo.
echo This script will help deploy the nearly-due task notification function.
echo.

REM Check if Firebase CLI is installed
where firebase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Firebase CLI not found
    echo.
    echo 📦 Install Firebase CLI globally:
    echo    npm install -g firebase-tools
    echo.
    echo Then re-run this script.
    exit /b 1
)

echo ✅ Firebase CLI installed
echo.

REM Check if authenticated
firebase projects:list >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Not authenticated with Firebase
    echo.
    echo 🔐 Authenticate with Firebase:
    echo    firebase login
    echo.
    echo Then re-run this script.
    exit /b 1
)

echo ✅ Firebase authenticated
echo.

echo ================================================================================
echo 📧 SMTP EMAIL CONFIGURATION
echo ================================================================================
echo.
echo The nearly-due task notifications require SMTP credentials.
echo.
echo Recommended: Use Gmail App Password
echo.
echo Steps to get Gmail App Password:
echo   1. Enable 2-Factor Authentication on your Google Account
echo   2. Go to: https://myaccount.google.com/apppasswords
echo   3. Select 'Mail' and 'Windows Computer'
echo   4. Copy the 16-character app password
echo.
echo Set the credentials (replace with your actual values):
echo   firebase functions:config:set smtp.user="your-email@gmail.com" smtp.password="your-app-password"
echo.
echo ================================================================================
echo 🚀 DEPLOYMENT OPTIONS
echo ================================================================================
echo.
echo Option 1: Deploy now without email config (can be configured later)
echo   firebase deploy --only functions
echo.
echo Option 2: Set email config first, then deploy
echo   firebase functions:config:set smtp.user="your-email@gmail.com" smtp.password="your-app-password"
echo   firebase deploy --only functions
echo.
echo After deployment:
echo   • Cloud Function will run every 1 hour automatically
echo   • View logs: firebase functions:log
echo.
