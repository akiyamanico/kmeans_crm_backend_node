const path = require('path');
module.exports = {
  mode: 'production',
  entry: './index.js',
  target: 'node',
  resolve: {
    extensions: ['.js', '.json', '.node'],
    alias: {
      'npm': false, // Ignore npm module
      'child_process': false, // Ignore child_process module
      'fs': false, // Ignore fs module
      'path': false, // Ignore path module
    },
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /\.node$/,
        use: 'node-loader'
      },
      {
        test: /\.cs$/, // Ignore .cs files
        use: 'ignore-loader'
      },
      {
        test: /\.html$/,
        use: {
          loader: 'html-loader',
        },
      },
    ],
  },
};