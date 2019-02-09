const webpack = require('webpack');
const path = require('path');
const merge = require('webpack-merge');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const WebpackCdnPlugin = require('webpack-cdn-plugin');
const baseConfig = require('./webpack.base.config.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WebappWebpackPlugin = require('webapp-webpack-plugin');
const PACKAGE = require('../package.json');

// Config directories
const SRC_DIR = path.resolve(__dirname, '../src');
const OUTPUT_DIR = path.resolve(__dirname, '../dist');

// Any directories you will be adding code/files into, need to be added to this array so webpack will pick them up
const defaultInclude = [SRC_DIR];

// TODO: Figure out how to serve voymod.wasm

module.exports = merge(baseConfig, {
	output: {
		publicPath: ''
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [
					MiniCssExtractPlugin.loader,
					"css-loader"
				]
			},
			{
				test: /\.(jpe?g|png|gif)$/,
				use: [{ loader: 'file-loader?name=img/[name]__[hash:base64:5].[ext]' }],
				include: defaultInclude
			},
			{
				test: /\.(eot|svg|ttf|woff|woff2)$/,
				use: [{ loader: 'file-loader?name=font/[name]__[hash:base64:5].[ext]' }],
				include: defaultInclude
			},
			{
				test: /\.jsx?$/,
				use: [{ loader: 'babel-loader' }, { loader: 'webpack-preprocessor-loader', options: { params: { ENV: 'webtest' } } }],
				include: defaultInclude
			},
			{
				test: /\.tsx?$/,
				use: [{ loader: 'babel-loader' }, { loader: 'ts-loader' }, { loader: 'webpack-preprocessor-loader', options: { params: { ENV: 'webtest' } } }],
				include: defaultInclude
			}
		]
	},
	target: 'web',
	plugins: [
		new WebappWebpackPlugin({
			logo: SRC_DIR + '/assets/logo.png',
			prefix: 'img/',
			emitStats: false,
			persistentCache: true,
			inject: true,
			background: '#393737',
			title: 'Star Trek Timelines Crew Management',
			icons: {
				android: true,
				appleIcon: true,
				appleStartup: true,
				coast: false,
				favicons: true,
				firefox: true,
				opengraph: false,
				twitter: false,
				yandex: false,
				windows: true
			}
		}),
		new HtmlWebpackPlugin({
			template: './webpack/template.html',
			title: `Star Trek Timelines Crew Management v${PACKAGE.version}-web BETA build ${new Date().toISOString()}`
		}),
		new MiniCssExtractPlugin({
			// Options similar to the same options in webpackOptions.output
			// both options are optional
			filename: "[name].css",
			chunkFilename: "[id].css"
		}),
		new webpack.DefinePlugin({ 'process.env.NODE_ENV': JSON.stringify('production') }),
		new WebpackCdnPlugin({
			modules: [
				{ name: 'xlsx-populate', var: 'XlsxPopulate', path: 'browser/xlsx-populate.js' },
				{ name: 'react', var: 'React', path: `umd/react.production.min.js` },
				{ name: 'react-dom', var: 'ReactDOM', path: `umd/react-dom.production.min.js` }
			],
			publicPath: '/node_modules'
		})
	],
	node: {
		fs: "empty"
	},
	devtool: 'inline-source-map',
	devServer: {
		contentBase: OUTPUT_DIR,
		stats: {
			colors: true,
			chunks: false,
			children: false
		}
	}
});
