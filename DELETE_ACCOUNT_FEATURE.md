# Delete Account Feature - Implementation Summary

## Overview
Implemented a **soft delete** system for user accounts with 30-day data retention and automatic restoration.

## How It Works

### 1. **User Deletes Account**
- User clicks "Delete Account" button on profile page
- Shows confirmation dialog explaining:
  - ✅ Data kept for 30 days
  - ✅ Can restore by signing up again within 30 days
  - ❌ After 30 days, data permanently deleted
- On confirmation:
  - Account marked as `isDeleted: true`
  - `deletedAt` timestamp recorded
  - `ttl` set to 30 days from now (DynamoDB auto-deletes)
  - User logged out and redirected to login

### 2. **User Tries to Login (Deleted Account)**
- Login request checks if account is deleted
- Returns error: "Account deleted. Please sign up again to restore."
- User must use signup flow to restore

### 3. **User Signs Up Again (Restoration)**
- Signup checks if email exists with `isDeleted: true`
- If yes:
  - Removes `isDeleted`, `deletedAt`, and `ttl` flags
  - Adds `restoredAt` timestamp
  - Updates password/name if provided
  - All trips, preferences, and data restored
  - Message: "Welcome back! Your account has been restored with all your data."

### 4. **After 30 Days**
- DynamoDB TTL automatically deletes the user record
- User can sign up as completely new account
- No data restoration possible

## Technical Details

### Backend Changes

#### `backend_test/models/userModel.js`
- **New**: `softDeleteUser(userId)` - Marks user as deleted with 30-day TTL
- **New**: `restoreUser(userId)` - Removes deletion flags

#### `backend_test/services/userService.js`
- **New**: `softDeleteUser(userId)` - Service wrapper
- **New**: `restoreUser(userId)` - Service wrapper
- **New**: `getUserByEmail(email)` - Get user by email
- **Updated**: `authenticate()` - Returns user with isDeleted flag
- **Updated**: `storeGoogleUser()` - Restores deleted Google accounts

#### `backend_test/controllers/userController.js`
- **New**: `deleteAccount()` - DELETE /user/account endpoint

#### `backend_test/controllers/authController.js`
- **Updated**: `login()` - Checks if account deleted, blocks login
- **Updated**: `signup()` - Checks for deleted account, restores if found

#### `backend_test/routes/user.js`
- **New**: `router.delete('/account', userController.deleteAccount)`

### Frontend Changes

#### `frontend/src/pages/profile.tsx`
- **Updated**: `handleDeleteAccount()` - Now functional:
  - Calls DELETE /user/account API
  - Shows detailed confirmation with 30-day info
  - Logs user out on success
  - Redirects to login page
- **New**: Imports `useRouter` for navigation

## API Endpoints

### DELETE /user/account
**Headers**: `Authorization: Bearer <token>`

**Success Response**:
```json
{
  "success": true,
  "message": "Account deleted successfully. Your data will be kept for 30 days in case you change your mind."
}
```

**Frontend Usage**:
```javascript
const response = await fetch('http://localhost:4000/user/account', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## Database Schema

### User Record (Deleted State)
```javascript
{
  PK: "USER#abc123",
  SK: "PROFILE",
  email: "user@example.com",
  name: "John Doe",
  preferences: { ... },
  isDeleted: true,              // NEW
  deletedAt: "2025-10-14T12:00:00Z",  // NEW
  ttl: 1734192000,              // NEW - Unix timestamp (30 days later)
  // ... all other fields preserved
}
```

### User Record (Restored State)
```javascript
{
  PK: "USER#abc123",
  SK: "PROFILE",
  email: "user@example.com",
  name: "John Doe",
  preferences: { ... },
  restoredAt: "2025-10-20T08:30:00Z",  // NEW
  // isDeleted, deletedAt, ttl removed
  // All original data intact
}
```

## User Flow Examples

### Example 1: Delete and Restore Within 30 Days
1. User deletes account on Oct 14
2. Account marked `isDeleted: true`, `ttl: Nov 13`
3. User tries to login → Error: "Account deleted, sign up to restore"
4. User signs up on Oct 20
5. Account restored with all data
6. Message: "Welcome back! Your account has been restored."

### Example 2: Delete and Restore After 30 Days
1. User deletes account on Oct 14
2. Account marked `isDeleted: true`, `ttl: Nov 13`
3. DynamoDB auto-deletes record on Nov 13
4. User signs up on Nov 20
5. Creates completely new account (no data)

### Example 3: Google OAuth Restoration
1. Google user deletes account
2. Signs in with Google again within 30 days
3. `storeGoogleUser()` detects `isDeleted: true`
4. Automatically restores account
5. User sees all their data intact

## Testing Steps

### Test 1: Delete Account
1. Login and go to profile
2. Scroll to "Danger Zone"
3. Click "Delete Account"
4. Confirm deletion
5. ✅ Should see success message with 30-day info
6. ✅ Should be logged out
7. ✅ Should be redirected to login

### Test 2: Try Login After Delete
1. Try to login with deleted account
2. ✅ Should see error: "Account deleted"
3. ✅ Should suggest signing up to restore

### Test 3: Restore Account
1. Sign up with same email as deleted account
2. ✅ Should see "Welcome back! Account restored"
3. Login with new/same password
4. ✅ Should see all trips, preferences intact

### Test 4: Google OAuth Restoration
1. Delete Google account
2. Sign in with Google again
3. ✅ Should restore automatically
4. ✅ Should see all data

## Backend Startup

**IMPORTANT**: After these changes, restart the backend server:

```powershell
cd backend_test
# Stop server (Ctrl+C)
npm run dev
```

Look for these logs:
- `🗑️ User abc123 soft deleted. Will be permanently deleted after 30 days.`
- `♻️ User abc123 account restored`
- `♻️ Restoring deleted account for user@example.com`

## Files Changed

### Backend (7 files)
- `backend_test/models/userModel.js` (added 2 functions)
- `backend_test/services/userService.js` (added 3 functions, updated 2)
- `backend_test/controllers/userController.js` (added 1 endpoint)
- `backend_test/controllers/authController.js` (updated 2 functions)
- `backend_test/routes/user.js` (added 1 route)

### Frontend (1 file)
- `frontend/src/pages/profile.tsx` (updated delete handler)

## Security Features

1. **JWT Required**: Delete endpoint requires valid auth token
2. **User Ownership**: Can only delete own account (verified via JWT)
3. **No Direct Permanent Delete**: 30-day buffer prevents accidental data loss
4. **Automatic Cleanup**: DynamoDB TTL ensures no manual intervention needed

## Future Enhancements

1. **Email Notification**: Send email when account deleted
2. **Admin Dashboard**: View/restore deleted accounts
3. **Custom Retention Period**: Allow users to choose 30/60/90 days
4. **Export Data**: Offer data export before deletion
5. **Delete Trips**: Also soft-delete associated trips with same TTL
