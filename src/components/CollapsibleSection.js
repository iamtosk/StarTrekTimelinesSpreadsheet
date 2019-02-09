import React from 'react';
import { Icon } from 'office-ui-fabric-react/lib/Icon';
import { ColorClassNames } from '@uifabric/styling';

export class CollapsibleSection extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			isCollapsed: true,
			background: props.background ? props.background : 'none'
		};
	}

	render() {
		return (<div>
			<h2><button type='button' style={{ cursor: 'default', background: this.state.background, border: 'none' }} onClick={() => this.setState({ isCollapsed: !this.state.isCollapsed })}>
				<Icon iconName={this.state.isCollapsed ? 'ChevronDown' : 'ChevronUp'} className={ColorClassNames.neutralDark} />
			</button> {this.props.title}
			</h2>
			{!this.state.isCollapsed && this.props.children}
		</div>);
	}
}