import STTApi from 'sttapi';
import { CONFIG } from 'sttapi';

import { getAppVersion, download, openShellExternal } from '../utils/pal';

async function pastebinPost(data, exportType) {
	let result = await STTApi.networkHelper.post('https://ptpb.pw/', { 'c': data }, undefined, false);
	let match = /url: (.*)/g.exec(result);
	return match[1] + '.' + exportType;
}

export function shareCrew(options) {
	if (options.shareMissions) {
		var allChallenges = [];

		STTApi.missions.forEach(function (mission) {
			mission.quests.forEach(function (quest) {
				if (quest.quest_type == 'ConflictQuest') {
					quest.challenges.forEach(function (challenge) {
						var entry = {
							missionname: mission.episode_title,
							questname: quest.name,
							challengename: challenge.name,
							roll: 0,
							goal_progress: quest.mastery_levels[0].progress.goal_progress + quest.mastery_levels[1].progress.goal_progress + quest.mastery_levels[2].progress.goal_progress,
							skill: challenge.skill,
							cadet: quest.cadet,
							crew_requirement: quest.crew_requirement ? quest.crew_requirement.description.replace(/<#([0-9A-F]{6})>/gi, '<span style="color:#$1">').replace(/<\/color>/g, '</span>') : '',
							traits: [],
							traitBonus: 0,
							lockedTraits: []
						};

						if (challenge.difficulty_by_mastery) {
							entry.roll += challenge.difficulty_by_mastery[2];
						}

						if (challenge.critical && challenge.critical.threshold) {
							entry.roll += challenge.critical.threshold;
						}

						if (challenge.trait_bonuses && (challenge.trait_bonuses.length > 0)) {
							challenge.trait_bonuses.forEach(function (traitBonus) {
								entry.traits.push(traitBonus.trait);
								entry.traitBonus = traitBonus.bonuses[2];
							});
						}

						entry.traits = entry.traits.map(function (trait) {
							return STTApi.getTraitName(trait);
						}).join(', ');

						if (challenge.locks && (challenge.locks.length > 0)) {
							challenge.locks.forEach(function (lock) {
								if (lock.trait) {
									entry.lockedTraits.push(lock.trait);
								}
							});
						}

						entry.lockedTraits = entry.lockedTraits.map(function (trait) {
							return STTApi.getTraitName(trait);
						}).join(', ');

						allChallenges.push(entry);
					});
				}
			});
		});

		shareCrewInternal(options, allChallenges);
	}
	else {
		shareCrewInternal(options, null);
	}
}

function sillyTemplatizer(html, options) {
	var re = /<%(.+?)%>/g,
		reExp = /(^( )?(var|if|for|else|switch|case|break|{|}|;))(.*)?/g,
		code = 'with(obj) { var r=[];\n',
		cursor = 0,
		result,
		match;
	var add = function (line, js) {
		js ? (code += line.match(reExp) ? line + '\n' : 'r.push(' + line + ');\n') :
			(code += line != '' ? 'r.push("' + line.replace(/"/g, '\\"') + '");\n' : '');
		return add;
	}
	while (match = re.exec(html)) {
		add(html.slice(cursor, match.index))(match[1], true);
		cursor = match.index + match[0].length;
	}
	add(html.substr(cursor, html.length - cursor));
	code = (code + 'return r.join(""); }').replace(/[\r\t\n]/g, ' ');
	try { result = new Function('obj', code).apply(options, [options]); }
	catch (err) { console.error("'" + err.message + "'", " in \n\nCode:\n", code, "\n"); }
	return result;
}

function imageToDataUri(imgUrl, newEntry, resolve, wantedWidth, wantedHeight) {
// #!if ENV === 'electron'
	// We create an image to receive the Data URI
	let img = document.createElement('img');

	// When the event "onload" is triggered we can resize the image.
	img.onload = () => {
		// We create a canvas and get its context.
		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');

		// We set the dimensions at the wanted size.
		canvas.width = wantedWidth;
		canvas.height = wantedHeight;

		// We resize the image with the canvas method drawImage();
		ctx.drawImage(img, 0, 0, wantedWidth, wantedHeight);

		newEntry.iconUrl = canvas.toDataURL();
		resolve();
	};

	// We put the Data URI in the image's src attribute
	img.src = imgUrl;
// #!else
	newEntry.iconUrl = imgUrl;
	resolve();
// #!endif
}

async function shareCrewInternal(options, missionList) {
	let data = '';

	if (options.exportType == 'html') {
		var templateString = require('./exportTemplate.ttml');
		let exportedRoster = [];
		let iconPromises = [];
		STTApi.roster.forEach(rosterEntry => {
			if (rosterEntry.buyback && !options.exportBuyback) {
				// Skip buy-back crew
				return;
			}

			var newEntry = {};
			newEntry.name = rosterEntry.name;
			newEntry.level = rosterEntry.level;
			newEntry.rarity = rosterEntry.rarity;
			newEntry.max_rarity = rosterEntry.max_rarity;
			newEntry.frozen = rosterEntry.frozen;
			newEntry.traits = rosterEntry.traits;

			Object.keys(CONFIG.SKILLS).forEach(skill => {
				newEntry[skill] = rosterEntry[skill];
				newEntry[skill + "_core"] = rosterEntry[skill + "_core"];
			});

			iconPromises.push(new Promise(resolve => {
				imageToDataUri(rosterEntry.iconUrl, newEntry, resolve, 48, 48);
			}));

			exportedRoster.push(newEntry);
		});

		await Promise.all(iconPromises);
		iconPromises = [];
		let skillRes = {};
		Object.keys(CONFIG.SKILLS).forEach(skill => {
			skillRes[skill] = {};
			skillRes[skill].name = CONFIG.SKILLS[skill];
			iconPromises.push(new Promise(resolve => {
				imageToDataUri(CONFIG.SPRITES['icon_' + skill].url, skillRes[skill], resolve, 18, 18);
			}));
		});

		await Promise.all(iconPromises);

		data = sillyTemplatizer(templateString,
			{
				options: options,
				roster: exportedRoster,
				missionList: missionList,
				skillRes: skillRes,
				template: options.htmlColorTheme,
				version: getAppVersion()
			});
	}
	else if (options.exportType == 'json') {
		data = JSON.stringify({
			title: options.title,
			description: options.description,
			created: {
				tool: 'Star Trek Timelines Spreadsheet Tool v' + getAppVersion(),
				url: 'https://iampicard.github.io/',
				when: (new Date())
			},
			crew: STTApi.roster,
			missions: missionList
		});
	}

	if (options.exportWhere == 'L') {
		download('export.' + options.exportType, data, 'Export your crew list for sharing', 'Export');
	}
	else {
		openShellExternal(await pastebinPost(data, options.exportType));
	}
}