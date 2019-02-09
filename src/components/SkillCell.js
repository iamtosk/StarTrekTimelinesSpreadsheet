import React from 'react';

export class SkillCell extends React.Component {
	render() {
		if (this.props.skill.core > 0) {
			if (this.props.compactMode) {
				return <div className='skill-stats-div'>
					<span className='skill-stats'>{this.props.skill.core}</span>
					<span className='skill-stats-range'>+({this.props.skill.min} - {this.props.skill.max})</span>
				</div>;
			} else {
				return <div className='skill-stats-div'>
					<span className='skill-stats'>{this.props.skill.core}</span>
					<br />
					<span className='skill-stats-range'>+({this.props.skill.min} - {this.props.skill.max})</span>
				</div>;
			}
		}
		else {
			return <div className='skill-stats-div'></div>;
		}
	}
}