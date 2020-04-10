/*
 SPDX-License-Identifier: Apache-2.0
*/
const path = require('path');

export default {
  entry: 'src/index.js',
  extraBabelPlugins: [
    ['import', { libraryName: 'antd', libraryDirectory: 'es', style: true }],
  ],
  env: {
    development: {
      extraBabelPlugins: ['dva-hmr'],
    },
  },
  alias: {
    components: path.resolve(__dirname, 'src/components/'),
  },
  ignoreMomentLocale: true,
  theme: './src/theme.js',
  outputPath: '../dist/',
  publicPath: 'static/dist/',
  hash: false,
  es5ImcompatibleVersions: true,
};
