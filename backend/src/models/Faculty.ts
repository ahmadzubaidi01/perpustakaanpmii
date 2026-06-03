import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

interface FacultyAttributes {
  faculty_id: number;
  faculty_name: string;
  faculty_code: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

interface FacultyCreationAttributes extends Optional<FacultyAttributes, 'faculty_id' | 'deleted_at'> {}

class Faculty extends Model<FacultyAttributes, FacultyCreationAttributes> implements FacultyAttributes {
  public faculty_id!: number;
  public faculty_name!: string;
  public faculty_code!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public deleted_at!: Date | null;

  public static associate(models: any): void {
    Faculty.hasMany(models.StudyProgram, {
      foreignKey: 'faculty_id',
      as: 'study_programs',
    });
    Faculty.hasMany(models.User, {
      foreignKey: 'faculty_id',
      as: 'users',
    });
  }
}

Faculty.init(
  {
    faculty_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      field: 'faculty_id',
    },
    faculty_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    faculty_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
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
    tableName: 'faculties',
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      { unique: true, fields: ['faculty_code'] },
    ],
    defaultScope: {
      where: { deleted_at: null },
    },
    scopes: {
      withDeleted: { where: {} },
    },
  }
);

export default Faculty;
export { FacultyAttributes, FacultyCreationAttributes };
