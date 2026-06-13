# File Upload Policy - CompassionEdu Platform

## Overview
This document describes the file upload restrictions for all upload endpoints in the CompassionEdu platform.

## Upload Categories

### 1. Profile Photos (IMAGES ONLY) ✅
**Endpoint**: `POST /api/profile/:userId/photos`
**Accepted Types**:
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WEBP (.webp)

**Size Limit**: 10 MB
**Rationale**: Profile photos should only be images for display consistency.

---

### 2. Fee Receipts (Documents & Images) ✅
**Endpoint**: `POST /api/fee-uploads/my/pay`
**Accepted Types**:
- PDF (.pdf)
- Images: JPEG, PNG, WEBP
- Word Documents (.doc, .docx)
- Excel Spreadsheets (.xls, .xlsx)

**Size Limit**: 20 MB
**Rationale**: Students may submit scanned receipts (images), bank statements (PDF/Excel), or payment proofs in various formats.

---

### 3. Result Uploads (Documents & Images) ✅
**Endpoint**: `POST /api/result-uploads`
**Accepted Types**:
- PDF (.pdf)
- Images: JPEG, PNG, WEBP
- Word Documents (.doc, .docx)

**Size Limit**: 20 MB
**Rationale**: Students upload report cards which may be scanned images, PDFs from schools, or typed documents.

---

### 4. Health Records (Documents & Images) ✅
**Endpoint**: `POST /api/health`
**Accepted Types**:
- PDF (.pdf)
- Images: JPEG, PNG, WEBP
- Word Documents (.doc, .docx)

**Size Limit**: 10 MB
**Rationale**: Insurance cards (images), hospital bills (PDFs/images), medical reports (documents).

---

### 5. Beneficiary Documents (Documents & Images) ✅
**Endpoint**: `POST /api/beneficiaries/:id/documents`
**Accepted Types**:
- PDF (.pdf)
- Images: JPEG, PNG, WEBP
- Word Documents (.doc, .docx)

**Size Limit**: 20 MB
**Rationale**: Various beneficiary documents including certificates, IDs, letters.

---

### 6. Profile Documents (Documents & Images) ✅
**Endpoint**: `POST /api/profile/:userId/documents`
**Accepted Types**:
- PDF (.pdf)
- Images: JPEG, PNG, WEBP
- Word Documents (.doc, .docx)

**Size Limit**: 20 MB
**Rationale**: Supporting documents for student profiles.

---

### 7. Portfolio CV (Documents Only) ✅
**Endpoint**: `POST /api/portfolio/:studentId/cv`
**Accepted Types**:
- PDF (.pdf)
- Word Documents (.docx)

**Size Limit**: 50 MB
**Rationale**: CVs are typically in PDF or Word format.

---

### 8. Portfolio Media (Documents, Images & Videos) ✅
**Endpoint**: `POST /api/portfolio/:studentId/media`
**Accepted Types**:
- Images: JPEG, PNG, WEBP, GIF
- Videos: MP4, QuickTime (.mov), WebM, AVI
- PDF (.pdf)
- Word Documents (.doc, .docx)
- PowerPoint Presentations (.pptx)

**Size Limit**: 50 MB
**Rationale**: Portfolio showcases may include project presentations, certificates, images of work, and video demonstrations.

---

### 9. Portfolio Level Projects (Documents, Images & Videos) ✅
**Endpoint**: `POST /api/portfolio-level/:studentId/projects`
**Accepted Types**:
- Images: JPEG, PNG, WEBP, GIF
- Videos: MP4, QuickTime (.mov), WebM
- PDF (.pdf)
- Word Documents (.doc, .docx)
- PowerPoint Presentations (.pptx)

**Size Limit**: 200 MB
**Rationale**: Academic projects may include presentations, reports, videos, and project documentation.

---

### 10. Activities Media (Images & Videos Only) ✅
**Endpoint**: `POST /api/activities`
**Accepted Types**:
- Images: JPEG, PNG, WEBP
- Videos: MP4, QuickTime (.mov), WebM

**Size Limit**: 200 MB
**Rationale**: Activity posts are social media style content - photos and videos only.

---

## Security Measures

### Blocked File Types (Global)
The following file types are NEVER accepted anywhere:
- Executables: .exe, .bat, .cmd, .com, .msi, .scr
- Scripts: .ps1, .vbs, .js, .jar, .sh
- Archives with executables: (validated separately)

### Validation Strategy
1. **MIME Type Checking**: Primary validation method
2. **File Extension Checking**: Secondary validation
3. **File Size Limits**: Enforced per endpoint
4. **Virus Scanning**: (Recommended for production - not yet implemented)

### Storage
All uploaded files are stored in:
```
backend/uploads/
├── photos/              (profile photos)
├── fee-receipts/        (fee payment receipts)
├── results/             (academic results)
├── health/              (health records)
├── beneficiary-docs/    (beneficiary documents)
├── portfolio/           (CV, media, projects)
└── activities/          (activity photos/videos)
```

---

## Error Messages

### File Type Rejection
- **Profile Photos**: "Invalid file type. Only JPEG, PNG, and WEBP images are accepted."
- **Fee Receipts**: "Only PDF, images, Word, and Excel files are allowed"
- **Results**: "Only PDF, images, and Word document files are allowed"
- **Health**: "Only PDF, images, and Word document files are allowed"
- **Portfolio CV**: "CV must be PDF or DOCX format"
- **Portfolio Media**: "Only images, videos, PDFs, and document files are allowed"
- **Activities**: "Only JPG, PNG, MP4, MOV, WEBM files are allowed"

### Size Limit Rejection
- Returns: "File too large. Maximum allowed size is X MB."
- HTTP Status: 422 Unprocessable Entity

---

## Implementation Files Changed

1. `backend/src/routes/feeUploads.js` - Added document types
2. `backend/src/routes/resultUploads.js` - Added document types
3. `backend/src/routes/health.js` - Added document types
4. `backend/src/routes/portfolio.js` - Added file filter with documents
5. `backend/src/routes/portfolioLevel.js` - Expanded media filter

**Last Updated**: June 13, 2026
**Version**: 2.0
