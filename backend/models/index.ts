import sequelize from '../config/database';

// Import all models
import Faculty from './Faculty';
import StudyProgram from './StudyProgram';
import BookCategory from './BookCategory';
import User from './User';
import Book from './Book';
import BookBarcode from './BookBarcode';
import Borrowing from './Borrowing';
import BorrowingSetting from './BorrowingSetting';
import PasswordReset from './PasswordReset';
import RefreshToken from './RefreshToken';
import Notification from './Notification';
import AuditLog from './AuditLog';
import UserSession from './UserSession';

// Collect all models
const models = {
  Faculty,
  StudyProgram,
  BookCategory,
  User,
  Book,
  BookBarcode,
  Borrowing,
  BorrowingSetting,
  PasswordReset,
  RefreshToken,
  Notification,
  AuditLog,
  UserSession,
};

// Initialize associations
Object.values(models).forEach((model: any) => {
  if (model.associate) {
    model.associate(models);
  }
});

export {
  sequelize,
  Faculty,
  StudyProgram,
  BookCategory,
  User,
  Book,
  BookBarcode,
  Borrowing,
  BorrowingSetting,
  PasswordReset,
  RefreshToken,
  Notification,
  AuditLog,
  UserSession,
};

export default models;
