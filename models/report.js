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
    allowNull: true,
  },
  postVideos: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  text: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '',
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '',
  },
});
