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
      })),
};
