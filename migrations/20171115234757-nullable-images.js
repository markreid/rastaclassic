module.exports = {
  up: (queryInterface, Sequelize) => Promise.resolve()
    .then(() =>
      queryInterface.changeColumn('Reports', 'image', {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      }))
    .then(() =>
      queryInterface.changeColumn('Reports', 'postImages', {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
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
  down: (queryInterface, Sequelize) => Promise.resolve()
    .then(() =>
      queryInterface.changeColumn('Reports', 'image', {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      }))
    .then(() =>
      queryInterface.changeColumn('Reports', 'postImages', {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
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
