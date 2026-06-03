'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. faculties
    await queryInterface.createTable('faculties', {
      faculty_id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      faculty_name: { type: Sequelize.STRING(255), allowNull: false },
      faculty_code: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      deleted_at: { type: Sequelize.DATE, allowNull: true, defaultValue: null },
    });
    await queryInterface.addIndex('faculties', ['faculty_code'], { unique: true, name: 'idx_faculties_faculty_code' });

    // 2. study_programs
    await queryInterface.createTable('study_programs', {
      program_id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      faculty_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'faculties', key: 'faculty_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      program_name: { type: Sequelize.STRING(255), allowNull: false },
      program_code: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      deleted_at: { type: Sequelize.DATE, allowNull: true, defaultValue: null },
    });
    await queryInterface.addIndex('study_programs', ['program_code'], { unique: true, name: 'idx_study_programs_program_code' });
    await queryInterface.addIndex('study_programs', ['faculty_id'], { name: 'idx_study_programs_faculty_id' });

    // 3. book_categories
    await queryInterface.createTable('book_categories', {
      category_id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      category_name: { type: Sequelize.STRING(255), allowNull: false },
      category_slug: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      deleted_at: { type: Sequelize.DATE, allowNull: true, defaultValue: null },
    });
    await queryInterface.addIndex('book_categories', ['category_slug'], { unique: true, name: 'idx_book_categories_category_slug' });

    // 4. users
    await queryInterface.createTable('users', {
      user_id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      nim: { type: Sequelize.STRING(20), allowNull: true, unique: true },
      full_name: { type: Sequelize.STRING(255), allowNull: false },
      email_address: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      phone_number: { type: Sequelize.STRING(20), allowNull: true },
      profile_photo_url: { type: Sequelize.STRING(500), allowNull: true },
      user_role: {
        type: Sequelize.ENUM('super_admin', 'komisariat_admin', 'borrower'),
        allowNull: false,
      },
      account_status: {
        type: Sequelize.ENUM('active', 'inactive', 'suspended'),
        allowNull: false,
        defaultValue: 'active',
      },
      last_login_at: { type: Sequelize.DATE, allowNull: true },
      faculty_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'faculties', key: 'faculty_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      program_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'study_programs', key: 'program_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      deleted_at: { type: Sequelize.DATE, allowNull: true, defaultValue: null },
    });
    await queryInterface.addIndex('users', ['email_address'], { unique: true, name: 'idx_users_email_address' });
    await queryInterface.addIndex('users', ['nim'], { unique: true, name: 'idx_users_nim' });
    await queryInterface.addIndex('users', ['faculty_id'], { name: 'idx_users_faculty_id' });
    await queryInterface.addIndex('users', ['program_id'], { name: 'idx_users_program_id' });
    await queryInterface.addIndex('users', ['user_role'], { name: 'idx_users_user_role' });
    await queryInterface.addIndex('users', ['account_status'], { name: 'idx_users_account_status' });

    // 5. books
    await queryInterface.createTable('books', {
      book_id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      book_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      book_title: { type: Sequelize.STRING(500), allowNull: false },
      book_slug: { type: Sequelize.STRING(550), allowNull: false, unique: true },
      book_description: { type: Sequelize.TEXT, allowNull: true },
      author_name: { type: Sequelize.STRING(255), allowNull: false },
      publisher_name: { type: Sequelize.STRING(255), allowNull: true },
      isbn_code: { type: Sequelize.STRING(20), allowNull: true, unique: true },
      publication_year: { type: Sequelize.INTEGER, allowNull: true },
      category_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'book_categories', key: 'category_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      rack_location: { type: Sequelize.STRING(100), allowNull: true },
      total_stock: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      available_stock: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      borrowed_stock: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      cover_image_url: { type: Sequelize.STRING(500), allowNull: true },
      book_status: {
        type: Sequelize.ENUM('available', 'borrowed', 'damaged', 'lost'),
        allowNull: false,
        defaultValue: 'available',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      deleted_at: { type: Sequelize.DATE, allowNull: true, defaultValue: null },
    });
    await queryInterface.addIndex('books', ['book_code'], { unique: true, name: 'idx_books_book_code' });
    await queryInterface.addIndex('books', ['book_slug'], { unique: true, name: 'idx_books_book_slug' });
    await queryInterface.addIndex('books', ['isbn_code'], { unique: true, name: 'idx_books_isbn_code' });
    await queryInterface.addIndex('books', ['category_id'], { name: 'idx_books_category_id' });
    await queryInterface.addIndex('books', ['book_status'], { name: 'idx_books_book_status' });
    await queryInterface.addIndex('books', ['created_at'], { name: 'idx_books_created_at' });

    // 6. book_barcodes
    await queryInterface.createTable('book_barcodes', {
      barcode_id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      book_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'books', key: 'book_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      barcode_value: { type: Sequelize.STRING(100), allowNull: false },
      barcode_status: {
        type: Sequelize.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      deleted_at: { type: Sequelize.DATE, allowNull: true, defaultValue: null },
    });
    await queryInterface.addIndex('book_barcodes', ['book_id'], { name: 'idx_book_barcodes_book_id' });
    await queryInterface.addIndex('book_barcodes', ['barcode_value'], { name: 'idx_book_barcodes_barcode_value' });
    await queryInterface.addIndex('book_barcodes', ['barcode_status'], { name: 'idx_book_barcodes_barcode_status' });

    // 7. borrowing_settings
    await queryInterface.createTable('borrowing_settings', {
      setting_id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      max_borrow_days: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 30 },
      default_borrow_days: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 14 },
      max_books_per_borrower: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 3 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // 8. borrowings
    await queryInterface.createTable('borrowings', {
      borrowing_id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      borrowing_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      book_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'books', key: 'book_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      borrowed_at: { type: Sequelize.DATE, allowNull: true },
      due_date: { type: Sequelize.DATE, allowNull: true },
      returned_at: { type: Sequelize.DATE, allowNull: true },
      borrowing_status: {
        type: Sequelize.ENUM('pending', 'borrowed', 'returned', 'overdue'),
        allowNull: false,
        defaultValue: 'pending',
      },
      approved_by_user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('borrowings', ['borrowing_code'], { unique: true, name: 'idx_borrowings_borrowing_code' });
    await queryInterface.addIndex('borrowings', ['user_id'], { name: 'idx_borrowings_user_id' });
    await queryInterface.addIndex('borrowings', ['book_id'], { name: 'idx_borrowings_book_id' });
    await queryInterface.addIndex('borrowings', ['borrowing_status'], { name: 'idx_borrowings_borrowing_status' });
    await queryInterface.addIndex('borrowings', ['approved_by_user_id'], { name: 'idx_borrowings_approved_by_user_id' });
    await queryInterface.addIndex('borrowings', ['created_at'], { name: 'idx_borrowings_created_at' });
    await queryInterface.addIndex('borrowings', ['book_id', 'borrowing_status'], { name: 'idx_borrowings_book_borrowing_status' });
    await queryInterface.addIndex('borrowings', ['user_id', 'borrowing_status'], { name: 'idx_borrowings_user_borrowing_status' });

    // 9. password_resets
    await queryInterface.createTable('password_resets', {
      reset_id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      email_address: { type: Sequelize.STRING(255), allowNull: false },
      reset_token_hash: { type: Sequelize.STRING(255), allowNull: false },
      expired_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('password_resets', ['email_address'], { name: 'idx_password_resets_email_address' });
    await queryInterface.addIndex('password_resets', ['reset_token_hash'], { name: 'idx_password_resets_reset_token_hash' });
    await queryInterface.addIndex('password_resets', ['expired_at'], { name: 'idx_password_resets_expired_at' });

    // 10. refresh_tokens
    await queryInterface.createTable('refresh_tokens', {
      refresh_token_id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      token_hash: { type: Sequelize.STRING(255), allowNull: false },
      device_name: { type: Sequelize.STRING(255), allowNull: true },
      device_type: { type: Sequelize.STRING(100), allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      issued_at: { type: Sequelize.DATE, allowNull: false },
      expired_at: { type: Sequelize.DATE, allowNull: false },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('refresh_tokens', ['user_id'], { name: 'idx_refresh_tokens_user_id' });
    await queryInterface.addIndex('refresh_tokens', ['token_hash'], { name: 'idx_refresh_tokens_token_hash' });
    await queryInterface.addIndex('refresh_tokens', ['expired_at'], { name: 'idx_refresh_tokens_expired_at' });

    // 11. notifications
    await queryInterface.createTable('notifications', {
      notification_id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      notification_title: { type: Sequelize.STRING(255), allowNull: false },
      notification_message: { type: Sequelize.TEXT, allowNull: false },
      notification_type: {
        type: Sequelize.ENUM('borrow_request', 'borrow_approved', 'return_confirmed', 'overdue_warning', 'system_alert', 'admin_message'),
        allowNull: false,
      },
      is_read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      reference_id: { type: Sequelize.STRING(255), allowNull: true, defaultValue: null },
      sent_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      deleted_at: { type: Sequelize.DATE, allowNull: true, defaultValue: null },
    });
    await queryInterface.addIndex('notifications', ['user_id'], { name: 'idx_notifications_user_id' });
    await queryInterface.addIndex('notifications', ['notification_type'], { name: 'idx_notifications_notification_type' });
    await queryInterface.addIndex('notifications', ['is_read'], { name: 'idx_notifications_is_read' });
    await queryInterface.addIndex('notifications', ['created_at'], { name: 'idx_notifications_created_at' });

    // 12. audit_logs
    await queryInterface.createTable('audit_logs', {
      log_id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      action_type: { type: Sequelize.STRING(50), allowNull: false },
      table_name: { type: Sequelize.STRING(100), allowNull: false },
      affected_record_id: { type: Sequelize.STRING(100), allowNull: false },
      old_value: { type: Sequelize.JSON, allowNull: true },
      new_value: { type: Sequelize.JSON, allowNull: true },
      performed_by_user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      device_name: { type: Sequelize.STRING(255), allowNull: true },
      device_type: { type: Sequelize.STRING(100), allowNull: true },
      device_os: { type: Sequelize.STRING(100), allowNull: true },
      browser_name: { type: Sequelize.STRING(100), allowNull: true },
      browser_version: { type: Sequelize.STRING(50), allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('audit_logs', ['performed_by_user_id'], { name: 'idx_audit_logs_performed_by_user_id' });
    await queryInterface.addIndex('audit_logs', ['action_type'], { name: 'idx_audit_logs_action_type' });
    await queryInterface.addIndex('audit_logs', ['table_name'], { name: 'idx_audit_logs_table_name' });
    await queryInterface.addIndex('audit_logs', ['affected_record_id'], { name: 'idx_audit_logs_affected_record_id' });
    await queryInterface.addIndex('audit_logs', ['created_at'], { name: 'idx_audit_logs_created_at' });
    await queryInterface.addIndex('audit_logs', ['table_name', 'affected_record_id'], { name: 'idx_audit_logs_table_record' });

    // 13. user_sessions
    await queryInterface.createTable('user_sessions', {
      session_id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      device_name: { type: Sequelize.STRING(255), allowNull: true },
      device_type: { type: Sequelize.STRING(100), allowNull: true },
      device_os: { type: Sequelize.STRING(100), allowNull: true },
      browser_name: { type: Sequelize.STRING(100), allowNull: true },
      browser_version: { type: Sequelize.STRING(50), allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      login_at: { type: Sequelize.DATE, allowNull: false },
      expired_at: { type: Sequelize.DATE, allowNull: false },
      session_status: {
        type: Sequelize.ENUM('active', 'expired', 'revoked', 'terminated'),
        allowNull: false,
        defaultValue: 'active',
      },
    });
    await queryInterface.addIndex('user_sessions', ['user_id'], { name: 'idx_user_sessions_user_id' });
    await queryInterface.addIndex('user_sessions', ['session_status'], { name: 'idx_user_sessions_session_status' });
    await queryInterface.addIndex('user_sessions', ['expired_at'], { name: 'idx_user_sessions_expired_at' });
    await queryInterface.addIndex('user_sessions', ['login_at'], { name: 'idx_user_sessions_login_at' });
  },

  async down(queryInterface) {
    // Drop in reverse order to respect FK constraints
    await queryInterface.dropTable('user_sessions');
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('notifications');
    await queryInterface.dropTable('refresh_tokens');
    await queryInterface.dropTable('password_resets');
    await queryInterface.dropTable('borrowings');
    await queryInterface.dropTable('borrowing_settings');
    await queryInterface.dropTable('book_barcodes');
    await queryInterface.dropTable('books');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('book_categories');
    await queryInterface.dropTable('study_programs');
    await queryInterface.dropTable('faculties');
  },
};
