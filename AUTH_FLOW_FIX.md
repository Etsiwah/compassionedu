# Authentication Flow Fix - CompassionEdu

## Issue Description
Users signing up via Google Sign-In were seeing error messages after successful account creation, even though the account was created in the database. The issue affected both Google OAuth and email/password signup flows.

## Root Causes Identified

### 1. **JWT Token Payload Missing User Info**
- JWT tokens only contained `sub` (user ID) and `role`
- Frontend callback page tried to fetch user details via API
- API call was failing due to incorrect configuration
- **Result**: Error message shown even though authentication was successful

### 2. **AuthCallbackPage Making Unnecessary API Call**
- Used `fetch('/api/users/me')` with relative path
- Didn't properly use the configured `api` instance with base URL
- Fell back to minimal user info from token, but showed error first
- **Result**: User saw error briefly before redirect

### 3. **No Error Handling on LoginPage**
- LoginPage didn't read `error` query parameter from URL
- OAuth failures redirected to login with error, but error wasn't displayed
- **Result**: Silent failures with no user feedback

## Changes Made

### Backend Changes

#### 1. Enhanced JWT Token Payload (`backend/src/services/authService.js`)
**Before:**
```javascript
const accessToken = jwt.sign(
  { sub: user.id, role: user.role },
  ACCESS_TOKEN_SECRET,
  { expiresIn: ACCESS_TOKEN_EXPIRY }
);
```

**After:**
```javascript
const accessToken = jwt.sign(
  { 
    sub: user.id, 
    role: user.role,
    name: user.name,
    email: user.email
  },
  ACCESS_TOKEN_SECRET,
  { expiresIn: ACCESS_TOKEN_EXPIRY }
);
```

**Impact**: Frontend no longer needs to make API call to get user info - everything is in the token.

#### 2. Registration Already Returns Tokens (`backend/src/routes/auth.js`)
The registration endpoint already:
- ✅ Creates user with `status='active'` and `is_active=TRUE`
- ✅ Issues tokens immediately via `authService.issueTokens(user)`
- ✅ Returns tokens and user info for immediate login
- ✅ No approval needed - users can log in right away

#### 3. Google OAuth Flow (`backend/src/routes/auth.js`)
The Google OAuth callback already:
- ✅ Creates new users with `status='active'`
- ✅ Issues tokens immediately
- ✅ Redirects to frontend with tokens in URL
- ✅ Handles existing users correctly

### Frontend Changes

#### 1. Fixed AuthCallbackPage (`frontend/src/pages/AuthCallbackPage.jsx`)
**Before:**
- Made API call with `fetch('/api/users/me')`
- Showed error if API call failed
- Had fallback but user saw error first

**After:**
- Decodes JWT token directly (contains all user info)
- No API call needed
- Immediate redirect to dashboard
- Cleaner, faster, more reliable

**Code:**
```javascript
// Decode JWT token to get user info (now includes name and email in payload)
const payload = JSON.parse(atob(token.split('.')[1]));

const user = {
  id: payload.sub,
  role: payload.role,
  name: payload.name || 'User',
  email: payload.email || '',
};

// Log in the user with tokens and user info
login(token, user, refreshToken);

// Redirect to appropriate dashboard
navigate(ROLE_REDIRECT[user.role] || '/login', { replace: true });
```

#### 2. Added Error Handling to LoginPage (`frontend/src/pages/LoginPage.jsx`)
**Added:**
- `useSearchParams` hook to read URL parameters
- `useEffect` to detect `error` query parameter
- Display error message from OAuth callback
- Clear error parameter from URL after reading

**Code:**
```javascript
// Handle error parameter from URL (e.g., from OAuth callback)
useEffect(() => {
  const error = searchParams.get('error');
  if (error) {
    setSiError(decodeURIComponent(error));
    // Clear the error parameter from URL
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('error');
    navigate({ search: newSearchParams.toString() }, { replace: true });
  }
}, [searchParams, navigate]);
```

## Authentication Flow - After Fix

