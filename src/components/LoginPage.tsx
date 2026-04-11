import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import { auth, db } from '../firebase';
import { UserPerformanceService } from '@/services/UserPerformanceService';
import LogoImage from './84909b83-0826-4104-9fe4-ff89c0b804e3-removebg-preview.png';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface LoginPageProps {
  onLogin: () => void;
}

const isPlaceholderValue = (value: string | undefined) =>
  !value || value.startsWith('your_') || value.startsWith('missing-');

const hasValidFirebaseAuthConfig = () =>
  !isPlaceholderValue(import.meta.env.VITE_FIREBASE_API_KEY) &&
  !isPlaceholderValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) &&
  !isPlaceholderValue(import.meta.env.VITE_FIREBASE_PROJECT_ID) &&
  !isPlaceholderValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) &&
  !isPlaceholderValue(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) &&
  !isPlaceholderValue(import.meta.env.VITE_FIREBASE_APP_ID);

const getAuthErrorMessage = (err: any) => {
  const code = err?.code;

  if (code === 'auth/unauthorized-domain') {
    return 'Google sign-in is blocked for this domain. Add localhost to Firebase Auth authorized domains.';
  }

  if (code === 'auth/operation-not-allowed') {
    return 'Google sign-in is disabled in Firebase. Enable the Google provider in Authentication.';
  }

  if (code === 'auth/popup-blocked') {
    return 'The browser blocked the sign-in popup. Allow popups and try again.';
  }

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Sign-in popup was closed.';
  }

  if (code === 'auth/account-exists-with-different-credential') {
    return 'An account already exists with this email using a different sign-in method.';
  }

  if (code === 'auth/configuration-not-found' || code === 'auth/invalid-api-key') {
    return 'Firebase config is not set correctly. Replace the placeholder values in .env and restart the app.';
  }

  return err?.message || 'Google sign-in failed. Please try again.';
};

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('tasksync_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const saveUserToFirestore = async (uid: string, userEmail: string, displayName: string, isNewUser: boolean) => {
    const userRef = doc(db, 'users', uid);
    if (isNewUser) {
      await setDoc(userRef, {
        email: userEmail,
        username: displayName,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
    } else {
      // For existing users, merge and ensure createdAt exists
      await setDoc(userRef, {
        email: userEmail,
        username: displayName || '',
        lastLoginAt: serverTimestamp(),
        createdAt: serverTimestamp(), // Add createdAt if missing
      }, { merge: true });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMessage('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      const code = err?.code;
      if (code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');

    if (!hasValidFirebaseAuthConfig()) {
      setError('Firebase config is still placeholder data. Replace the values in .env with your real Firebase Web App config, then restart the dev server.');
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      // Don't set loading until after popup resolves — prevents long freeze on close
      const result = await signInWithPopup(auth, provider);
      setLoading(true);
      await saveUserToFirestore(result.user.uid, result.user.email || '', result.user.displayName || '', false);
      onLogin();
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: username.trim() });
        await saveUserToFirestore(result.user.uid, result.user.email || email, username.trim(), true);
        // Create initial user performance record
        await UserPerformanceService.createUserPerformance(result.user.uid);
        setIsSignUp(false);
        setPassword('');
        setConfirmPassword('');
        setSuccessMessage('Account created! Please sign in.');
        setLoading(false);
        return;
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await saveUserToFirestore(result.user.uid, result.user.email || email, result.user.displayName || '', false);
        
        // Handle Remember Me
        if (rememberMe) {
          localStorage.setItem('tasksync_remembered_email', email);
        } else {
          localStorage.removeItem('tasksync_remembered_email');
        }
      }
      onLogin();
    } catch (err: any) {
      const code = err?.code;
      if (code === 'auth/user-not-found') {
        setError('No account found with this email. Please sign up first.');
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError('Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={LogoImage} alt="TaskSync Logo" className="w-30 h-40 inline-block -mb-4" />
          <h1 className="text-4xl font-bold text-gray-900">TaskSync</h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">

          {/* Forgot Password View */}
          {isForgotPassword ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Reset password</h2>
                <p className="text-gray-500 text-sm mt-1">Enter your email and we'll send you a reset link.</p>
              </div>
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
              )}
              {successMessage && (
                <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{successMessage}</div>
              )}
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-6">
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(false); setError(''); setSuccessMessage(''); }}
                  className="text-indigo-600 font-medium hover:text-indigo-700 transition-colors bg-transparent border-none p-0"
                >
                  ← Back to sign in
                </button>
              </p>
            </>
          ) : (
          <>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{isSignUp ? 'Create account' : 'Welcome back'}</h2>
            <p className="text-gray-500 text-sm mt-1">{isSignUp ? 'Sign up to get started' : 'Sign in to your account to continue'}</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username (Sign Up only) */}
            {isSignUp && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoComplete="username"
                    className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-300 pl-10 pr-10 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors border-none bg-transparent p-0"
                >
                  {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Sign Up only) */}
            {isSignUp && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
              </div>
            )}

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMessage(''); }}
                className="text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors bg-transparent border-none p-0"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-200" />
            <span className="px-3 text-sm text-gray-400">or</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-2.5 font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-sm text-gray-500 mt-6">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="text-indigo-600 font-medium hover:text-indigo-700 transition-colors bg-transparent border-none p-0"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
