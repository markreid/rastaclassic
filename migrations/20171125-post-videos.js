module.exports = {
  up: (queryInterface, Sequelize) => Promise.resolve()
    .then(() =>
      queryInterface.addColumn('Reports', 'postVideos', {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      }))
    .then(() => queryInterface.removeColumn('Reports', 'swell'))
    .then(() => queryInterface.removeColumn('Reports', 'wind'))
    .then(() => queryInterface.removeColumn('Reports', 'weather'))
    .then(() => queryInterface.removeColumn('Reports', 'ht'))
    .then(() => queryInterface.removeColumn('Reports', 'lt'))
    // sqlite3 migrations drop constraints, see:
    // https://github.com/sequelize/sequelize/issues/5007
    .then(() =>
      queryInterface.changeColumn('Reports', 'id', {
        type: Sequelize.DataTypes.INTEGER,
        unique: true,
        primaryKey: true,
        autoIncrement: true,
      }))
    .then(() =>
      queryInterface.addConstraint('Reports', ['postGuid'], {
        type: 'unique',
      }))
    .then(() =>
      queryInterface.addConstraint('Reports', ['id'], {
        type: 'unique',
      })),
  down: (queryInterface, Sequelize) => Promise.resolve()
    .then(() => queryInterface.removeColumn('Reports', 'postVideos'))
    .then(() => queryInterface.addColumn('Reports', 'swell', {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    }))
    .then(() => queryInterface.addColumn('Reports', 'wind', {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    }))
    .then(() => queryInterface.addColumn('Reports', 'weather', {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    }))
    .then(() => queryInterface.addColumn('Reports', 'ht', {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    }))
    .then(() => queryInterface.addColumn('Reports', 'lt', {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    }))
    // sqlite3 migrations drop constraints, see:
    // https://github.com/sequelize/sequelize/issues/5007
    .then(() =>
      queryInterface.changeColumn('Reports', 'id', {
        type: Sequelize.DataTypes.INTEGER,
        unique: true,
        primaryKey: true,
        autoIncrement: true,
      }))
    .then(() =>
      queryInterface.addConstraint('Reports', ['postGuid'], {
        type: 'unique',
      }))
    .then(() =>
      queryInterface.addConstraint('Reports', ['id'], {
        type: 'unique',
      })),
};
