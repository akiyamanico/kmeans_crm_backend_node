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
    fallback: {
      "assert": require.resolve("assert/"),
      "async_hooks": false,
      "child_process": false,
      "constants": require.resolve("constants-browserify"),
      "crypto": require.resolve("crypto-browserify"),
      "dgram": false,
      "dns": false,
      "domain": require.resolve("domain-browser"),
      "fs": false,
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "net": false,
      "os": require.resolve("os-browserify/browser"),
      "path": require.resolve("path-browserify"),
      "process": require.resolve("process/browser"),
      "stream": require.resolve("stream-browserify"),
      "timers": require.resolve("timers-browserify"),
      "tls": false,
      "tty": require.resolve("tty-browserify"),
      "zlib": require.resolve("browserify-zlib")
    },
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