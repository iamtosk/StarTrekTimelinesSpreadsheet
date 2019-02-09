import React from 'react';

import STTApi from 'sttapi';
import { CONFIG } from 'sttapi';

export class GuaranteedSuccess extends React.Component {
    render() {
        return <div>
            <h2>{this.props.title}</h2>
            {STTApi.missionSuccess.map((recommendation) => {
                if (recommendation.cadet !== this.props.cadet) {
                    return <span key={recommendation.mission.episode_title + ' - ' + recommendation.quest.name + ' - ' + recommendation.challenge.name} />;
                }

                if (recommendation.crew.length === 0) {
                    return <div key={recommendation.mission.episode_title + ' - ' + recommendation.quest.name + ' - ' + recommendation.challenge.name}>
                        <h3>{recommendation.mission.episode_title + ' - ' + recommendation.quest.name + ' - ' + recommendation.challenge.name}</h3>
                        <span style={{ color: 'red' }}>No crew can complete this challenge!</span><br />
                        <span className='quest-mastery'>You need a crew with the <img src={CONFIG.SPRITES['icon_' + recommendation.skill].url} height={18} /> {CONFIG.SKILLS[recommendation.skill]} skill of at least {recommendation.roll}
                            {(recommendation.lockedTraits.length > 0) &&
                                (<span>&nbsp;and one of these traits: {recommendation.lockedTraits.map((trait) => <span key={trait}>{STTApi.getTraitName(trait)}</span>).reduce((prev, curr) => [prev, ', ', curr])}
                                </span>)}.</span>
                    </div>;
                }

                if (recommendation.crew.filter((crew) => crew.success > 99.9).length === 0) {
                    return <div key={recommendation.mission.episode_title + ' - ' + recommendation.quest.name + ' - ' + recommendation.challenge.name}>
                        <h3>{recommendation.mission.episode_title + ' - ' + recommendation.quest.name + ' - ' + recommendation.challenge.name}</h3>
                        <span>Your best bet is {recommendation.crew[0].crew.name} with a {recommendation.crew[0].success.toFixed(2)}% success chance.</span><br />
                        <span className='quest-mastery'>You need a crew with the <img src={CONFIG.SPRITES['icon_' + recommendation.skill].url} height={18} /> {CONFIG.SKILLS[recommendation.skill]} skill of at least {recommendation.roll}
                            {(recommendation.lockedTraits.length > 0) &&
                                (<span>&nbsp;and one of these traits: {recommendation.lockedTraits.map((trait) => <span key={trait}>{STTApi.getTraitName(trait)}</span>).reduce((prev, curr) => [prev, ', ', curr])}
                                </span>)}.</span>
                    </div>;
                }
            })
            }
        </div>;
    }
}

export class IncompleteMissions extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return <div className='tab-panel' data-is-scrollable='true'>
            <GuaranteedSuccess title='Cadet challenges without guaranteed success' cadet={true} />
            <br/>
            <GuaranteedSuccess title='Missions without guaranteed success' cadet={false} />
        </div>;
    }
}