const builder = require("electron-builder");
const Platform = builder.Platform;
const path = require('path');
const os = require('os');

const rootPath = path.join('./');
const outPath = path.join(rootPath, 'builds');

if (os.platform() === 'win32') {
	builder.build({
		targets: Platform.WINDOWS.createTarget(),
		prepackaged: path.join(outPath, 'Star Trek Timelines Crew Management-win32-x64'),
		config: {
			win: {
				target: ['nsis', '7z'],
				icon: path.join(rootPath, 'src/assets/icons/ATFleet.ico')
			},
			directories: {
				output: 'installer'
			}
		}
	}).catch((error) => {
		console.error(error);
	});
}
else {
	builder.build({
		targets: Platform.MAC.createTarget(),
		prepackaged: path.join(outPath, 'Star Trek Timelines Crew Management-darwin-x64/Star Trek Timelines Crew Management.app'),
		config: {
			mac: {
				identity: null,
				icon: path.join(rootPath, 'src/assets/icons/ATFleet.icns')
			},
			directories: {
				output: 'installer'
			}
		}
	}).catch((error) => {
		console.error(error);
	});
}