/**
 * Report model:
 * A surf report.
 */

module.exports = (sequelize, DataTypes) => sequelize.define('Report', {
  id: {
    type: DataTypes.INTEGER,
    unique: true,
    primaryKey: true,
    autoIncrement: true,
  },
  postGuid: {
    type: DataTypes.INTEGER,
    unique: true,
    allowNull: false,
  },
  postTimestamp: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  postContent: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  postTitle: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  postImages: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  text: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '',
  },
  image: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '',
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '',
  },
  swell: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '',
  },
  wind: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '',
  },
  weather: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '',
  },
  ht: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '',
  },
  lt: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '',
  },
});
