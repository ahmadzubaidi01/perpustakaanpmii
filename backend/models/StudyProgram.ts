import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

interface StudyProgramAttributes {
  program_id: number;
  faculty_id: number;
  program_name: string;
  program_code: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

interface StudyProgramCreationAttributes extends Optional<StudyProgramAttributes, 'program_id' | 'deleted_at'> {}

class StudyProgram extends Model<StudyProgramAttributes, StudyProgramCreationAttributes> implements StudyProgramAttributes {
  public program_id!: number;
  public faculty_id!: number;
  public program_name!: string;
  public program_code!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public deleted_at!: Date | null;

  public static associate(models: any): void {
    StudyProgram.belongsTo(models.Faculty, {
      foreignKey: 'faculty_id',
      as: 'faculty',
    });
    StudyProgram.hasMany(models.User, {
      foreignKey: 'program_id',
      as: 'users',
    });
  }
}

StudyProgram.init(
  {
    program_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      field: 'program_id',
    },
    faculty_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'faculties',
        key: 'faculty_id',
      },
    },
    program_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    program_code: {
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
    tableName: 'study_programs',
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      { unique: true, fields: ['program_code'] },
      { fields: ['faculty_id'] },
    ],
    defaultScope: {
      where: { deleted_at: null },
    },
    scopes: {
      withDeleted: { where: {} },
    },
  }
);

export default StudyProgram;
export { StudyProgramAttributes, StudyProgramCreationAttributes };
