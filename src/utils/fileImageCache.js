const fs = require('fs');

import { getAppPath } from './pal';

export class FileImageCache {
	basePath;
	allImages;

	constructor() {
		this.basePath = getAppPath('userData') + '/imagecache/';

		if (!fs.existsSync(this.basePath)) {
			fs.mkdirSync(this.basePath);
		}

		this.allImages = fs.readdirSync(this.basePath);

		// Filter to images
		this.allImages = this.allImages.filter(item => item.endsWith('.png'));

		// Remove the .png extension
		this.allImages = new Set(this.allImages.map(item => this.basePath + item));
	}

	getCached(url) {
		if (this.allImages.has(this.formatUrl(url))) {
			return 'file://' + this.formatUrl(url);
		} else {
			return '';
		}
	}

	formatUrl(url) {
		return this.basePath + url.substr(1).replace(new RegExp('/', 'g'), '_') + '.png';
	}

	getImage(url) {
		return new Promise((resolve, reject) => {
			fs.exists(this.formatUrl(url), (exists) => {
				if (exists) {
					resolve('file://' + this.formatUrl(url));
				}
				else {
					resolve(undefined);
				}
			});
		});
	}

	bitmapToPng(data, callback) {
		var canvas = document.createElement('canvas');
		canvas.height = data.height;
		canvas.width = data.width;

		var ctx = canvas.getContext('2d');
		var myImageData = new ImageData(new Uint8ClampedArray(data.data), data.width, data.height);
		ctx.putImageData(myImageData, 0, 0);

		canvas.toBlob((blob) => {
			let fileReader = new FileReader();
			fileReader.onload = function (progressEvent) {
				callback(new Uint8Array(progressEvent.target.result));
			};
			fileReader.readAsArrayBuffer(blob);
		});
	}

	saveImage(url, data) {
		return new Promise((resolve, reject) => {
			if (data.data.length > 0) {
				this.bitmapToPng(data, (pngData) => {
					fs.writeFile(this.formatUrl(url), pngData, (err) => {
						resolve('file://' + this.formatUrl(url));
					});
				});
			}
			else {
				reject('Invalid data');
			}
		});
	}
}
