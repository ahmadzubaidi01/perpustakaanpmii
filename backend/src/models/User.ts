import { Model, DataTypes, Optional, Op } from 'sequelize';
import sequelize from '../config/database';
import { UserRole, AccountStatus } from '../config/constants';

interface UserAttributes {
  user_id: number;
  nim: string | null;
  full_name: string;
  email_address: string;
  password_hash: string;
  phone_number: string | null;
  profile_photo_url: string | null;
  user_role: UserRole;
  account_status: AccountStatus;
  last_login_at: Date | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
  faculty_id: number | null;
  program_id: number | null;
}

interface UserCreationAttributes extends Optional<UserAttributes,
  'user_id' | 'nim' | 'phone_number' | 'profile_photo_url' |
  'account_status' | 'last_login_at' |
  'deleted_at' | 'faculty_id' | 'program_id'
> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public user_id!: number;
  public nim!: string | null;
  public full_name!: string;
  public email_address!: string;
  public password_hash!: string;
  public phone_number!: string | null;
  public profile_photo_url!: string | null;
  public user_role!: UserRole;
  public account_status!: AccountStatus;
  public last_login_at!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public deleted_at!: Date | null;
  public faculty_id!: number | null;
  public program_id!: number | null;

  public static associate(models: any): void {
    User.belongsTo(models.Faculty, {
      foreignKey: 'faculty_id',
      as: 'faculty',
    });
    User.belongsTo(models.StudyProgram, {
      foreignKey: 'program_id',
      as: 'study_program',
    });
    User.hasMany(models.Borrowing, {
      foreignKey: 'user_id',
      as: 'borrowings',
    });
    User.hasMany(models.Borrowing, {
      foreignKey: 'approved_by_user_id',
      as: 'approved_borrowings',
    });
    User.hasMany(models.Notification, {
      foreignKey: 'user_id',
      as: 'notifications',
    });
    User.hasMany(models.RefreshToken, {
      foreignKey: 'user_id',
      as: 'refresh_tokens',
    });
    User.hasMany(models.UserSession, {
      foreignKey: 'user_id',
      as: 'sessions',
    });
    User.hasMany(models.AuditLog, {
      foreignKey: 'performed_by_user_id',
      as: 'audit_logs',
    });
  }

  /**
   * Exclude password_hash from JSON serialization by default.
   */
  public toJSON(): object {
    const values = { ...this.get() } as any;
    delete values.password_hash;
    return values;
  }
}

User.init(
  {
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      field: 'user_id',
    },
    nim: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
    },
    full_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    email_address: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    profile_photo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    user_role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
    },
    account_status: {
      type: DataTypes.ENUM(...Object.values(AccountStatus)),
      allowNull: false,
      defaultValue: AccountStatus.ACTIVE,
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    faculty_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'faculties',
        key: 'faculty_id',
      },
    },
    program_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'study_programs',
        key: 'program_id',
      },
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      { unique: true, fields: ['email_address'] },
      { unique: true, fields: ['nim'], where: { nim: { [Op.ne]: null } } },
      { fields: ['faculty_id'] },
      { fields: ['program_id'] },
      { fields: ['user_role'] },
      { fields: ['account_status'] },
    ],
    defaultScope: {
      where: { deleted_at: null },
      attributes: { exclude: ['password_hash'] },
    },
    scopes: {
      withPassword: {
        attributes: { include: ['password_hash'] },
      },
      withDeleted: {
        where: {},
      },
    },
  }
);

export default User;
export { UserAttributes, UserCreationAttributes };
