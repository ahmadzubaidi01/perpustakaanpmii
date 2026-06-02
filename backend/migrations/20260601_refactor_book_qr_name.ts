import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Refactor book_qr table for simplified QR system.
 * 
 * Changes:
 * 1. Add `book_qr_name` column (VARCHAR 100, NOT NULL)
 * 2. Copy existing `qr_serial_number` values into `book_qr_name`
 * 3. Drop columns: `qr_uuid`, `qr_image_url`, `qr_serial_number`
 * 4. Add composite index on (book_qr_name, book_id)
 */
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // 1. Add book_qr_name column with a temporary default
    await queryInterface.addColumn('book_qr', 'book_qr_name', {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'TEMP_MIGRATION',
    });

    // 2. Copy existing qr_serial_number values into book_qr_name
    await queryInterface.sequelize.query(
      `UPDATE book_qr SET book_qr_name = qr_serial_number WHERE qr_serial_number IS NOT NULL`
    );

    // 3. Remove the temporary default
    await queryInterface.changeColumn('book_qr', 'book_qr_name', {
      type: DataTypes.STRING(100),
      allowNull: false,
    });

    // 4. Drop old columns
    try {
      await queryInterface.removeIndex('book_qr', ['qr_uuid']);
    } catch (e) { /* index may not exist */ }
    try {
      await queryInterface.removeIndex('book_qr', ['qr_serial_number']);
    } catch (e) { /* index may not exist */ }

    await queryInterface.removeColumn('book_qr', 'qr_uuid');
    await queryInterface.removeColumn('book_qr', 'qr_image_url');
    await queryInterface.removeColumn('book_qr', 'qr_serial_number');

    // 5. Add composite index
    await queryInterface.addIndex('book_qr', ['book_qr_name', 'book_id'], {
      name: 'idx_book_qr_name_book_id',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    // Reverse: restore old columns
    await queryInterface.addColumn('book_qr', 'qr_uuid', {
      type: DataTypes.UUID,
      allowNull: true,
    });
    await queryInterface.addColumn('book_qr', 'qr_serial_number', {
      type: DataTypes.STRING(50),
      allowNull: true,
    });
    await queryInterface.addColumn('book_qr', 'qr_image_url', {
      type: DataTypes.STRING(500),
      allowNull: true,
    });

    // Copy book_qr_name back to qr_serial_number
    await queryInterface.sequelize.query(
      `UPDATE book_qr SET qr_serial_number = book_qr_name WHERE book_qr_name IS NOT NULL`
    );

    try {
      await queryInterface.removeIndex('book_qr', 'idx_book_qr_name_book_id');
    } catch (e) { /* index may not exist */ }

    await queryInterface.removeColumn('book_qr', 'book_qr_name');
  },
};
