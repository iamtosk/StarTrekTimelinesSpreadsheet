import React from 'react';

export class RarityStars extends React.Component {
	render() {
        let stars = "★".repeat(this.props.value);
        stars = stars + "☆".repeat(this.props.max - this.props.value);
		return (<div className='rarity-stars'>{stars}</div>);
	}
}