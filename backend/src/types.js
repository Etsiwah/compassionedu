/**
 * @fileoverview Shared JSDoc type definitions for CompassionEdu.
 *
 * These types mirror the TypeScript interfaces defined in the design document
 * and are used throughout the backend for documentation and IDE support.
 * The frontend uses the equivalent TypeScript declarations in src/types/index.ts.
 */

'use strict';

/**
 * @typedef {'admin' | 'student' | 'teacher' | 'parent'} Role
 */

/**
 * @typedef {'paid' | 'pending' | 'overdue'} FeeStatus
 */

/**
 * @typedef {'present' | 'absent' | 'late'} AttendanceStatus
 */

/**
 * @typedef {'pending' | 'approved' | 'flagged'} ModerationStatus
 */

/**
 * JWT payload embedded in access tokens.
 * @typedef {Object} JWTPayload
 * @property {string} sub   - User UUID
 * @property {Role}   role  - User role
 * @property {number} iat   - Issued-at timestamp (seconds)
 * @property {number} exp   - Expiry timestamp (seconds)
 */

/**
 * A flexible payment plan stored as JSONB on a fee record.
 * @typedef {Object} PaymentPlan
 * @property {number}   installments     - Number of installments
 * @property {number}   amountPerInstall - Amount per installment
 * @property {string[]} dueDates         - ISO date strings for each installment
 */

/**
 * A single payment transaction.
 * @typedef {Object} FeePayment
 * @property {string} id            - UUID
 * @property {string} feeId         - Parent fee UUID
 * @property {number} amountPaid    - Amount paid in this transaction
 * @property {string} paidAt        - ISO datetime string
 * @property {string} [transactionId] - External payment gateway reference
 * @property {string} [receiptRef]  - Receipt reference number
 */

/**
 * A student's fee obligation record.
 * @typedef {Object} FeeRecord
 * @property {string}       id          - UUID
 * @property {string}       studentId   - Student UUID
 * @property {number}       amount      - Total amount due
 * @property {string}       dueDate     - ISO date string
 * @property {FeeStatus}    status      - Current fee status
 * @property {PaymentPlan}  [paymentPlan] - Optional flexible payment plan
 * @property {FeePayment[]} payments    - Payment history
 */

/**
 * A single attendance record.
 * @typedef {Object} AttendanceRecord
 * @property {string}           id        - UUID
 * @property {string}           studentId - Student UUID
 * @property {string}           date      - ISO date string
 * @property {string}           [subject] - Subject name (optional)
 * @property {string}           [period]  - Period identifier (optional)
 * @property {AttendanceStatus} status    - Attendance status
 */

/**
 * An examination result entry.
 * @typedef {Object} Result
 * @property {string} id        - UUID
 * @property {string} studentId - Student UUID
 * @property {string} subject   - Subject name
 * @property {number} marks     - Score (0–100)
 * @property {string} grade     - Letter grade (e.g. 'A', 'B+')
 * @property {string} term      - Term/semester identifier
 */

/**
 * A portfolio experience entry.
 * @typedef {Object} ExperienceEntry
 * @property {string} id           - UUID
 * @property {string} studentId    - Student UUID
 * @property {string} title        - Role or activity title
 * @property {string} [organization] - Organisation name
 * @property {string} startDate    - ISO date string
 * @property {string} [endDate]    - ISO date string (null if ongoing)
 * @property {string} [description] - Free-text description
 */

/**
 * A portfolio media item (project gallery).
 * @typedef {Object} PortfolioMedia
 * @property {string}           id               - UUID
 * @property {string}           studentId        - Student UUID
 * @property {string}           url              - File URL
 * @property {string}           mimeType         - MIME type
 * @property {string}           [title]          - Media title
 * @property {string}           [description]    - Media description
 * @property {ModerationStatus} moderationStatus - Moderation state
 */

/**
 * An announcement created by an admin.
 * @typedef {Object} Announcement
 * @property {string} id         - UUID
 * @property {string} title      - Announcement title
 * @property {string} content    - Announcement body
 * @property {Role | 'all'} targetRole - Target audience
 * @property {string} createdBy  - Admin UUID
 * @property {string} createdAt  - ISO datetime string
 */

/**
 * A user record (safe — no password hash).
 * @typedef {Object} UserRecord
 * @property {string}  id          - UUID
 * @property {Role}    role        - User role
 * @property {string}  name        - Full name
 * @property {string}  email       - Email address
 * @property {string}  [schoolLevel] - School level
 * @property {string}  [location]  - Current location
 * @property {boolean} isActive    - Account active flag
 * @property {string}  [deletedAt] - Soft-delete timestamp
 * @property {string}  createdAt   - Account creation timestamp
 */

// Export an empty object — this file is documentation-only at runtime.
module.exports = {};
