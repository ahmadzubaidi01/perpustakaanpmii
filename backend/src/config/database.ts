import { Sequelize } from 'sequelize';
import pg from 'pg';
import env from './environment';
import logger from '../utils/logger';

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'postgres',
  dialectModule: pg,
  timezone: '+00:00', // UTC timezone storage
  logging: env.DB_LOGGING
    ? (msg: string) => logger.debug(msg)
    : false,
  pool: {
    min: env.DB_POOL_MIN,
    max: env.DB_POOL_MAX,
    acquire: env.DB_POOL_ACQUIRE,
    idle: env.DB_POOL_IDLE,
  },
  define: {
    timestamps: true,
    underscored: true,
    paranoid: false, // We handle soft deletes manually per model
  },
  dialectOptions: env.DB_HOST.includes('supabase.co')
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
});

export default sequelize;
