import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { BarcodeStatus } from '../config/constants';

interface BookBarcodeAttributes {
  barcode_id: number;
  book_id: number;
  barcode_value: string;
  barcode_status: BarcodeStatus;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

interface BookBarcodeCreationAttributes extends Optional<BookBarcodeAttributes,
  'barcode_id' | 'barcode_status' | 'deleted_at'
> {}

class BookBarcode extends Model<BookBarcodeAttributes, BookBarcodeCreationAttributes> implements BookBarcodeAttributes {
  public barcode_id!: number;
  public book_id!: number;
  public barcode_value!: string;
  public barcode_status!: BarcodeStatus;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public deleted_at!: Date | null;

  public static associate(models: any): void {
    BookBarcode.belongsTo(models.Book, {
      foreignKey: 'book_id',
      as: 'book',
    });
  }
}

BookBarcode.init(
  {
    barcode_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      field: 'barcode_id',
    },
    book_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'books',
        key: 'book_id',
      },
    },
    barcode_value: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    barcode_status: {
      type: DataTypes.ENUM(...Object.values(BarcodeStatus)),
      allowNull: false,
      defaultValue: BarcodeStatus.ACTIVE,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'book_barcodes',
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      { fields: ['book_id'] },
      { fields: ['barcode_value'] },
      { fields: ['barcode_status'] },
    ],
  }
);

export default BookBarcode;
export { BookBarcodeAttributes, BookBarcodeCreationAttributes };
