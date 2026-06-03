/**
 * Application-wide constants and enum definitions.
 * Buku PMII Lintang Songo — Library Management System
 * All enums match the database ENUM column definitions exactly.
 */

// =============================================
// ROLE HIERARCHY
// =============================================
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  KOMISARIAT_ADMIN = 'komisariat_admin',
  BORROWER = 'borrower',
}

/**
 * Role hierarchy level — lower number = higher authority.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 0,
  [UserRole.KOMISARIAT_ADMIN]: 1,
  [UserRole.BORROWER]: 2,
};

// =============================================
// ACCOUNT STATUS
// =============================================
export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

// =============================================
// BOOK STATUS
// =============================================
export enum BookStatus {
  AVAILABLE = 'available',
  BORROWED = 'borrowed',
  DAMAGED = 'damaged',
  LOST = 'lost',
}

// =============================================
// BARCODE STATUS
// =============================================
export enum BarcodeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

// =============================================
// BORROWING STATUS
// =============================================
export enum BorrowingStatus {
  PENDING = 'pending',
  BORROWED = 'borrowed',
  RETURNED = 'returned',
  OVERDUE = 'overdue',
}

// =============================================
// NOTIFICATION TYPE
// =============================================
export enum NotificationType {
  BORROW_REQUEST = 'borrow_request',
  BORROW_APPROVED = 'borrow_approved',
  RETURN_CONFIRMED = 'return_confirmed',
  OVERDUE_WARNING = 'overdue_warning',
  SYSTEM_ALERT = 'system_alert',
  ADMIN_MESSAGE = 'admin_message',
}

// =============================================
// SESSION STATUS
// =============================================
export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  TERMINATED = 'terminated',
}

// =============================================
// BORROWING SETTINGS DEFAULTS
// =============================================
export const BORROWING_DEFAULTS = {
  MAX_BORROW_DAYS: 14,
  DEFAULT_BORROW_DAYS: 14,
  MAX_BOOKS_PER_BORROWER: 3,
} as const;

// =============================================
// PAGINATION DEFAULTS
// =============================================
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// =============================================
// AUDIT ACTION TYPES
// =============================================
export enum AuditActionType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  SOFT_DELETE = 'SOFT_DELETE',
  RESTORE = 'RESTORE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  BORROW = 'BORROW',
  RETURN = 'RETURN',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  PASSWORD_RESET = 'PASSWORD_RESET',
  STATUS_CHANGE = 'STATUS_CHANGE',
}

// =============================================
// TABLE NAMES (for audit references)
// =============================================
export const TABLE_NAMES = {
  USERS: 'users',
  BOOKS: 'books',
  BOOK_CATEGORIES: 'book_categories',
  BOOK_BARCODES: 'book_barcodes',
  BORROWINGS: 'borrowings',
  BORROWING_SETTINGS: 'borrowing_settings',
  FACULTIES: 'faculties',
  STUDY_PROGRAMS: 'study_programs',
  NOTIFICATIONS: 'notifications',
  AUDIT_LOGS: 'audit_logs',
  USER_SESSIONS: 'user_sessions',
  PASSWORD_RESETS: 'password_resets',
  REFRESH_TOKENS: 'refresh_tokens',
} as const;
