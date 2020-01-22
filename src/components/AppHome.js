import React from 'react';
import { Fabric } from 'office-ui-fabric-react/lib/Fabric';
import { CommandBar } from 'office-ui-fabric-react/lib/CommandBar';
import { Dialog, DialogType, DialogFooter } from 'office-ui-fabric-react/lib/Dialog';
import { Image } from 'office-ui-fabric-react/lib/Image';
import { PrimaryButton, DefaultButton } from 'office-ui-fabric-react/lib/Button';
import { Checkbox } from 'office-ui-fabric-react/lib/Checkbox';
import { TooltipHost, TooltipDelay, DirectionalHint } from 'office-ui-fabric-react/lib/Tooltip';
import { initializeIcons } from 'office-ui-fabric-react/lib/Icons';
import createHistory from 'history/createBrowserHistory';

// #!if ENV === 'electron' || ENV === 'exp'
import { LoginDialog } from './LoginDialog.js';
// #!endif

import { ShipList } from './ShipList.js';
import { ItemPage } from './ItemPage.js';
import { CrewPage } from './CrewPage.js';
import { GauntletHelper } from './GauntletHelper.js';
import { MissionExplorer } from './MissionExplorer.js';
import { AboutAndHelp } from './AboutAndHelp.js';
import { HomePage } from './HomePage.js';
import { FleetDetails } from './FleetDetails.js';
import { VoyageTools } from './VoyageTools.js';
import { NeededEquipment } from './NeededEquipment.js';
import { CrewDuplicates } from './CrewDuplicates.js';
import { IncompleteMissions } from './IncompleteMissions.js';
import { CryoCollections } from './CryoCollections';
import { FactionDetails } from './FactionDetails';
import { Shuttles } from './Shuttles';
import { ModalNotification } from './ModalNotification';
import { loadUITheme } from './Styles';

import STTApi from 'sttapi';
import { loginSequence } from 'sttapi';
import { createIssue } from '../utils/githubUtils';
import { openShellExternal, getAppVersion } from '../utils/pal';

import { ColorClassNames } from '@uifabric/styling';

// #!if ENV === 'electron'
import { rcompare } from 'semver';
// #!endif

