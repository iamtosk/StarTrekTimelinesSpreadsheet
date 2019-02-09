import React from 'react';

import STTApi from 'sttapi';

class CryoCollection extends React.Component {
    constructor(props) {
        super(props);

        if (!this.props.collection.iconUrl) {
            STTApi.imageProvider.getImageUrl(this.props.collection.image, this.props.collection).then((found) => {
                this.props.collection.iconUrl = found.url;

                this.setState({ imageUrl: found.url });
            }).catch((error) => { console.warn(error); });
        }

        let archetypes = STTApi.crewAvatars.filter(crew => (crew.traits.concat(crew.traits_hidden).filter(trait => this.props.collection.traits.includes(trait)).length > 0) || this.props.collection.extra_crew.includes(crew.id));
        let unowned = [];
        let owned = [];
        archetypes.forEach(a => {
            let crew = STTApi.roster.find(crew => crew.id === a.id);
            if (!crew) {
                unowned.push(a);
            } else {
                owned.push(crew);
            }
        });

        this.state = {
            imageUrl: this.props.collection.iconUrl,
            unownedCrew: unowned,
            ownedCrew: owned,
        };
    }

    htmlDecode(input) {
        input = input.replace(/<#([0-9A-F]{6})>/gi, '<span style="color:#$1">');
        input = input.replace(/<\/color>/g, '</span>');

        return {
            __html: input
        };
    }

    render() {
        const fixFileUrl = (url) => {
            return url.replace(/\\/g, '/');
        }

        let isDone = this.props.collection.milestone.goal === 0;

        return <div className="ui vertical segment" style={{ backgroundImage: (this.state.imageUrl ? `url("${fixFileUrl(this.state.imageUrl)}")` : ''), backgroundPosition: 'right bottom', backgroundRepeat: 'no-repeat', backgroundSize: 'contain', marginTop: '20px', paddingRight: '360px' }} >
            <h4>{this.props.collection.name}</h4>
            <p dangerouslySetInnerHTML={this.htmlDecode(this.props.collection.description)} />
            {isDone && <p>Complete ({this.props.collection.progress} / {this.props.collection.progress})</p>}
            {!isDone && <p>Progress: {this.props.collection.progress} / {this.props.collection.milestone.goal}</p>}
            {(this.state.ownedCrew.length > 0) && <p><b>Crew:</b> {this.state.ownedCrew.map(crew => <span key={crew.id}>{crew.name} ({crew.rarity}/{crew.max_rarity})</span>).reduce((prev, curr) => [prev, ', ', curr])}</p>}
            {(this.state.unownedCrew.length > 0) && <p><b>Unowned crew:</b> {this.state.unownedCrew.map(crew => <span key={crew.id}>{crew.name}</span>).reduce((prev, curr) => [prev, ', ', curr])}</p>}
        </div>;
    }
}

export class CryoCollections extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            showComplete: false
        };
    }

    componentDidMount() {
        this._updateCommandItems();
    }

    _updateCommandItems() {
        if (this.props.onCommandItemsUpdate) {
            this.props.onCommandItemsUpdate([{
                key: 'settings',
                text: 'Settings',
                iconProps: { iconName: 'Equalizer' },
                subMenuProps: {
                    items: [{
                        key: 'showComplete',
                        text: 'Show complete collections',
                        canCheck: true,
                        isChecked: this.state.showComplete,
                        onClick: () => { this.setState({showComplete: !this.state.showComplete}, () => { this._updateCommandItems(); }); }
                    }]
                }
            }]);
        }
    }

    render() {
        let collections = STTApi.playerData.character.cryo_collections;

        if (!this.state.showComplete) {
            collections = collections.filter(c => c.milestone.goal !== 0);
        }

        return <div className='tab-panel' data-is-scrollable='true'>
            {collections.map(collection => <CryoCollection key={collection.id} collection={collection} />)}
        </div>;
    }
}