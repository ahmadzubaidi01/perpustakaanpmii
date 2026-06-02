/**
 * Create the perpus_pmii database and all tables for the new schema.
 * Run with: npx ts-node setup_database.ts
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, './.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

async function setupDatabase() {
  const dbName = process.env.DB_NAME || 'perpus_pmii';
  console.log(`🔧 Setting up database: ${dbName}...\n`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
  });

  // Switch to database
  await connection.query(`USE \`${dbName}\``);

  // ============================================
  // CREATE TABLES
  // ============================================

  // 1. Faculties
  await connection.query(`
    CREATE TABLE IF NOT EXISTS faculties (
      faculty_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      faculty_name VARCHAR(255) NOT NULL,
      faculty_code VARCHAR(20) NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Table faculties created');

  // 2. Study Programs
  await connection.query(`
    CREATE TABLE IF NOT EXISTS study_programs (
      program_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      faculty_id INT UNSIGNED NOT NULL,
      program_name VARCHAR(255) NOT NULL,
      program_code VARCHAR(20) NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      FOREIGN KEY (faculty_id) REFERENCES faculties(faculty_id) ON UPDATE CASCADE ON DELETE RESTRICT,
      INDEX idx_sp_faculty (faculty_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Table study_programs created');

  // 3. Book Categories
  await connection.query(`
    CREATE TABLE IF NOT EXISTS book_categories (
      category_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      category_name VARCHAR(255) NOT NULL,
      category_slug VARCHAR(300) NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Table book_categories created');

  // 4. Users
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      nim VARCHAR(20) NULL UNIQUE,
      full_name VARCHAR(255) NOT NULL,
      email_address VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      phone_number VARCHAR(20) NULL,
      profile_photo_url VARCHAR(500) NULL,
      user_role ENUM('super_admin', 'komisariat_admin', 'borrower') NOT NULL,
      account_status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
      last_login_at DATETIME NULL,
      faculty_id INT UNSIGNED NULL,
      program_id INT UNSIGNED NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      FOREIGN KEY (faculty_id) REFERENCES faculties(faculty_id) ON UPDATE CASCADE ON DELETE SET NULL,
      FOREIGN KEY (program_id) REFERENCES study_programs(program_id) ON UPDATE CASCADE ON DELETE SET NULL,
      INDEX idx_users_faculty (faculty_id),
      INDEX idx_users_program (program_id),
      INDEX idx_users_role (user_role),
      INDEX idx_users_status (account_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Table users created');

  // 5. Books
  await connection.query(`
    CREATE TABLE IF NOT EXISTS books (
      book_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      book_code VARCHAR(50) NOT NULL UNIQUE,
      book_title VARCHAR(500) NOT NULL,
      book_slug VARCHAR(550) NOT NULL UNIQUE,
      book_description TEXT NULL,
      author_name VARCHAR(255) NOT NULL,
      publisher_name VARCHAR(255) NULL,
      isbn_code VARCHAR(20) NULL UNIQUE,
      publication_year INT NULL,
      category_id INT UNSIGNED NULL,
      rack_location VARCHAR(100) NULL,
      total_stock INT UNSIGNED NOT NULL DEFAULT 0,
      available_stock INT UNSIGNED NOT NULL DEFAULT 0,
      borrowed_stock INT UNSIGNED NOT NULL DEFAULT 0,
      cover_image_url VARCHAR(500) NULL,
      book_status ENUM('available', 'borrowed', 'damaged', 'lost') NOT NULL DEFAULT 'available',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      FOREIGN KEY (category_id) REFERENCES book_categories(category_id) ON UPDATE CASCADE ON DELETE SET NULL,
      INDEX idx_books_category (category_id),
      INDEX idx_books_status (book_status),
      INDEX idx_books_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Table books created');

  // 6. Book Barcodes
  await connection.query(`
    CREATE TABLE IF NOT EXISTS book_barcodes (
      barcode_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      book_id INT UNSIGNED NOT NULL,
      barcode_value VARCHAR(100) NOT NULL,
      barcode_status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      FOREIGN KEY (book_id) REFERENCES books(book_id) ON UPDATE CASCADE ON DELETE CASCADE,
      INDEX idx_barcode_book (book_id),
      INDEX idx_barcode_value (barcode_value),
      INDEX idx_barcode_status (barcode_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Table book_barcodes created');

  // 7. Borrowing Settings (global — single row)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS borrowing_settings (
      setting_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      max_borrow_days INT UNSIGNED NOT NULL DEFAULT 30,
      default_borrow_days INT UNSIGNED NOT NULL DEFAULT 14,
      max_books_per_borrower INT UNSIGNED NOT NULL DEFAULT 3,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Table borrowing_settings created');

  // Insert default borrowing settings row
  await connection.query(`
    INSERT IGNORE INTO borrowing_settings (setting_id, max_borrow_days, default_borrow_days, max_books_per_borrower)
    VALUES (1, 30, 14, 3)
  `);
  console.log('✅ Default borrowing settings inserted');

  // 8. Borrowings
  await connection.query(`
    CREATE TABLE IF NOT EXISTS borrowings (
      borrowing_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      borrowing_code VARCHAR(50) NOT NULL UNIQUE,
      user_id INT UNSIGNED NOT NULL,
      book_id INT UNSIGNED NOT NULL,
      borrowed_at DATETIME NULL,
      due_date DATETIME NULL,
      returned_at DATETIME NULL,
      borrowing_status ENUM('pending', 'borrowed', 'returned', 'overdue') NOT NULL DEFAULT 'pending',
      approved_by_user_id INT UNSIGNED NULL,
      notes TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
      FOREIGN KEY (book_id) REFERENCES books(book_id) ON UPDATE CASCADE ON DELETE RESTRICT,
      FOREIGN KEY (approved_by_user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
      INDEX idx_borrow_user (user_id),
      INDEX idx_borrow_book (book_id),
      INDEX idx_borrow_status (borrowing_status),
      INDEX idx_borrow_approver (approved_by_user_id),
      INDEX idx_borrow_created (created_at),
      INDEX idx_book_borrowing_status (book_id, borrowing_status),
      INDEX idx_user_borrowing_status (user_id, borrowing_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Table borrowings created');

  // 9. Password Resets
  await connection.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      reset_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      email_address VARCHAR(255) NOT NULL,
      reset_token_hash VARCHAR(255) NOT NULL,
      expired_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Table password_resets created');

  // 10. Refresh Tokens
  await connection.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      refresh_token_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      device_name VARCHAR(255) NULL,
      device_type VARCHAR(100) NULL,
      ip_address VARCHAR(45) NULL,
      issued_at DATETIME NOT NULL,
      expired_at DATETIME NOT NULL,
      revoked_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
      INDEX idx_rt_user (user_id),
      INDEX idx_rt_hash (token_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Table refresh_tokens created');

  // 11. Notifications
  await connection.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      notification_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      notification_title VARCHAR(255) NOT NULL,
      notification_message TEXT NOT NULL,
      notification_type ENUM('borrow_request', 'borrow_approved', 'return_confirmed', 'overdue_warning', 'system_alert', 'admin_message') NOT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      reference_id VARCHAR(255) NULL,
      sent_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
      INDEX idx_notif_user (user_id),
      INDEX idx_notif_type (notification_type),
      INDEX idx_notif_read (is_read),
      INDEX idx_notif_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Table notifications created');

  // 12. Audit Logs (immutable)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      log_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      action_type VARCHAR(50) NOT NULL,
      table_name VARCHAR(100) NOT NULL,
      affected_record_id VARCHAR(100) NOT NULL,
      old_value JSON NULL,
      new_value JSON NULL,
      performed_by_user_id INT UNSIGNED NULL,
      device_name VARCHAR(255) NULL,
      device_type VARCHAR(100) NULL,
      device_os VARCHAR(100) NULL,
      browser_name VARCHAR(100) NULL,
      browser_version VARCHAR(50) NULL,
      ip_address VARCHAR(45) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (performed_by_user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
      INDEX idx_audit_user (performed_by_user_id),
      INDEX idx_audit_action (action_type),
      INDEX idx_audit_table (table_name),
      INDEX idx_audit_record (affected_record_id),
      INDEX idx_audit_created (created_at),
      INDEX idx_audit_table_record (table_name, affected_record_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Table audit_logs created');

  // 13. User Sessions
  await connection.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      session_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      device_name VARCHAR(255) NULL,
      device_type VARCHAR(100) NULL,
      device_os VARCHAR(100) NULL,
      browser_name VARCHAR(100) NULL,
      browser_version VARCHAR(50) NULL,
      ip_address VARCHAR(45) NULL,
      login_at DATETIME NOT NULL,
      expired_at DATETIME NOT NULL,
      session_status ENUM('active', 'expired', 'revoked', 'terminated') NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
      INDEX idx_session_user (user_id),
      INDEX idx_session_status (session_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Table user_sessions created');

  // ============================================
  // SEED DEFAULT SUPER ADMIN
  // ============================================
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash('Intelektual@19', 12);
  
  await connection.query(`
    INSERT IGNORE INTO users (user_id, full_name, email_address, password_hash, user_role, account_status)
    VALUES (1, 'Super Admin', 'admin@pmiiunusida.com', ?, 'super_admin', 'active')
  `, [passwordHash]);
  console.log('✅ Default Super Admin created (admin@pmiiunusida.com / Intelektual@19)');

  // Seed sample faculties
  await connection.query(`
    INSERT IGNORE INTO faculties (faculty_id, faculty_name, faculty_code) VALUES
    (1, 'Fakultas Ilmu Komputer', 'FILKOM'),
    (2, 'Fakultas Teknik', 'FT'),
    (3, 'Fakultas Keguruan dan Ilmu Pendidikan', 'FKIP'),
    (4, 'Fakultas Ekonomi', 'FE'),
    (5, 'Fakultas Agama Islam', 'FAI')
  `);
  console.log('✅ Sample faculties seeded');

  // Seed sample study programs
  await connection.query(`
    INSERT IGNORE INTO study_programs (program_id, faculty_id, program_name, program_code) VALUES
    (1, 1, 'Informatika', 'IF'),
    (2, 1, 'Sistem Informasi', 'SI'),
    (3, 1, 'Desain Komunikasi Visual', 'DKV'),
    (4, 2, 'Teknik Industri', 'TIND'),
    (5, 2, 'Teknik Lingkungan', 'TLING'),
    (6, 2, 'Teknik Kimia', 'TKIM'),
    (7, 3, 'Pendidikan Guru Sekolah Dasar', 'PGSD'),
    (8, 3, 'Pendidikan Bahasa Inggris', 'PBI'),
    (9, 4, 'Manajemen', 'MJ'),
    (10, 4, 'Akuntansi', 'AK'),
    (11, 5, 'Pendidikan Guru Madrasah Ibtidaiyah', 'PGMI'),
    (12, 5, 'Pendidikan Islam Anak Usia Dini', 'PIAUD')
  `);
  console.log('✅ Sample study programs seeded');

  // Seed sample categories
  await connection.query(`
    INSERT IGNORE INTO book_categories (category_id, category_name, category_slug) VALUES
    (1, 'Keislaman', 'keislaman'),
    (2, 'Ke-PMII-an', 'ke-pmii-an'),
    (3, 'Politik', 'politik'),
    (4, 'Filsafat', 'filsafat'),
    (5, 'Sejarah', 'sejarah'),
    (6, 'Sastra', 'sastra'),
    (7, 'Sains & Teknologi', 'sains-teknologi'),
    (8, 'Sosial & Budaya', 'sosial-budaya'),
    (9, 'Ekonomi', 'ekonomi'),
    (10, 'Hukum', 'hukum')
  `);
  console.log('✅ Sample book categories seeded');

  await connection.end();
  console.log('\n🎉 Database setup complete!');
  console.log('   Database: perpus_pmii');
  console.log('   Tables: 13');
  console.log('   Super Admin: admin@pmiiunusida.com / Intelektual@19');
}

setupDatabase().catch((err) => {
  console.error('❌ Database setup failed:', err);
  process.exit(1);
});
