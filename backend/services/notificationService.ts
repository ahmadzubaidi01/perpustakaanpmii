import nodemailer from 'nodemailer';
import { Notification, Borrowing, Book, User } from '../models';
import { NotificationType, BorrowingStatus, UserRole } from '../config/constants';
import { Op } from 'sequelize';
import env from '../config/environment';
import logger from '../utils/logger';

/**
 * Email transporter setup.
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });
};

interface NotificationPayload {
  user_id: number;
  notification_title: string;
  notification_message: string;
  notification_type: NotificationType;
  reference_id?: string | null;
}

/**
 * Create an in-app notification.
 */
const createInAppNotification = async (payload: NotificationPayload): Promise<void> => {
  try {
    await Notification.create({
      user_id: payload.user_id,
      notification_title: payload.notification_title,
      notification_message: payload.notification_message,
      notification_type: payload.notification_type,
      reference_id: payload.reference_id || null,
      is_read: false,
      sent_at: new Date(),
    });

    logger.info('In-app notification created', {
      user_id: payload.user_id,
      type: payload.notification_type,
    });
  } catch (error: any) {
    logger.error('Failed to create in-app notification', {
      error: error.message,
      user_id: payload.user_id,
    });
  }
};

/**
 * Send email notification.
 * Supports delivery retries.
 */
const sendEmailNotification = async (
  to: string,
  subject: string,
  htmlBody: string,
  retries: number = 3
): Promise<boolean> => {
  const transporter = createTransporter();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await transporter.sendMail({
        from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
        to,
        subject,
        html: htmlBody,
      });

      logger.info('Email sent successfully', { to, subject, attempt });
      return true;
    } catch (error: any) {
      logger.warn(`Email send attempt ${attempt} failed`, {
        to,
        subject,
        error: error.message,
      });

      if (attempt === retries) {
        logger.error('Email send failed after all retries', {
          to,
          subject,
          error: error.message,
        });
        return false;
      }

      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }

  return false;
};

/**
 * Send due date reminder notification.
 */
const sendDueReminder = async (
  userId: number,
  bookTitle: string,
  dueDate: Date,
  email?: string
): Promise<void> => {
  const formattedDate = dueDate.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await createInAppNotification({
    user_id: userId,
    notification_title: 'Pengingat Batas Pengembalian Buku',
    notification_message: `Buku "${bookTitle}" yang Anda pinjam harus dikembalikan pada tanggal ${formattedDate}.`,
    notification_type: NotificationType.OVERDUE_WARNING,
  });

  if (email) {
    sendEmailNotification(
      email,
      `Pengingat Pengembalian Buku - ${bookTitle}`,
      `
        <h2>Pengingat Batas Pengembalian</h2>
        <p>Buku yang Anda pinjam <strong>"${bookTitle}"</strong> jatuh tempo pada <strong>${formattedDate}</strong>.</p>
        <p>Harap kembalikan tepat waktu.</p>
      `
    ).catch((err: any) => logger.error('Failed to send due reminder email in background', { error: err.message }));
  }
};

/**
 * Send late return warning notification.
 */
const sendLateWarning = async (
  userId: number,
  bookTitle: string,
  daysLate: number,
  email?: string
): Promise<void> => {
  await createInAppNotification({
    user_id: userId,
    notification_title: 'Peringatan Keterlambatan Pengembalian Buku',
    notification_message: `Buku "${bookTitle}" terlambat ${daysLate} hari dari batas waktu pengembalian.`,
    notification_type: NotificationType.OVERDUE_WARNING,
  });

  if (email) {
    sendEmailNotification(
      email,
      `Peringatan Terlambat Pengembalian - ${bookTitle}`,
      `
        <h2>Peringatan Terlambat Pengembalian</h2>
        <p>Buku <strong>"${bookTitle}"</strong> yang Anda pinjam telah terlambat <strong>${daysLate} hari</strong> dari batas waktu.</p>
        <p>Harap segera kembalikan buku ke perpustakaan.</p>
      `
    ).catch((err: any) => logger.error('Failed to send late warning email in background', { error: err.message }));
  }
};

/**
 * Get all admin users (Super Admin & Komisariat Admin).
 */
const getAdmins = async (): Promise<User[]> => {
  try {
    return await User.findAll({
      where: {
        account_status: 'active',
        user_role: {
          [Op.in]: [UserRole.SUPER_ADMIN, UserRole.KOMISARIAT_ADMIN]
        }
      }
    });
  } catch (err) {
    logger.error('Failed to get admins', err);
    return [];
  }
};

/**
 * Send borrowing event notification (borrow approved, request created, etc.).
 */
