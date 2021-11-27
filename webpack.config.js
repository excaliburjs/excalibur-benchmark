const webpack = require('webpack');
const path = require('path');

module.exports = (version) => ({
  mode: 'development',
  devtool: 'source-map',
  entry: './main.ts',
  target: ['web', 'es2020'],
  output: {
    path: path.resolve(__dirname, 'build/dist'),
    filename: 'excalibur-benchmark.js',
    library: 'ex',
    libraryTarget: 'umd',
    publicPath: '/'
  },
  devServer: {
    contentBase: './',
    hot: true
  },
  resolve: {
    // Add `.ts` and `.tsx` as a resolvable extension.
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      {
        test: /\.tsx?$/,
        loader: 'ts-loader'
      },
      {
        test: /\.(png|jpg|gif|mp3)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ]
});
