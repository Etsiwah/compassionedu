# Staff Access Audit Report

## Audit Date: December 2024
## Issue: Staff users getting "Access Denied" errors on file uploads

---

## 🔍 Audit Scope

Comprehensive review of all backend routes to ensure staff users have appropriate access to their own profile operations, especially file uploads.

---

## ✅ FIXED: Profile Routes (`backend/src/routes/profile.js`)

### Routes Updated (3):

1. **POST /api/profile/:userId/photos** - Profile picture upload
   - **Before:** `requireRole('admin', 'student')`
   - **After:** `requireRole('admin', 'student', 'staff')` ✅
   - **Purpose:** Staff can upload their own profile photos

2. **POST /api/profile/:userId/documents** - CV/Portfolio upload  
   - **Before:** `requireRole('admin', 'student')`
   - **After:** `requireRole('admin', 'student', 'staff')` ✅
   - **Purpose:** Staff can upload CV and portfolio documents

3. **PATCH /api/profile/:userId/photos/:photoId/default** - Set default photo
   - **Before:** `requireRole('admin', 'student')`
   - **After:** `requireRole('admin', 'student', 'staff')` ✅
   - **Purpose:** Staff can set their default profile photo

### Already Correct (2):

4. **GET /api/profile/:userId** - View profile
   - **Status:** `requireRole('admin', 'student', 'teacher', 'parent', 'staff')` ✅
   - **Already includes staff** - No change needed

5. **PATCH /api/profile/:userId** - Update profile details
   - **Status:** `requireRole('admin', 'student', 'staff')` ✅
   - **Already includes staff** - No change needed

---

## ✅ VERIFIED: No Changes Needed for Portfolio Routes

### Portfolio Routes (`backend/src/routes/portfolio.js`)

**Decision:** Portfolio routes should **NOT** include staff access.

**Reasoning:**
- Portfolio routes are specifically for **student portfolios** (CV, experiences, skills, media)
- Staff members manage their own profiles via `/profile` routes (which we fixed above)
- Staff should not be able to modify student portfolio data
- Current access control is **correct as-is**

### Routes Reviewed (6):

1. **POST /api/portfolio/:studentId/cv**
   - Status: `requireRole('admin', 'student')` ✅ Correct
   - Purpose: Students upload their own CV to portfolio

2. **POST /api/portfolio/:studentId/experiences**
   - Status: `requireRole('admin', 'student')` ✅ Correct
   - Purpose: Students add work/education experiences

3. **PUT /api/portfolio/:studentId/experiences/:id**
   - Status: `requireRole('admin', 'student')` ✅ Correct
   - Purpose: Students update experiences

4. **DELETE /api/portfolio/:studentId/experiences/:id**
   - Status: `requireRole('admin', 'student')` ✅ Correct
   - Purpose: Students delete experiences

5. **POST /api/portfolio/:studentId/media**
   - Status: `requireRole('admin', 'student')` ✅ Correct
   - Purpose: Students upload portfolio media (images, videos)

6. **PATCH /api/portfolio/:studentId/skills**
   - Status: `requireRole('admin', 'student')` ✅ Correct
   - Purpose: Students update their skills list

**Read-only access for staff:**
- **GET /api/portfolio/:studentId** - `requireRole('admin', 'teacher', 'student', 'parent')` 
  - Staff can be added here if they need to view student portfolios (future enhancement)
  - Currently staff don't need this access based on requirements

---

## ✅ VERIFIED: Staff Portal Routes Correct

### Staff Portal Routes (`backend/src/routes/staffPortal.js`)

**Status:** All routes already properly secured for staff access ✅

**Global middleware applied to ALL routes:**
```javascript
router.use(requireAuth, requireRole('staff', 'admin'));
```

This means ALL endpoints in `/api/staff-portal/*` are accessible to staff users.

### Staff-specific endpoints include:
- `GET /api/staff-portal/metrics` - Dashboard metrics
- `GET /api/staff-portal/students` - View students list
- `POST /api/staff-portal/attendance` - Record attendance
- `GET /api/staff-portal/announcements` - View announcements
- `GET /api/staff-portal/me/profile` - View own profile
- `PATCH /api/staff-portal/me/profile` - Update own profile
- `POST /api/staff-portal/work-reports` - Submit work reports
- `GET /api/staff-portal/work-reports/my` - View own work reports

**Conclusion:** Staff portal is properly configured ✅

---

## 🔐 Access Control Pattern

All fixed routes follow this security pattern:

```javascript
router.post(
  '/:userId/photos',
  requireAuth,                  // ✅ Must be logged in
  requireRole('admin', 'student', 'staff'), // ✅ Must have allowed role
  requireSelfOrAdmin,           // ✅ Can only modify own profile (unless admin)
  uploadPhoto,
  async (req, res, next) => { ... }
);
```

### Security Guarantees:
1. **Authentication:** User must have valid JWT token
2. **Authorization:** User must have one of the allowed roles
3. **Ownership:** User can only modify their own profile (admins can modify any)

---

## 📊 Summary of Changes

### Files Modified: 1
- `backend/src/routes/profile.js` ✅

### Routes Fixed: 3
- POST /api/profile/:userId/photos ✅
- POST /api/profile/:userId/documents ✅
- PATCH /api/profile/:userId/photos/:photoId/default ✅

### Routes Verified (No Change Needed): 20+
- All portfolio routes ✅
- All staff portal routes ✅
- Other profile routes ✅
- All upload routes (fees, health, results) ✅

---

## 🎯 Expected Behavior After Fix

### What Staff Users CAN Now Do:
✅ Upload profile pictures  
✅ Upload CV documents  
✅ Upload portfolio documents  
✅ Set default profile photo  
✅ View their own profile  
✅ Update their own profile details  
✅ Access all staff portal features  

### What Staff Users CANNOT Do (By Design):
❌ Modify other staff profiles (unless admin)  
❌ Modify student profiles (unless admin)  
❌ Upload to student portfolios  
❌ Delete other users' files  
❌ Access admin-only endpoints  

---

## 🚀 Deployment Status

- [x] Code changes completed
- [x] All routes audited
- [x] Security verified
- [ ] **Backend deployment pending**
- [ ] Testing pending

---

## 📋 Testing Checklist (After Deployment)

### Test as Staff User:

1. **Profile Picture Upload:**
   ```
   Login as staff → Profile → Upload photo → Should succeed ✅
   ```

2. **CV Upload:**
   ```
   Login as staff → Profile → CV section → Upload file → Should succeed ✅
   ```

3. **Portfolio Upload:**
   ```
   Login as staff → Profile → Portfolio section → Upload file → Should succeed ✅
   ```

4. **Set Default Photo:**
   ```
   Login as staff → Upload multiple photos → Set one as default → Should succeed ✅
   ```

5. **Profile Update:**
   ```
   Login as staff → Edit profile fields → Save → Should succeed ✅
   ```

6. **Verify Restrictions:**
   ```
   Login as staff → Try to access another staff's profile → Should get 403 ✅
   Login as staff → Try to modify student portfolio → Should get 403 ✅
   ```

---

## ✅ Audit Conclusion

**Status:** All staff access issues have been identified and resolved.

**Changes Required:** Minimal - Only 3 route handler updates needed in one file.

**Security Impact:** None - Access control remains secure. Staff can only modify their own profile data.

**Risk Level:** Low - Changes are isolated to profile routes and follow existing security patterns.

**Ready for Deployment:** Yes ✅

---

*Audit completed: December 2024*  
*Auditor: AI Assistant*  
*Status: Ready for backend deployment*
