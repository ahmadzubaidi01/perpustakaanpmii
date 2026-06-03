import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { BorrowingStatus } from '../config/constants';

interface BorrowingAttributes {
  borrowing_id: number;
  borrowing_code: string;
  user_id: number;
  book_id: number;
  borrowed_at: Date | null;
  due_date: Date | null;
  returned_at: Date | null;
  borrowing_status: BorrowingStatus;
  approved_by_user_id: number | null;
  notes: string | null;
  created_at?: Date;
  updated_at?: Date;
}

interface BorrowingCreationAttributes extends Optional<BorrowingAttributes,
  'borrowing_id' | 'borrowed_at' | 'due_date' | 'returned_at' |
  'borrowing_status' | 'approved_by_user_id' | 'notes'
> {}

class Borrowing extends Model<BorrowingAttributes, BorrowingCreationAttributes> implements BorrowingAttributes {
  public borrowing_id!: number;
  public borrowing_code!: string;
  public user_id!: number;
  public book_id!: number;
  public borrowed_at!: Date | null;
  public due_date!: Date | null;
  public returned_at!: Date | null;
  public borrowing_status!: BorrowingStatus;
  public approved_by_user_id!: number | null;
  public notes!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public borrower?: any;
  public book?: any;
  public approved_by?: any;

  public static associate(models: any): void {
    Borrowing.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'borrower',
    });
    Borrowing.belongsTo(models.Book, {
      foreignKey: 'book_id',
      as: 'book',
    });
    Borrowing.belongsTo(models.User, {
      foreignKey: 'approved_by_user_id',
      as: 'approved_by',
    });
  }
}

Borrowing.init(
  {
    borrowing_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      field: 'borrowing_id',
    },
    borrowing_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    book_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'books',
        key: 'book_id',
      },
    },
    borrowed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    returned_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    borrowing_status: {
      type: DataTypes.ENUM(...Object.values(BorrowingStatus)),
      allowNull: false,
      defaultValue: BorrowingStatus.PENDING,
    },
    approved_by_user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'borrowings',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['borrowing_code'] },
      { fields: ['user_id'] },
      { fields: ['book_id'] },
      { fields: ['borrowing_status'] },
      { fields: ['approved_by_user_id'] },
      { fields: ['created_at'] },
      { fields: ['book_id', 'borrowing_status'], name: 'idx_book_borrowing_status' },
      { fields: ['user_id', 'borrowing_status'], name: 'idx_user_borrowing_status' },
    ],
  }
);

export default Borrowing;
export { BorrowingAttributes, BorrowingCreationAttributes };
