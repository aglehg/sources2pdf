/** @type {import('vitest/config').UserConfig} */
module.exports = {
  test: {
    include: ['tests/metadata/**/*.test.js'],
    environment: 'node',
    globals: true
  }
};