### Email/Password Signup Flow
```
1. User fills signup form
2. Frontend calls POST /api/auth/register
3. Backend creates user (status='active', is_active=TRUE)
4. Backend issues access token + refresh token
5. Backend returns { token, refreshToken, user }
6. Frontend calls login(token, user, refreshToken)
7. Frontend redirects to dashboard immediately
✅ User is logged in - NO error message
```

### Google OAuth Signup Flow
```
1. User clicks "Continue with Google"
2. Frontend redirects to /api/auth/google
3. Backend redirects to Google OAuth consent screen
4. User authorizes on Google
5. Google redirects to /api/auth/google/callback with code
6. Backend exchanges code for Google tokens
7. Backend gets user info from Google API
8. Backend creates user if doesn't exist (status='active')
9. Backend issues our own access + refresh tokens
10. Backend redirects to /auth-callback?token=...&refreshToken=...
11. Frontend decodes token (contains id, role, name, email)
12. Frontend calls login(token, user, refreshToken)
13. Frontend redirects to dashboard
✅ User is logged in - NO error message
```

### Login Flow (Existing Account)
```
1. User enters email/password or clicks Google
2. Backend validates credentials
3. Backend issues tokens
4. Frontend stores tokens and user info
5. Frontend redirects to dashboard
✅ User is logged in
```

## Verification Checklist

### ✅ Google Sign-Up
- [ ] Click "Continue with Google" on signup
- [ ] Authorize with Google account
- [ ] **Expected**: Account created → Automatically logged in → Dashboard opens
- [ ] **Expected**: No error message shown

### ✅ Email/Password Sign-Up
- [ ] Fill out registration form
- [ ] Submit
- [ ] **Expected**: Account created → Automatically logged in → Dashboard opens
- [ ] **Expected**: No success message needed (user is already in the app)

### ✅ Google Sign-In (Existing Account)
- [ ] Click "Continue with Google" on login
- [ ] Authorize with Google account
- [ ] **Expected**: Automatically logged in → Dashboard opens
- [ ] **Expected**: No error message shown

### ✅ Email/Password Login
- [ ] Enter credentials
- [ ] Submit
- [ ] **Expected**: Logged in → Dashboard opens

### ✅ OAuth Error Handling
- [ ] Cancel Google OAuth
- [ ] **Expected**: Redirected to login with clear error message
- [ ] **Expected**: Error message visible on login page

### ✅ Database Verification
- [ ] Check database after Google signup
- [ ] **Expected**: User record exists with status='active', is_active=TRUE
- [ ] **Expected**: User can log in immediately

## Files Modified

### Backend
1. `backend/src/services/authService.js` - Enhanced JWT payload
2. `backend/src/routes/auth.js` - Already correct (no changes needed)

### Frontend
1. `frontend/src/pages/AuthCallbackPage.jsx` - Simplified token handling
2. `frontend/src/pages/LoginPage.jsx` - Added error parameter handling

## Testing Notes

### Development Testing
```bash
# Start backend
cd backend
npm run dev

# Start frontend  
cd frontend
npm start
```

### Production Testing
1. Deploy changes to production
2. Test Google Sign-Up with new Google account
3. Verify no error message appears
4. Verify user lands on dashboard
5. Check database to confirm user was created
6. Test logging in again with same account

## Benefits of This Fix

1. **Faster Authentication**: No unnecessary API calls
2. **Better UX**: No error messages on successful signup
3. **More Reliable**: Doesn't depend on API call succeeding
4. **Cleaner Code**: Simpler logic, fewer failure points
5. **Proper Error Display**: Real errors now shown to users
6. **Immediate Login**: Users start using the app right away

## Security Notes

- JWT tokens now contain more user info (name, email)
- This is safe because JWTs are signed and verified
- Tokens are still short-lived (24h by default)
- Refresh tokens rotate on each use
- No passwords or sensitive data in tokens
- HTTPS required in production (already configured)

---

**Date**: June 13, 2026
**Version**: 1.0
