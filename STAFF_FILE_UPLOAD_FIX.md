# Staff File Upload Access Fix

## Issue Reported
Staff users were getting "Access Denied" errors when trying to:
1. Upload profile pictures
2. Upload CV files
3. Upload portfolio files

## Root Cause
The backend profile routes (`backend/src/routes/profile.js`) were missing `'staff'` role in the `requireRole` middleware for file upload endpoints. Only `'admin'` and `'student'` roles were allowed.

## Solution Implemented
Added `'staff'` role to the following routes in `backend/src/routes/profile.js`:

### Routes Fixed:

1. **POST /api/profile/:userId/photos** (Profile picture upload)
   - Before: `requireRole('admin', 'student')`
   - After: `requireRole('admin', 'student', 'staff')`

2. **POST /api/profile/:userId/documents** (CV/Portfolio upload)
   - Before: `requireRole('admin', 'student')`
   - After: `requireRole('admin', 'student', 'staff')`

3. **PATCH /api/profile/:userId/photos/:photoId/default** (Set default photo)
   - Before: `requireRole('admin', 'student')`
   - After: `requireRole('admin', 'student', 'staff')`

## Technical Details

### Authentication Flow:
1. `requireAuth` - Verifies JWT token
2. `requireRole('admin', 'student', 'staff')` - Checks user role (NOW INCLUDES STAFF)
3. `requireSelfOrAdmin` - Ensures user can only modify their own profile (unless admin)

### File Upload Endpoints:
- **Profile Photos**: `POST /api/profile/:userId/photos`
  - Accepts: JPEG, PNG, WEBP
  - Max size: 10 MB
  - Stored in: `backend/uploads/photos/`

- **Documents (CV/Portfolio)**: `POST /api/profile/:userId/documents`
  - Accepts: PDF, DOC, DOCX, JPG, PNG, ZIP
  - Max size: 20 MB
  - Stored in: `backend/uploads/beneficiary-docs/`

## Files Modified
- ✅ `backend/src/routes/profile.js` (3 route handlers updated)

## Deployment Required
This is a **backend change**, so the backend must be redeployed to Render.

### Deployment Steps:

**Option 1: Git Push (Recommended - Auto-deploys on Render)**
```cmd
cd c:\Users\kwesi\Desktop\compassionedu-main
git add backend/src/routes/profile.js
git commit -m "fix: add staff role to file upload routes"
git push
```

**Option 2: Manual Redeploy via Render Dashboard**
1. Go to https://dashboard.render.com
2. Find the `compassionedu-api` service
3. Click "Manual Deploy" → "Deploy latest commit"

## Testing After Deployment

1. **Login as Staff user**
2. **Navigate to Staff Dashboard → Profile**
3. **Test Profile Picture Upload:**
   - Click profile section
   - Click "Upload Photo" button
   - Select an image file
   - Verify upload succeeds (no "Access Denied" error)

4. **Test CV Upload:**
   - In CV/Resume section
   - Click "Upload File" button
   - Select a PDF or DOC file
   - Verify upload succeeds

5. **Test Portfolio Upload:**
   - In Portfolio section
   - Click "Upload File" button
   - Select a file
   - Verify upload succeeds

## Expected Results
✅ Staff users can upload profile photos  
✅ Staff users can upload CV files  
✅ Staff users can upload portfolio files  
✅ No "Access Denied" errors  
✅ Files are stored and accessible  

## Backend API Endpoint
- Production: https://compassionedu-api.onrender.com
- Frontend: https://compassion-project-kappa.vercel.app

## Status
✅ **Code Fixed**  
⏳ **Awaiting Backend Deployment**  

---

*Created: December 2024*  
*Issue: Staff file upload access denied*  
*Resolution: Added staff role to file upload endpoints*