const sendBorrowingEvent = async (
  userId: number,
  bookTitle: string,
  eventType: 'approved' | 'created' | 'rejected',
  referenceId?: string
): Promise<void> => {
  const messages: Record<string, string> = {
    approved: `Peminjaman buku "${bookTitle}" telah disetujui.`,
    created: `Permintaan peminjaman buku "${bookTitle}" berhasil dibuat.`,
    rejected: `Permintaan peminjaman buku "${bookTitle}" ditolak.`,
  };

  const notificationTypes: Record<string, NotificationType> = {
    approved: NotificationType.BORROW_APPROVED,
    created: NotificationType.BORROW_REQUEST,
    rejected: NotificationType.SYSTEM_ALERT,
  };

  // 1. Notify the borrower
  await createInAppNotification({
    user_id: userId,
    notification_title: 'Peminjaman Buku',
    notification_message: messages[eventType] || `Update peminjaman: ${bookTitle}`,
    notification_type: notificationTypes[eventType] || NotificationType.SYSTEM_ALERT,
    reference_id: referenceId,
  });

  // 2. Notify all admins for a new request
  if (eventType === 'created') {
    try {
      const borrower = await User.findByPk(userId);
      if (borrower) {
        const admins = await getAdmins();
        for (const admin of admins) {
          await createInAppNotification({
            user_id: admin.user_id,
            notification_title: 'Permintaan Peminjaman Baru',
            notification_message: `Anggota ${borrower.full_name} meminta peminjaman buku "${bookTitle}".`,
            notification_type: NotificationType.BORROW_REQUEST,
            reference_id: referenceId,
          });
        }
      }
    } catch (err: any) {
      logger.error('Failed to notify admins of borrowing request:', err.message);
    }
  }
};

/**
 * Send return event notification.
 */
const sendReturnEvent = async (
  userId: number,
  bookTitle: string,
  referenceId?: string
): Promise<void> => {
  // 1. Notify student
  await createInAppNotification({
    user_id: userId,
    notification_title: 'Pengembalian Buku',
    notification_message: `Buku "${bookTitle}" berhasil dikembalikan. Terima kasih.`,
    notification_type: NotificationType.RETURN_CONFIRMED,
    reference_id: referenceId,
  });
};

/**
 * Processes daily due reminders and late warnings for active borrowings.
 */
const runDailyBorrowingReminders = async (): Promise<void> => {
  logger.info('Starting daily borrowing reminders processing...');
  try {
    const today = new Date();

    // Find all active borrowings (borrowed or overdue)
    const activeBorrowings = await Borrowing.findAll({
      where: {
        borrowing_status: {
          [Op.in]: [BorrowingStatus.BORROWED, BorrowingStatus.OVERDUE]
        }
      },
      include: [
        {
          model: Book,
          as: 'book'
        },
        {
          model: User,
          as: 'borrower'
        }
      ]
    });

    logger.info(`Found ${activeBorrowings.length} active borrowings to check for reminders.`);

    let notificationsCount = 0;

    for (const borrowing of activeBorrowings) {
      if (!borrowing.due_date) continue;

      const bookTitle = borrowing.book?.book_title || 'Buku';
      const borrowerId = borrowing.user_id;
      const dueDateObj = new Date(borrowing.due_date);

      const getStartOfDay = (date: Date): Date => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
      };

      const d1 = getStartOfDay(today);
      const d2 = getStartOfDay(dueDateObj);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      const formattedDate = dueDateObj.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (diffDays === 2) {
        await createInAppNotification({
          user_id: borrowerId,
          notification_title: 'Pengingat Pengembalian Buku',
          notification_message: `Buku "${bookTitle}" harus dikembalikan dalam 2 hari (pada ${formattedDate}).`,
          notification_type: NotificationType.OVERDUE_WARNING,
        });
        notificationsCount++;
      } else if (diffDays === 1) {
        await createInAppNotification({
          user_id: borrowerId,
          notification_title: 'Pengingat Pengembalian Buku',
          notification_message: `Buku "${bookTitle}" harus dikembalikan besok (pada ${formattedDate}).`,
          notification_type: NotificationType.OVERDUE_WARNING,
        });
        notificationsCount++;
      } else if (diffDays === 0) {
        await createInAppNotification({
          user_id: borrowerId,
          notification_title: 'Batas Waktu Pengembalian',
          notification_message: `Hari ini adalah batas waktu pengembalian buku "${bookTitle}".`,
          notification_type: NotificationType.OVERDUE_WARNING,
        });
        notificationsCount++;
      } else if (diffDays < 0) {
        const daysLate = Math.abs(diffDays);
        await createInAppNotification({
          user_id: borrowerId,
          notification_title: 'Buku Terlambat Dikembalikan',
          notification_message: `Buku "${bookTitle}" terlambat dikembalikan ${daysLate} hari.`,
          notification_type: NotificationType.OVERDUE_WARNING,
        });
        // Also update status to OVERDUE in database if it was BORROWED
        if (borrowing.borrowing_status === BorrowingStatus.BORROWED) {
          await borrowing.update({ borrowing_status: BorrowingStatus.OVERDUE });
        }
        notificationsCount++;
      }
    }

    logger.info(`Daily borrowing reminders processing completed. Created ${notificationsCount} notifications.`);
  } catch (error: any) {
    logger.error('Failed to process daily borrowing reminders:', { error: error.message });
  }
};

export {
  createInAppNotification,
  sendEmailNotification,
  sendDueReminder,
  sendLateWarning,
  sendBorrowingEvent,
  sendReturnEvent,
  runDailyBorrowingReminders,
  NotificationPayload,
};
