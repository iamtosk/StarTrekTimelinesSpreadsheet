const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');

const PACKAGE = require('../package.json');

// Config directories
const SRC_DIR = path.resolve(__dirname, '../src');
const OUTPUT_DIR = path.resolve(__dirname, '../dist');

// Any directories you will be adding code/files into, need to be added to this array so webpack will pick them up
const defaultInclude = [SRC_DIR];

module.exports = {
	entry: SRC_DIR + '/index.js',
	output: {
		path: OUTPUT_DIR,
		filename: 'bundle.js',
		globalObject: 'this'
	},
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				use: [{ loader: 'babel-loader' }, { loader: 'webpack-preprocessor-loader', options: { params: { ENV: 'electron' } } }],
				include: defaultInclude
			},
			{
				test: /\.tsx?$/,
				use: [{ loader: 'babel-loader' }, { loader: 'ts-loader' }, { loader: 'webpack-preprocessor-loader', options: { params: { ENV: 'electron' } } }],
				include: defaultInclude
			}
		]
	},
	plugins: [
		new webpack.DefinePlugin({ 'process.env.APP_VERSION': JSON.stringify(PACKAGE.version) }),
		new CopyWebpackPlugin([
			{ from: 'src/assets/semantic', to: 'css' }
		])
	]
};