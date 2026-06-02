import cron from 'node-cron';
import { Op } from 'sequelize';
import { Borrowing } from '../models';
import { BorrowingStatus } from '../config/constants';
import logger from '../utils/logger';
import { runDailyBorrowingReminders } from '../services/notificationService';

export const initCronJobs = () => {
  // Run every midnight at 00:00
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running daily overdue check for borrowings...');
    try {
      const today = new Date();

      // Find borrowings that are 'borrowed' and their due_date is in the past
      const overdueBorrowings = await Borrowing.findAll({
        where: {
          borrowing_status: BorrowingStatus.BORROWED,
          due_date: { [Op.lt]: today }
        }
      });

      let count = 0;
      for (const borrowing of overdueBorrowings) {
        // Update borrowing status to overdue
        await borrowing.update({ borrowing_status: BorrowingStatus.OVERDUE });
        count++;
      }

      logger.info(`Overdue check completed. Marked ${count} borrowings as overdue.`);
    } catch (error) {
      logger.error('Error during daily overdue check cron job:', error);
    }

    try {
      logger.info('Running daily book return reminders...');
      await runDailyBorrowingReminders();
    } catch (error) {
      logger.error('Error during daily book return reminders cron job:', error);
    }
  });

  logger.info('Cron jobs initialized.');
};
