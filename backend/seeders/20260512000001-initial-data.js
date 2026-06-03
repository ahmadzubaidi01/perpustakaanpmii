'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // 1. Seed master faculties
    await queryInterface.bulkInsert('faculties', [
      { faculty_id: 1, faculty_name: 'Fakultas Ilmu Komputer', faculty_code: 'FILKOM', created_at: new Date(), updated_at: new Date() },
      { faculty_id: 2, faculty_name: 'Fakultas Teknik', faculty_code: 'FT', created_at: new Date(), updated_at: new Date() },
      { faculty_id: 3, faculty_name: 'Fakultas Keguruan dan Ilmu Pendidikan', faculty_code: 'FKIP', created_at: new Date(), updated_at: new Date() },
      { faculty_id: 4, faculty_name: 'Fakultas Ekonomi', faculty_code: 'FE', created_at: new Date(), updated_at: new Date() },
      { faculty_id: 5, faculty_name: 'Fakultas Agama Islam', faculty_code: 'FAI', created_at: new Date(), updated_at: new Date() }
    ]);

    // 2. Seed master study_programs
    await queryInterface.bulkInsert('study_programs', [
      { program_id: 1, faculty_id: 1, program_name: 'Informatika', program_code: 'IF', created_at: new Date(), updated_at: new Date() },
      { program_id: 2, faculty_id: 1, program_name: 'Sistem Informasi', program_code: 'SI', created_at: new Date(), updated_at: new Date() },
      { program_id: 3, faculty_id: 1, program_name: 'Desain Komunikasi Visual', program_code: 'DKV', created_at: new Date(), updated_at: new Date() },
      { program_id: 4, faculty_id: 2, program_name: 'Teknik Industri', program_code: 'TIND', created_at: new Date(), updated_at: new Date() },
      { program_id: 5, faculty_id: 2, program_name: 'Teknik Lingkungan', program_code: 'TLING', created_at: new Date(), updated_at: new Date() },
      { program_id: 6, faculty_id: 2, program_name: 'Teknik Kimia', program_code: 'TKIM', created_at: new Date(), updated_at: new Date() },
      { program_id: 7, faculty_id: 3, program_name: 'Pendidikan Guru Sekolah Dasar', program_code: 'PGSD', created_at: new Date(), updated_at: new Date() },
      { program_id: 8, faculty_id: 3, program_name: 'Pendidikan Bahasa Inggris', program_code: 'PBI', created_at: new Date(), updated_at: new Date() },
      { program_id: 9, faculty_id: 4, program_name: 'Manajemen', program_code: 'MJ', created_at: new Date(), updated_at: new Date() },
      { program_id: 10, faculty_id: 4, program_name: 'Akuntansi', program_code: 'AK', created_at: new Date(), updated_at: new Date() },
      { program_id: 11, faculty_id: 5, program_name: 'Pendidikan Guru Madrasah Ibtidaiyah', program_code: 'PGMI', created_at: new Date(), updated_at: new Date() },
      { program_id: 12, faculty_id: 5, program_name: 'Pendidikan Islam Anak Usia Dini', program_code: 'PIAUD', created_at: new Date(), updated_at: new Date() }
    ]);

    // 3. Seed book_categories
    await queryInterface.bulkInsert('book_categories', [
      { category_id: 1, category_name: 'Keislaman', category_slug: 'keislaman', created_at: new Date(), updated_at: new Date() },
      { category_id: 2, category_name: 'Ke-PMII-an', category_slug: 'ke-pmii-an', created_at: new Date(), updated_at: new Date() },
      { category_id: 3, category_name: 'Politik', category_slug: 'politik', created_at: new Date(), updated_at: new Date() },
      { category_id: 4, category_name: 'Filsafat', category_slug: 'filsafat', created_at: new Date(), updated_at: new Date() },
      { category_id: 5, category_name: 'Sejarah', category_slug: 'sejarah', created_at: new Date(), updated_at: new Date() },
      { category_id: 6, category_name: 'Sastra', category_slug: 'sastra', created_at: new Date(), updated_at: new Date() },
      { category_id: 7, category_name: 'Sains & Teknologi', category_slug: 'sains-teknologi', created_at: new Date(), updated_at: new Date() },
      { category_id: 8, category_name: 'Sosial & Budaya', category_slug: 'sosial-budaya', created_at: new Date(), updated_at: new Date() },
      { category_id: 9, category_name: 'Ekonomi', category_slug: 'ekonomi', created_at: new Date(), updated_at: new Date() },
      { category_id: 10, category_name: 'Hukum', category_slug: 'hukum', created_at: new Date(), updated_at: new Date() }
    ]);

    // 4. Seed default super admin user
    const passwordHash = '$2a$12$/kYYU6J6IuFFLarKoCnWTuh600jJYxCk/g2VGCl0r/taMfEMHAJj2';
    await queryInterface.bulkInsert('users', [
      {
        user_id: 1,
        nim: null,
        full_name: 'Super Admin',
        email_address: 'admin@pmiiunusida.com',
        password_hash: passwordHash,
        phone_number: null,
        profile_photo_url: null,
        user_role: 'super_admin',
        account_status: 'active',
        last_login_at: null,
        faculty_id: null,
        program_id: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null
      }
    ]);

    // 5. Seed borrowing_settings
    await queryInterface.bulkInsert('borrowing_settings', [
      {
        setting_id: 1,
        max_borrow_days: 30,
        default_borrow_days: 14,
        max_books_per_borrower: 3,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface) {
    // Clean up all seeded data
    await queryInterface.bulkDelete('borrowing_settings', null, {});
    await queryInterface.bulkDelete('users', null, {});
    await queryInterface.bulkDelete('book_categories', null, {});
    await queryInterface.bulkDelete('study_programs', null, {});
    await queryInterface.bulkDelete('faculties', null, {});
  },
};
