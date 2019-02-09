# Star Trek Timelines Spreadsheet Tool
A tool to help with crew management in Star Trek Timelines.  Modified from the IAmPicard tool.  All aspects of the tool which initiated a game action (e.g. starting a voyage or playing the gauntlet) have been removed.  These aspect of the app will not return in this repo.  Do not ask me to add them.  It won't happen.

**NOTE** This tool does not (and will never) automate any part of the game play; its sole purpose is to help players organize their crew using the functionality built within or with a spreadsheet application of their choice.

**DISCLAIMER** This tool is provided "as is", without warranty of any kind. Use at your own risk!
It should be understood that *Star Trek Timelines* content and materials are trademarks and copyrights of [Disruptor Beam, Inc.](https://www.disruptorbeam.com/tos/) or its licensors. All rights reserved. This tool is neither endorsed by nor affiliated with Disruptor Beam, Inc. ( [more](/docs/DBSupport.png) )

## Install and run the tool

However, if you're only interested in installing and running the tool, head on to the [releases](https://github.com/iamtosk/StarTrekTimelinesSpreadsheet/releases) page and pick a recent release to install.

## Features

### Crew management

![Screenshot tool](/docs/mac-crew.png "Tool screenshot")

The first tab lets you manage your crew. You can sort by various fields, (un)group by rarity as well as export the data in Excel, CSV, JSON or HTML formats.

### Item management

![Screenshot Items](/docs/mac-items.png "Items screenshot")

This tab lists out all the items you currently have, along with their quantity and type.

### Ship management

![Screenshot Ships](/docs/mac-ships.png "Ships screenshot")

This tab lists out all the ships you currently have, along with their stats.

### Missions

![Screenshot Missions](/docs/mac-missions.png "Missions screenshot")

This tab give an overview of all accepted missions and cadet challenged, along with individual requirements and player stats for each quest and challenge, as well as crew success rates for each challenge (node).

### Crew recommendations

![Screenshot CrewRecommendations](/docs/Screenshot-CrewRecommendations.png "CrewRecommendations screenshot")

*DEPRECATED*

This tab will make recommendations about which crew you can freeze or airlock, and which you need to keep in your active roster, primarily for cadet challenges.

### Gauntlet

![Screenshot Gauntlet](/docs/Screenshot-Gauntlet.png "Gauntlet screenshot")

In this tab you can get recommendations for which crew to use in your next gauntlet (if you didn't already start it), and odds for crew matches (if you already started a gauntlet). Please see source code for details, the algorithm is still "hand-wavy" at this point and could use input from someone more experienced with statistical analysis.

![Screenshot Gauntlet Round](/docs/mac-gauntlet.png "Gauntlet Round screenshot")

### Fleet

![Screenshot Fleet](/docs/Screenshot-Fleet.png "Fleet screenshot")

Basic information about your fleet such as a member list with their last online and event ranks and starbase rooms' status.

### Share your crew stats

![Screenshot Sharing](/docs/Screenshot-ShareOnline.png "Sharing screenshot")

You can export a formatted html page with your crew stats and (optionally) your mission completion stats either to the local PC or directly upload it online, ready to send a link wherever you want - maybe your fleet-mates or to the forum / reddit / discord to ask for advice or just brag :wink: .

### Voyage

![Screenshot Voyage](/docs/mac-voyage-calculation.png "Voyage screenshot")

![Screenshot Voyage](/docs/mac-voyage-log.png "Voyage log screenshot")

You can calculate best crew for a voyage, as well as monitor the current voyage's log.

You can inspect the active state of crew by clicking on the little "baloon" icon. This can tell you whether the crew is currently on a shuttle adventure or on a voyage as well as details about remaining time, loot, etc.

## Development environment

### To get started:
Clone the repo and build with `node.js` v 10.

Minimal set of steps required
* `git clone --recurse-submodules https://github.com/iamtosk/StarTrekTimelinesSpreadsheet.git`
* `cd StarTrekTimelinesSpreadsheet`
* `npm run install:all`
  * You may also need to `npm install electron` if you see the message `Error: Electron failed to install correctly, please delete node_modules/electron and try installing again`
  * You may need to `npm install bindings nan` if you see errors using the voyage estimator tool
* `npm run dev`

*Note*: if for some reason the above steps are not sufficient, you may need to manually build in STTApi\AssetParser (with npm install) before building STTApi.

##### Development
* Run `npm run dev` to start webpack-dev-server. Electron will launch automatically after compilation.

If changes are made to the C++ native codebase under `/native`:
* You can compile to see warnings/errors with the following (though it does not build for proper integration with the app)
  * `$ rm -rf native/build/Release`
  * `$ cd native/build`
  * `$ make`
To rebuild for use with the app run the `electron-rebuild` executable under `node_modules/.bin/`

If you delete `node_modules/stt*` to get back to a cleaner state, `npm install` again to rebuild the C++ modules. If the install fails, revert any local changes to `package-lock.json`.

##### Production
_You have two options, an automatic build or two manual steps_

###### One Shot
* Set ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES=true and run "electron-builder" to build the native package
* Run `npm run package` to have webpack compile your application into `dist/bundle.js` and `dist/index.html`, and then an electron-packager run will be triggered for the current platform/arch, outputting to `builds/`

###### Manual
_Recommendation: Update the "postpackage" script call in package.json to specify parameters as you choose and use the `npm run package` command instead of running these steps manually_
* Run `npm run build` to have webpack compile and output your bundle to `dist/bundle.js`
* Then you can call electron-packager directly with any commands you choose

If you want to test the production build (In case you think Babili might be breaking something) after running `npm run build` you can then call `npm run prod`. This will cause electron to load off of the `dist/` build instead of looking for the webpack-dev-server instance. Electron will launch automatically after compilation.

## Privacy and security
There is no server associated with this tool, all state stays on your device. Here's a comprehensive list of URLs that the tool accesses (all these URLs are accessed over a secure (HTTPS) connection):
- https://thorium.disruptorbeam.com/ : this is the login URL for DisruptorBeam; your username / password or Facebook access token is sent to this URL in order to get an access_token. This URL is only accessed during login.
- https://stt.disruptorbeam.com/ : this is the main Star Trek Timelines API endpoint URL, owned by DisruptorBeam.
- https://api.github.com/repos/iamtosk/StarTrekTimelinesSpreadsheet/releases : this URL contains the list of tool releases. It's accessed during application boot (and from the About tab) to check for new versions. No data is sent along with the request (it's just a GET).
- https://ptpb.pw : this URL is accessed when (and only if) you use the Share dialog to share your crew stats online.
- https://www.facebook.com/v2.8/dialog/oauth : this URL is only accessed if you use the Facebook login option. It's used to obtain a facebook access token which is later sent to DB's server to get an access_token.

The tool never stores your username or password and it only sends it to DisruptorBeam's official servers for login purposes. If you check the "Stay logged in" checkbox in the login dialog, the tool will store an access_token on your local device in the IndexedDB database.

I encourage you to only use a version of the tool from a trusted source (such as the [Releases](https://github.com/iamtosk/StarTrekTimelinesSpreadsheet/releases) page on GitHub). If a "well intentioned" person online offers to send you a modified version with "extra features" ask for the source code and manually compare against what's here in the repo to ensure no malicious functionality was added.