export class AppHome extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			showSpinner: false,
			dataLoaded: false,
			showLoginDialog: false,
			captainName: 'Welcome!',
			captainAvatarUrl: '',
			captainAvatarBodyUrl: '',
			spinnerLabel: 'Loading...',
			hideErrorDialog: true,
			hideBootMessage: true,
			showBootMessage: false,
			errorMessage: '',
			updateUrl: undefined,
			theme: undefined,
			motd: undefined,
			darkTheme: false
		};

		this.history = createHistory();
		this.history.listen(location => {
			this._switchTab(location.hash.substr(1));
		});

		this._onAccessToken = this._onAccessToken.bind(this);
		this._onLogout = this._onLogout.bind(this);
		this._onRefresh = this._onRefresh.bind(this);
		this._onDataFinished = this._onDataFinished.bind(this);
		this._onDataError = this._onDataError.bind(this);
		this._playerResync = this._playerResync.bind(this);
		this._onSwitchTheme = this._onSwitchTheme.bind(this);
		this._onDismissBootMessage = this._onDismissBootMessage.bind(this);

		this._getNavItems = this._getNavItems.bind(this);
		this._getNavOverflowItems = this._getNavOverflowItems.bind(this);
		this._getNavFarItems = this._getNavFarItems.bind(this);
		this._switchTab = this._switchTab.bind(this);
		this.renderItem = this.renderItem.bind(this);

		initializeIcons(/* optional base url */);

		STTApi.config.where('key').equals('ui.darkThemeMode').first().then((entry) => {
			this.setState({ darkTheme: entry && entry.value }, () => {
				this._onSwitchTheme(true);
			});
		});

		STTApi.loginWithCachedAccessToken().then((success) => {
			if (success) {
				this.setState({ showSpinner: true, showLoginDialog: false });
				this._onAccessToken();
			}
			else {
                this.setState({ showLoginDialog: true });
                this.props.onLogout();
			}
		});

		this._onSwitchTheme(false);
	}

	_onSwitchTheme(shouldForceUpdate) {
		let finalTheme = loadUITheme(this.state.darkTheme);

		const root = document.querySelector('.App-content');
		if (root) {
			root.style.backgroundColor = finalTheme.semanticColors.bodyBackground;
			root.style.color = finalTheme.semanticColors.bodyText;
		}

		document.body.style.backgroundColor = finalTheme.semanticColors.bodyBackground;
		document.body.style.color = finalTheme.semanticColors.bodyText;

		if (shouldForceUpdate) {
			this.setState({ theme: finalTheme });
			STTApi.config.put({ key: 'ui.darkThemeMode', value: this.state.darkTheme });
			window.setThemeCss(this.state.darkTheme);
			this.forceUpdate();
		} else {
			this.state.theme = finalTheme;
		}
	}

	_onDismissBootMessage() {
		STTApi.config.put({ key: 'ui.showBootMessage' + getAppVersion(), value: this.state.showBootMessage });

		this.setState({ hideBootMessage: true });
	}

	componentDidMount() {
		this.intervalPlayerResync = setInterval(this._playerResync, 5 * 60 * 1000);
		this._switchTab('HomePage');
	}

	componentWillUnmount() {
		clearInterval(this.intervalPlayerResync);
	}

	_playerResync() {
		// Every 5 minutes, refresh the player currency data (the number of merits, chronitons, etc.)
		if (this.state.dataLoaded) {
			STTApi.resyncPlayerCurrencyData();
		}
	}

	render() {
		if (this.state.showSpinner) {
			return <div className="centeredVerticalAndHorizontal">
				<div className="ui massive text active centered inline loader">{this.state.spinnerLabel}</div>
			</div>;
		}

		return (
			<Fabric style={{ color: this.state.theme.semanticColors.bodyText, backgroundColor: this.state.theme.semanticColors.bodyBackground }} className='App'>
				<div style={{ display: 'flex', flexFlow: 'column', height: '100%', padding: '3px' }}>
					<div style={{ flex: '1 1 auto' }}>
						{this.state.dataLoaded && <CommandBar items={this._getNavItems()} overflowItems={this._getNavOverflowItems()} farItems={this.state.extraCommandItems} />}
					</div>
					<div style={{ flex: '0 1 auto' }}>
						{this.renderItem()}
					</div>
				</div>

				<Dialog
					hidden={this.state.hideErrorDialog}
					onDismiss={() => { this.setState({ hideErrorDialog: true }); }}
					dialogContentProps={{
						type: DialogType.normal,
						title: 'An error occured while loading data!',
						subText: 'Try restarting the application; if the error persists, please log a bug. Details: ' + this.state.errorMessage
					}}
					modalProps={{ isBlocking: true }}
				>
					<DialogFooter>
						<PrimaryButton onClick={() => { createIssue(false, this.state.errorMessage); }} text='Create bug report' />
						<DefaultButton onClick={() => { this.setState({ hideErrorDialog: true }); }} text='Cancel' />
					</DialogFooter>
				</Dialog>

				<Dialog
					hidden={this.state.hideBootMessage}
					onDismiss={() => { this._onDismissBootMessage(); }}
					dialogContentProps={{
						type: DialogType.normal,
						title: 'Please read me',
						subText: 'Star Trek Timelines is not designed to be accessed on multiple clients simultaneously!'
					}}
					modalProps={{ isBlocking: true }}
				>
					<div>
						<p>In order to avoid synchronization issues, please only have <b>one active client at a time</b> (this includes the game on any platform and/or the tool). Close / shut down all other clients, or restart them upon making changes somewhere else.</p>
						<p><i>Note:</i>If you're only using the tool to look at stats (and are ok with potentially out of date info), and don't use the Gauntlet or Voyage features, you can keep it running alongside the game.</p>

						<Checkbox checked={!this.state.showBootMessage} label="Don't show again"
							onChange={(e, isChecked) => { this.setState({ showBootMessage: !isChecked }); }}
						/>

						<br />
					</div>
					<DialogFooter>
						<PrimaryButton onClick={() => { openShellExternal('https://github.com/IAmPicard/StarTrekTimelinesSpreadsheet/blob/master/README.md'); }} text='Read more...' />
						<DefaultButton onClick={() => { this._onDismissBootMessage(); }} text='Ok' />
					</DialogFooter>
				</Dialog>

                {/* #!if ENV === 'electron' || ENV === 'exp' */}
				{this.state.showLoginDialog && <LoginDialog onAccessToken={this._onAccessToken} />}
				{/* #!endif */}

				<ModalNotification ref='modalNotification' />
			</Fabric>
		);
	}

	renderItem() {
		if (!this.state.dataLoaded) {
			return <span />;
		}

		let commandItemsUpdater = extraItems => {
			this.setState({
				extraCommandItems: this._getNavFarItems(extraItems)
			});
		};

		switch (this.state.currentTab) {
			case 'Crew':
				return <CrewPage onCommandItemsUpdate={commandItemsUpdater} />;

			case 'Items':
				return <ItemPage onCommandItemsUpdate={commandItemsUpdater} />;

			case 'Ships':
				return <ShipList />;

			case 'Missions':
				return <MissionExplorer onCommandItemsUpdate={commandItemsUpdater} />;

			case 'Voyage':
				return <VoyageTools onCommandItemsUpdate={commandItemsUpdater} />;

			case 'Gauntlet':
				return <GauntletHelper onCommandItemsUpdate={commandItemsUpdater} />;

			case 'Fleet':
				return <FleetDetails />;

			case 'About':
				return <AboutAndHelp />;

			case 'HomePage':
				return <HomePage captainAvatarBodyUrl={this.state.captainAvatarBodyUrl} onLogout={this._onLogout} onRefresh={this._onRefresh} />;

			case 'NeededEquipment':
				return <NeededEquipment onCommandItemsUpdate={commandItemsUpdater} />;

			case 'CrewDuplicates':
				return <CrewDuplicates onCommandItemsUpdate={commandItemsUpdater} />;

			case 'IncompleteMissions':
				return <IncompleteMissions />;

			case 'CryoCollections':
				return <CryoCollections onCommandItemsUpdate={commandItemsUpdater} />;

			case 'FactionDetails':
				return <FactionDetails />;

			case 'Shuttles':
				return <Shuttles />;

			default:
				return <span>Error! Unknown tab selected.</span>;
		}
	}

	_tabMenuItem(tab) {
		return {
			key: tab.key,
			name: tab.name || tab.key,
			iconProps: { iconName: tab.itemIcon },
			iconOnly: tab.iconOnly,
			disabled: tab.disabled,
			onClick: () => {
				this._switchTab(tab.key);
			}
		}
	}

	_switchTab(newTab) {
		if (this.state.currentTab === newTab) {
			// From the history listener, nothing to do here
			return;
		}

		this.setState({
			currentTab: newTab,
			extraCommandItems: this._getNavFarItems()
		}, () => {
			if (this.history.location.hash.substr(1) !== newTab) {
				this.history.push({ hash: newTab });
			}
		});
	}

	_getNavFarItems(extraItems) {
		let staticItems = [
			{
				key: 'SwitchTheme',
				name: 'Switch theme',
				iconProps: { iconName: 'Light' },
				iconOnly: true,
				onClick: () => {
					this.setState({ darkTheme: !this.state.darkTheme }, () => this._onSwitchTheme(true));
				}
			},
			{
				// key: 'FeedbackHelp',
				// name: 'Feedback and help',
				// iconProps: { iconName: 'Help' },
				// iconOnly: true,
				// subMenuProps: {
				// 	items: [this._tabMenuItem({ key: 'About', name: 'Help and About', itemIcon: 'Help', iconOnly: true }),
				// 	{
				// 		key: 'ReportBug',
				// 		name: 'Report bug...',
				// 		iconProps: { iconName: 'Bug' },
				// 		onClick: () => {
				// 			createIssue(false);
				// 		}
				// 	},
				// 	{
				// 		key: 'SendFeedback',
				// 		name: 'Feature request...',
				// 		iconProps: { iconName: 'Comment' },
				// 		onClick: () => {
				// 			createIssue(true);
				// 		}
				// 	},
				// 	{
				// 		key: 'PatreonLink',
				// 		name: 'Support me on Patreon...',
				// 		iconProps: { iconName: 'CoffeeScript' },
				// 		onClick: () => {
				// 			openShellExternal("https://www.patreon.com/bePatron?u=10555637");
				// 		}
				// 	},
				// 	{
				// 		key: 'EmailMe',
				// 		name: 'info@iampicard.com',
				// 		iconProps: { iconName: 'Mail' },
				// 		onClick: () => {
				// 			openShellExternal("mailto:info@iampicard.com");
				// 		}
				// 	}
				// ]}
			}
		];

		return extraItems ? extraItems.concat(staticItems) : staticItems;
	}

	renderCaptainName() {
		return <div style={{ height: '100%' }}>
			<div style={{ cursor: 'pointer', display: 'flex', height: '100%', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center' }} onClick={() => this._switchTab('HomePage')}>
				<Image src={this.state.captainAvatarUrl} height={32} style={{ display: 'inline-block' }} />
				<span style={{ padding: '5px' }}>{this.state.captainName}</span>
			</div>
		</div>;
	}

	renderMotd() {
		if (this.state.motd.show) {
			return <div style={{ cursor: 'pointer', display: 'flex', padding: '5px', height: '100%', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center' }}>
				<TooltipHost calloutProps={{ gapSpace: 20 }} delay={TooltipDelay.zero} directionalHint={DirectionalHint.bottomCenter}
					tooltipProps={{
						onRenderContent: () => {
							return (<div dangerouslySetInnerHTML={{ __html: this.state.motd.contents }} />);
						}
					}} >
					<span className={ColorClassNames.orangeLighter} dangerouslySetInnerHTML={{ __html: this.state.motd.title }} />
				</TooltipHost>
			</div>;
		} else {
			return <span />;
		}
	}

	_getNavOverflowItems() {
		return [
			this._tabMenuItem({ key: 'Fleet', itemIcon: 'WindDirection' }),
			this._tabMenuItem({ key: 'FactionDetails', name: 'Factions', itemIcon: 'Teamwork' }),
			this._tabMenuItem({ key: 'Shuttles', name: 'Shuttles', itemIcon: 'Sections' }),
			this._tabMenuItem({ key: 'CryoCollections', name: 'Cryo collections', itemIcon: 'CheckList' })];
	}

	_getNavItems() {
		let navItems = [
			{
				key: 'custom',
				text: 'Captain name',
				onRender: () => { return this.renderCaptainName(); }
			}];

		if (this.state.motd) {
			navItems.push({
				key: 'customMotd',
				text: 'Motd',
				onRender: () => { return this.renderMotd(); }
			});
		}

		if (this.state.updateUrl) {
			navItems.push({
				key: 'Update',
				name: 'New version available!',
				iconProps: { iconName: 'FlameSolid', styles: { root: { color: 'red' } } },
				iconOnly: true,
				onClick: () => {
					openShellExternal(this.state.updateUrl);
				}
			});
		}

		navItems = navItems.concat([
			this._tabMenuItem({ key: 'Crew', itemIcon: 'Teamwork' }),
			{
				key: 'tools',
				text: 'Tools and recommendations',
				iconProps: { iconName: 'TestUserSolid' },
				subMenuProps: {
					items: [this._tabMenuItem({ key: 'Missions', itemIcon: 'Trophy' }),
					{
						key: 'NeededEquipment',
						name: 'Needed Equipment',
						iconProps: { iconName: 'WaitlistConfirm' },
						onClick: () => {
							this._switchTab('NeededEquipment');
						}
					},
					{
						key: 'CrewDuplicates',
						name: 'Duplicate crew',
						iconProps: { iconName: 'MergeDuplicate' },
						onClick: () => {
							this._switchTab('CrewDuplicates');
						}
					},
					{
						key: 'IncompleteMissions',
						name: 'Incomplete missions',
						iconProps: { iconName: 'Backlog' },
						onClick: () => {
							this._switchTab('IncompleteMissions');
						}
					}]
				}
			},
			this._tabMenuItem({ key: 'Voyage', itemIcon: 'Rocket' }),
			this._tabMenuItem({ key: 'Gauntlet', itemIcon: 'ConnectContacts' }),
			this._tabMenuItem({ key: 'Items', itemIcon: 'Boards' }),
			this._tabMenuItem({ key: 'Ships', itemIcon: 'Airplane' })
		]);

		return navItems;
	}

	_onAccessToken() {
		this.setState({ showSpinner: true, showLoginDialog: false });

		loginSequence((progressLabel) => {
			console.log(`Progress message: '${progressLabel}'`);
			this.setState({ spinnerLabel: progressLabel });
		}).then(this._onDataFinished)
			.catch((err) => {
				this._onDataError(err);
			});
	}

	_onLogout() {
		this.setState({ darkTheme: false }, () => { this._onSwitchTheme(true); });

		STTApi.refreshEverything(true);
        this.setState({ showLoginDialog: true, dataLoaded: false, captainName: '', spinnerLabel: 'Loading...' });

        this.props.onLogout();
	}

	_onRefresh() {
		STTApi.refreshEverything(false);
		this.setState({ dataLoaded: false, spinnerLabel: 'Refreshing...' });
		this._onAccessToken();
	}

	_onDataError(reason) {
		this.setState({ errorMessage: reason, hideErrorDialog: false, showSpinner: false, showLoginDialog: true });
	}

	async _onDataFinished() {
		// #!if ENV === 'electron'
		// This resets with every new version, in case the message is updated or folks forget
		let entry = await STTApi.config.where('key').equals('ui.showBootMessage' + getAppVersion()).first();
		let shouldShowBootMessage = !entry || entry.value;
		// #!else
		// TODO: This ifdef should be the same on web, but Safari crashes and burns with dexie indexeddb transactions (potentially Promise-related)
		let shouldShowBootMessage = false;
		// #!endif
		this.setState({
			showSpinner: false,
			captainName: STTApi.playerData.character.display_name,
			hideBootMessage: !shouldShowBootMessage,
			showBootMessage: shouldShowBootMessage,
			dataLoaded: true
		});

		// #!if ENV === 'electron'
		// let data = await STTApi.getGithubReleases();
		// let versions = data.map((release) => release.tag_name.replace('v', ''));
		// let maxVersion = versions.sort(rcompare)[0];

		// if (maxVersion != getAppVersion()) {
		// 	var n = new Notification('STT Tool - Update available!', { body: 'A new release of the Star Trek Tool (' + data[0].tag_name + ' ' + data[0].name + ') has been made available. Please check the About tab for download instructions!' });
		// 	this.setState({
		// 		updateUrl: data[0].html_url
		// 	});
		// }
		// #!endif

		// STTApi.networkHelper.get(STTApi.serverAddress + 'motd/get', { webApp: STTApi.inWebMode, dbid: STTApi.playerData.dbid, id: STTApi.playerData.character.id, captainName: STTApi.playerData.character.display_name, version: getAppVersion() }).then((data) => {
		// 	this.setState({ motd: data });
		// });

		// STTApi.networkHelper.get(STTApi.serverAddress + 'motd/notif', { webApp: STTApi.inWebMode }).then((data) => {
		// 	if (data && data.show) {
		// 		this.refs.modalNotification.show(data.title, data.contents);
		// 	}
		// });

		if (STTApi.playerData.character.crew_avatar) {
			STTApi.imageProvider.getCrewImageUrl(STTApi.playerData.character.crew_avatar, false, 0).then(({ id, url }) => {
				this.setState({ captainAvatarUrl: url });
			}).catch((error) => { this.setState({ captainAvatarUrl: '' }); });

			STTApi.imageProvider.getCrewImageUrl(STTApi.playerData.character.crew_avatar, true, 0).then(({ id, url }) => {
				this.setState({ captainAvatarBodyUrl: url });
			}).catch((error) => { this.setState({ captainAvatarBodyUrl: '' }); });
		}
	}
}
