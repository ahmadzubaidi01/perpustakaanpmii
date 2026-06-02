import { Request, Response, NextFunction } from 'express';
import { UserRole, ROLE_HIERARCHY } from '../config/constants';
import apiResponse from '../utils/apiResponse';

/**
 * Role-Based Access Control (RBAC) middleware.
 * Buku PMII Lintang Songo — 3-level hierarchy:
 * super_admin > komisariat_admin > borrower
 */

/**
 * Restrict access to specific roles.
 */
const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      apiResponse.unauthorized(res, 'Authentication required');
      return;
    }

    const userRole = req.user.user_role as UserRole;

    if (!allowedRoles.includes(userRole)) {
      apiResponse.forbidden(res, 'Insufficient permissions for this action');
      return;
    }

    next();
  };
};

/**
 * Restrict access to users with role at or above the specified minimum level.
 * Lower hierarchy number = higher authority.
 */
const requireMinRole = (minRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      apiResponse.unauthorized(res, 'Authentication required');
      return;
    }

    const userRole = req.user.user_role as UserRole;
    const userLevel = ROLE_HIERARCHY[userRole];
    const requiredLevel = ROLE_HIERARCHY[minRole];

    if (userLevel === undefined || userLevel > requiredLevel) {
      apiResponse.forbidden(res, 'Insufficient permissions for this action');
      return;
    }

    next();
  };
};

/**
 * Enforce that user can only access their own data.
 * Super Admin and Komisariat Admin can access any user.
 */
const enforceSelfOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    apiResponse.unauthorized(res, 'Authentication required');
    return;
  }

  const userRole = req.user.user_role as UserRole;
  const targetUserId = parseInt(req.params.user_id as string, 10);

  // Admins can access all users
  if (ROLE_HIERARCHY[userRole] <= ROLE_HIERARCHY[UserRole.KOMISARIAT_ADMIN]) {
    next();
    return;
  }

  // Borrowers can only access their own data
  if (targetUserId && targetUserId !== req.user.user_id) {
    apiResponse.forbidden(res, 'You can only access your own data');
    return;
  }

  next();
};

export {
  requireRole,
  requireMinRole,
  enforceSelfOrAdmin,
};
