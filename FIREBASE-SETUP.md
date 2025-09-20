# Firebase Setup Guide

## 🚀 Firebase Authentication with Google OAuth

Your Travel Companion app now uses Firebase for authentication! Here's how to set it up:

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" or "Create a project"
3. Enter project name: `travel-companion` (or your preferred name)
4. Disable Google Analytics (optional for this project)
5. Click "Create project"

### 2. Enable Authentication

1. In your Firebase project, click "Authentication" in the left sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" provider
5. Enable "Google" provider:
   - Click on Google
   - Toggle "Enable"
   - Choose your project support email
   - Click "Save"

### 3. Get Firebase Configuration

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click "Web" icon (`</>`)
4. Register your app with name: `travel-companion-web`
5. Copy the Firebase config object

### 4. Update Environment Variables

Replace the Firebase configuration in `frontend/.env.local`:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-from-firebase
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 5. Configure Authorized Domains

1. In Firebase Authentication settings
2. Go to "Authorized domains" tab
3. Add `localhost` (should already be there)
4. Add your production domain when you deploy

## ✅ What's Now Working

- **Firebase Authentication**: Email/password and Google OAuth
- **DynamoDB Integration**: User data automatically stored in DynamoDB
- **Persistent Sessions**: Firebase handles session management
- **Security**: Firebase ID tokens for API authentication

## 🔧 Key Features

1. **Google OAuth**: Popup-based Google sign-in
2. **Email Authentication**: Traditional email/password signup and login
3. **Auto User Storage**: User details automatically saved to DynamoDB
4. **Session Persistence**: Users stay logged in across browser sessions
5. **Error Handling**: Comprehensive error messages and handling

## 🚀 Test Authentication

1. Start the development server: `npm run dev`
2. Go to `http://localhost:3000/auth`
3. Try both email signup and Google OAuth
4. User data should be stored in DynamoDB automatically

## 🔐 Security Benefits

- Firebase handles password hashing and security
- Google OAuth eliminates password management
- Firebase ID tokens provide secure API authentication
- Automatic session management and refresh

Your authentication system is now production-ready with Firebase! 🎉