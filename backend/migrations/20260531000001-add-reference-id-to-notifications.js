'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Check if reference_id column already exists to prevent errors
      const tableInfo = await queryInterface.describeTable('notifications');
      if (!tableInfo.reference_id) {
        await queryInterface.addColumn('notifications', 'reference_id', {
          type: Sequelize.STRING(255),
          allowNull: true,
          defaultValue: null,
        });
        console.log('[Migration] Added reference_id column to notifications table successfully.');
      } else {
        console.log('[Migration] Column reference_id already exists in notifications table. Skipping.');
      }
    } catch (error) {
      console.error('[Migration] Failed to add reference_id column to notifications:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      const tableInfo = await queryInterface.describeTable('notifications');
      if (tableInfo.reference_id) {
        await queryInterface.removeColumn('notifications', 'reference_id');
        console.log('[Migration] Removed reference_id column from notifications table successfully.');
      }
    } catch (error) {
      console.error('[Migration] Failed to remove reference_id column from notifications:', error.message);
      throw error;
    }
  }
};
