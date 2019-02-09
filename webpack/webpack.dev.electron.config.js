const webpack = require('webpack');
const path = require('path');
const merge = require('webpack-merge');
const { spawn } = require('child_process');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const baseConfig = require('./webpack.base.config.js');
const PACKAGE = require('../package.json');

// Config directories
const SRC_DIR = path.resolve(__dirname, '../src');
const OUTPUT_DIR = path.resolve(__dirname, '../dist');

// Any directories you will be adding code/files into, need to be added to this array so webpack will pick them up
const defaultInclude = [SRC_DIR];

module.exports = merge(baseConfig, {
	output: {
		publicPath: ''
	},
	target: 'electron-renderer',
	plugins: [
		new HtmlWebpackPlugin({ template: './webpack/template.html', title: 'Star Trek Timelines Crew Management v' + PACKAGE.version }),
		new webpack.DefinePlugin({ 'process.env.NODE_ENV': JSON.stringify('development')})
	],
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [{ loader: 'style-loader' }, { loader: 'css-loader' }]
			},
			{
				test: /\.(png|jpg|gif)$/,
				use: [
					{
						loader: 'url-loader',
						options: {
							limit: 8192
						}
					}
				],
				include: defaultInclude
			},
			{
				test: /\.(eot|svg|ttf|woff|woff2)$/,
				use: [{ loader: 'file-loader?name=font/[name]__[hash:base64:5].[ext]' }],
				include: defaultInclude
			}
		]
	},
	devtool: 'inline-source-map',
	devServer: {
		contentBase: OUTPUT_DIR,
		stats: {
			colors: true,
			chunks: false,
			children: false
		},
		before() {
			spawn(
				'electron',
				['.', '--remote-debugging-port=9222'],
				{ shell: true, env: process.env, stdio: 'inherit' }
			)
				.on('close', code => process.exit(0))
				.on('error', spawnError => console.error(spawnError));
		}
	}
});
