import React from 'react';
import { SearchBox } from 'office-ui-fabric-react/lib/SearchBox';
import { DefaultButton } from 'office-ui-fabric-react/lib/Button';

import { CrewList } from './CrewList.js';
import { ShareDialog } from './ShareDialog.js';

import { exportExcel } from '../utils/excelExporter.js';
import { exportCsv } from '../utils/csvExporter.js';
import { shareCrew } from '../utils/pastebin.js';

import { download } from '../utils/pal';

import STTApi from 'sttapi';

export class CrewPage extends React.Component {
	constructor(props) {
        super(props);
        
        this.state = {
            showEveryone: false,
            showBuyback: true,
            showCanTrain: false,
            groupRarity: false,
            compactMode: false,
            crewData: this.loadCrewData(false, true)
        };
    }
    
    componentDidMount() {
        this.refs.crewList.filter('');

        this._updateCommandItems();
    }

    loadCrewData(showEveryone, showBuyback, showCanTrain) {
        let crewData= STTApi.roster;
        if (showEveryone) {
            const isFFFE = (crew) => (crew.frozen > 0) || ((crew.rarity === crew.max_rarity) && (crew.level === 100));
            const notOwned = (crew) => {
                let rc = STTApi.roster.find((rosterCrew) => !rosterCrew.buyback && (rosterCrew.symbol === crew.symbol));

                return !(rc) || !isFFFE(rc);
            }

            // Let's combine allcrew with roster such that FFFE crew shows up only once
            crewData = crewData.concat(STTApi.allcrew.filter(crew => notOwned(crew)));
        }

        if (!showBuyback) {
            crewData = crewData.filter(crew => !crew.buyback);
        }

        if(showCanTrain) {
            crewData = crewData.filter(crew => crew.level !== crew.max_level);
        }

        return crewData;
    }

    _updateCommandItems() {
        if (this.props.onCommandItemsUpdate) {
            this.props.onCommandItemsUpdate([
                {
                    key: 'export',
                    text: 'Export',
                    iconProps: { iconName: 'Download' },
                    subMenuProps: {
                        items: [
                            {
                                key: 'exportExcel',
                                name: 'Export Excel...',
                                iconProps: { iconName: 'ExcelLogo' },
                                onClick: async () => {
                                    let data = await exportExcel(STTApi.playerData.character.items);
                                    download('My Crew.xlsx', data, 'Export Star Trek Timelines crew roster', 'Export');
                                }
                            },
                            {
                                key: 'exportCsv',
                                name: 'Export CSV...',
                                iconProps: { iconName: 'ExcelDocument' },
                                onClick: () => {
                                    let csv = exportCsv();
                                    download('My Crew.csv', csv, 'Export Star Trek Timelines crew roster', 'Export');
                                }
                            },
                            {
                                key: 'share',
                                name: 'Share...',
                                iconProps: { iconName: 'Share' },
                                onClick: () => { this.refs.shareDialog._showDialog(STTApi.playerData.character.display_name); }
                            }]
                        }
                },
                {
                    key: 'settings',
                    text: 'Settings',
                    iconProps: { iconName: 'Equalizer' },
                    subMenuProps: {
                        items: [{
                            key: 'groupRarity',
                            text: 'Group by rarity',
                            canCheck: true,
                            isChecked: this.state.groupRarity,
                            onClick: () => {
                                let isChecked = !this.state.groupRarity;
                                this.setState({
                                    groupRarity: isChecked
                                }, () => { this._updateCommandItems(); });
                            }
                        },
                        {
                            key: 'showBuyback',
                            text: 'Show buyback (dismissed) crew',
                            canCheck: true,
                            isChecked: this.state.showBuyback,
                            onClick: () => {
                                let isChecked = !this.state.showBuyback;
                                this.setState({
                                    crewData: this.loadCrewData(this.state.showEveryone, isChecked, this.state.showCanTrain),
                                    showBuyback: isChecked
                                }, () => { this._updateCommandItems(); });
                            }
                        },
                          {
                            key: 'showCanTrain',
                            text: 'Show crew that can receive training',
                            canCheck: true,
                            isChecked: this.state.showCanTrain,
                            onClick: () => {
                              let isChecked = !this.state.showCanTrain;
                              this.setState({
                                crewData: this.loadCrewData(this.state.showEveryone, this.state.showBuyback, isChecked),
                                showCanTrain: isChecked
                              }, () => { this._updateCommandItems(); });
                            }
                          },
                        {
                            key: 'compactMode',
                            text: 'Compact mode',
                            canCheck: true,
                            isChecked: this.state.compactMode,
                            onClick: () => {
                                let isChecked = !this.state.compactMode;
                                this.setState({
                                    compactMode: isChecked
                                }, () => { this._updateCommandItems(); });
                            }
                        },
                        {
                            key: 'showEveryone',
                            text: '(EXPERIMENTAL) Show stats for all crew',
                            canCheck: true,
                            isChecked: this.state.showEveryone,
                            onClick: () => {
                                let isChecked = !this.state.showEveryone;
                                this.setState({
                                    crewData: this.loadCrewData(isChecked, this.state.showBuyback, this.state.showCanTrain),
                                    showEveryone: isChecked
                                }, () => { this._updateCommandItems(); });
                            }
                        }]
                    }
                }
            ]);
        }
    }

	render() {
		return <div>
            <SearchBox placeholder='Search by name or trait...'
                onChange={(newValue) => this.refs.crewList.filter(newValue)}
                onSearch={(newValue) => this.refs.crewList.filter(newValue)}
            />
            <CrewList data={this.state.crewData} ref='crewList' groupRarity={this.state.groupRarity} showBuyback={this.state.showBuyback} compactMode={this.state.compactMode} />
            <ShareDialog ref='shareDialog' onShare={shareCrew} />
        </div>;
	}
}