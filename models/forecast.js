/**
 * Forecast model:
 * A forecast from the Magic Seaweed API.
 */

module.exports = (sequelize, DataTypes) => sequelize.define('Forecast', {
  id: {
    type: DataTypes.INTEGER,
    unique: true,
    primaryKey: true,
    autoIncrement: true,
  },
  spotId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  json: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
});
