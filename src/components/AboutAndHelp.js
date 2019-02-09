import React from 'react';

import { getAppVersion, openShellExternal } from '../utils/pal';

import snarkdown from 'snarkdown';

import STTApi from 'sttapi';

export class AboutAndHelp extends React.Component {
	constructor(props) {
		super(props);

		// STTApi.getGithubReleases().then((data) => {
		// 	this.setState({ version: data[0] });
		// });

		this.state = {
			version: undefined
		};
	}

	render() {
		return <div>
			<h1>Star Trek Timelines Spreadsheet Tool v{getAppVersion()}</h1>
			{/* #!if ENV === 'electron' */}
			<p>A tool to help with crew management in Star Trek Timelines</p>
			{this.state.version &&
				<div>
					<h3>Latest version: {this.state.version.tag_name} {this.state.version.name}</h3>
					<p dangerouslySetInnerHTML={{__html: snarkdown(this.state.version.body)}} />
					<div className="ui primary button" onClick={() => openShellExternal(this.state.version.html_url)}>Download now</div>
				</div>}
			{/* #!elseif ENV === 'web' || ENV === 'webtest' */}
			<p style={{ backgroundColor: 'Tomato' }}><b>NOTE:</b> This web version is a very early prerelease for testing purposes only! I'm looking at overall feasibility as well as costs.</p>
			{/* #!else */}
			{/* #!endif */}

			<p><b>NOTE</b> This tool does not (and will never) automate any part of the game play; its sole purpose is to help players organize their crew using the functionality built within or with a spreadsheet application of their choice.</p>

			<p><b>DISCLAIMER</b> This tool is provided "as is", without warranty of any kind. Use at your own risk! It should be understood that <i>Star Trek Timelines</i> content and materials are trademarks and copyrights of <a href='https://www.disruptorbeam.com/tos/' target='_blank'>Disruptor Beam, Inc.</a> or its licensors. All rights reserved. This tool is neither endorsed by nor affiliated with Disruptor Beam, Inc..</p>

			{/* <p>For feedback, bugs and other issues please use the <a href='https://github.com/IAmPicard/StarTrekTimelinesSpreadsheet/issues' target='_blank'>GitHub page</a>. For information about other tools for Star Trek Timelines, see <a href='https://iampicard.github.io/' target='_blank'>here</a>.</p> */}
		</div>;
	}
}