import React from 'react';

import { Header, Input } from 'semantic-ui-react';

import { CrewTable } from './CrewTable';

export class CrewPage extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            searchFilter: ''
        };
    }

    render() {
        return <div>
            <Header as='h2'>Crew stats</Header>
            <p><i>Hint</i> Click on a row to get more details on specific crew</p>

            <Input icon='search' placeholder='Search...' value={this.state.searchFilter} onChange={(e, { value }) => this.setState({ searchFilter: value })} />

            <CrewTable searchFilter={this.state.searchFilter} />

            <p><b>Note</b> This data is crowd-sourced from cached immortal details of users of the IAmPicard web tool. It may be out of date or incomplete (it usually takes a few hours for new crew to show up).</p>
        </div>;
    }
}