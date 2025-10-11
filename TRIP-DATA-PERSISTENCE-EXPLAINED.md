# Trip Data Persistence - How It Works

## Quick Answer

**Your trip data is saved PERMANENTLY in localStorage and persists across sessions!** 

When you log in with the same email address, you'll see all your previously saved trips.

---

## How It Works

### 1. **User Identification**
```typescript
const userId = localStorage.getItem('userId') || state.user?.email || 'guest';
```

The system uses your **email address** as the unique identifier:
- **Regular login**: Uses your email address (e.g., "user@example.com")
- **Google login**: Uses your Google account email
- **Guest mode**: Falls back to "guest"

### 2. **Trip Storage**
```typescript
// Trips are stored with a key that includes your userId
const key = `hack-a-holiday-trips-${userId}`;
// Example: "hack-a-holiday-trips-user@example.com"
```

Each user's trips are stored separately in localStorage with their email as part of the key.

### 3. **What Gets Saved**

✅ **Saved Permanently in LocalStorage:**
- All your trips (flights, hotels, packages)
- Trip details (origin, destination, dates, prices)
- Trip status (planned, booked, completed)
- Creation timestamps

✅ **Also in LocalStorage (Session Data):**
- Authentication token (`auth_token`)
- User session data (`user_session`)
- User email/profile info

---

## When You Can See Your Trips

### ✅ **WILL Persist:**
1. **Same browser, same device** - Your trips are always there
2. **After logout and login** - Log back in with the same email → All trips are there
3. **After closing/reopening browser** - LocalStorage data persists
4. **After computer restart** - LocalStorage survives reboots
5. **Days/weeks/months later** - Data stays until you clear browser data

### ❌ **Will NOT Persist:**
1. **Different browser** (Chrome → Firefox) - Different localStorage
2. **Different device** (Laptop → Phone) - Separate localStorage
3. **Incognito/Private mode** - Cleared when session ends
4. **If you clear browser data** - Manually clearing cache/cookies
5. **Different email login** - Each email has separate trips

---

## Example Scenarios

### Scenario 1: Same Email, Multiple Sessions ✅
```
Day 1: Login as "john@email.com" → Book 3 trips → Logout
Day 2: Login as "john@email.com" → See all 3 trips! ✅
Day 3: Login as "john@email.com" → Book 2 more trips → See all 5 trips! ✅
```

### Scenario 2: Different Emails ❌
```
Day 1: Login as "john@email.com" → Book 3 trips
Day 2: Login as "jane@email.com" → See 0 trips (different user) ❌
Day 3: Login as "john@email.com" → See all 3 trips again ✅
```

### Scenario 3: Different Devices ❌
```
Laptop: Login as "john@email.com" → Book 3 trips
Phone: Login as "john@email.com" → See 0 trips (different device) ❌
```

---

## Storage Location

Your trips are stored in **Browser LocalStorage**:

```javascript
// Chrome DevTools → Application → Local Storage → localhost:3000
{
  "hack-a-holiday-trips-john@email.com": [
    {
      "id": "trip-1760111128436-7vxpa4c8z",
      "userId": "guest",
      "origin": "YYZ",
      "destination": "BOM",
      "departureDate": "2025-10-21",
      "returnDate": "2025-11-05",
      "type": "vacation",
      "status": "planned",
      "details": {...},
      "createdAt": "2025-10-10T15:45:28.436Z"
    }
  ],
  "auth_token": "eyJhbGc...",
  "user_session": "{...}"
}
```

---

## Authentication vs Trip Data

| Data Type | Storage | Persists After Logout? | Persists Across Devices? |
|-----------|---------|------------------------|--------------------------|
| **Trips** | LocalStorage | ✅ YES (same email) | ❌ NO |
| **Auth Token** | LocalStorage + Cookie | ❌ NO (removed on logout) | ❌ NO |
| **User Session** | LocalStorage + Cookie | ❌ NO (removed on logout) | ❌ NO |

---

## What Happens When You Logout

```typescript
const removeToken = () => {
  localStorage.removeItem('auth_token');      // ❌ Removed
  localStorage.removeItem('user_session');    // ❌ Removed
  removeCookie('authToken');                  // ❌ Removed
  removeCookie('userSession');                // ❌ Removed
  
  // NOTE: Trip data is NOT removed!
  // 'hack-a-holiday-trips-{email}' stays in localStorage ✅
};
```

**Your trips are NOT deleted on logout!** They stay in localStorage tied to your email.

---

## Why This Design Works

### ✅ **Advantages:**
- 💾 **Permanent Storage**: Trips saved forever (until browser data cleared)
- ⚡ **Fast**: No network calls, instant load
- 🔐 **User-Specific**: Each email has separate trips
- 💰 **Free**: No database costs
- 🛠️ **Simple**: Easy to debug and maintain

### ⚠️ **Limitations:**
- 📱 **No Cross-Device Sync**: Can't access trips from different devices
- 🌐 **No Cross-Browser Sync**: Chrome trips ≠ Firefox trips
- 🗑️ **Can Be Cleared**: User can manually clear browser data

---

## Future: If You Need Cross-Device Sync

To sync trips across devices, you'd need to:

1. **Add DynamoDB Integration**:
   - Store trips in DynamoDB table with userId (email)
   - API endpoints: POST /trips, GET /trips, DELETE /trips

2. **Update Trip Service**:
   - Save to both localStorage AND DynamoDB
   - Fetch from DynamoDB on login
   - Sync on every trip update

3. **Benefits**:
   - ✅ Access trips from any device
   - ✅ Access trips from any browser
   - ✅ Never lose data (backed up in cloud)
   - ✅ Can restore if browser data cleared

But for now, **localStorage is perfect** for your hackathon project! 🎉

---

## Summary

**Your trips ARE saved permanently for each email address!**

✅ Log out and log back in → Trips are still there  
✅ Close browser and reopen → Trips are still there  
✅ Restart computer → Trips are still there  
✅ Use the same email → Always see your trips  

Just remember: **Same email + Same browser + Same device = All your trips! 🎫✈️**
