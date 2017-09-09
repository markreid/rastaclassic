module.exports = {
    "extends": "airbnb-base",
    "env": {
      "node": true,
    },
    rules: {
      "import/no-extraneous-dependencies": [2, { devDependencies: true }]
    }
};
