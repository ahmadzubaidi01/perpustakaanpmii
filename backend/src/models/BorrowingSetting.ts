import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

interface BorrowingSettingAttributes {
  setting_id: number;
  max_borrow_days: number;
  default_borrow_days: number;
  max_books_per_borrower: number;
  created_at?: Date;
  updated_at?: Date;
}

interface BorrowingSettingCreationAttributes extends Optional<BorrowingSettingAttributes,
  'setting_id' | 'max_borrow_days' | 'default_borrow_days' | 'max_books_per_borrower'
> {}

class BorrowingSetting extends Model<BorrowingSettingAttributes, BorrowingSettingCreationAttributes> implements BorrowingSettingAttributes {
  public setting_id!: number;
  public max_borrow_days!: number;
  public default_borrow_days!: number;
  public max_books_per_borrower!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

BorrowingSetting.init(
  {
    setting_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      field: 'setting_id',
    },
    max_borrow_days: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 30,
      validate: { min: 1 },
    },
    default_borrow_days: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 14,
      validate: { min: 1 },
    },
    max_books_per_borrower: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 3,
      validate: { min: 1 },
    },
  },
  {
    sequelize,
    tableName: 'borrowing_settings',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default BorrowingSetting;
export { BorrowingSettingAttributes, BorrowingSettingCreationAttributes };
