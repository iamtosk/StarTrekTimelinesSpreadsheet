import React from 'react'
import { Table, Rating } from 'semantic-ui-react'

import { ModalCrewDetails } from './CrewDetails';

import STTTools from './api';

export class CrewTable extends React.Component {
    constructor(props) {
        super(props);

        this.modalCrewDetails = React.createRef();

        this.state = {
            column: null,
            data: STTTools.allcrew,
            direction: null,
        };
    }

    handleSort(clickedColumn, isSkill) {
        const { column, data, direction } = this.state

        if (column !== clickedColumn) {
            const compare = (a, b) => ((a > b) ? 1 : ((b > a) ? -1 : 0));

            let sortedData;
            if (isSkill) {
                sortedData = data.sort((a, b) => compare((a.skills[clickedColumn] ? a.skills[clickedColumn].core : 0), (b.skills[clickedColumn] ? b.skills[clickedColumn].core : 0)));
            } else {
                sortedData = data.sort((a, b) => compare(a[clickedColumn], b[clickedColumn]));
            }

            this.setState({
                column: clickedColumn,
                data: sortedData,
                direction: 'ascending',
            });
        } else {
            this.setState({
                data: data.reverse(),
                direction: direction === 'ascending' ? 'descending' : 'ascending',
            });
        }
    }

    render() {
        const { column, direction } = this.state;
        let { data } = this.state;

        if (this.props.searchFilter) {
            data = data.filter(crew => crew.name.toLowerCase().indexOf(this.props.searchFilter.toLowerCase()) >= 0);
        }

        return <div>
            <ModalCrewDetails ref={this.modalCrewDetails} />
            <Table sortable celled selectable striped collapsing compact='very'>
                <Table.Header>
                    <Table.Row>
                        <Table.HeaderCell width={3} sorted={column === 'name' ? direction : null} onClick={() => this.handleSort('name')} >Crew</Table.HeaderCell>
                        <Table.HeaderCell width={1} sorted={column === 'max_rarity' ? direction : null} onClick={() => this.handleSort('max_rarity')} >Rarity</Table.HeaderCell>
                        <Table.HeaderCell width={1} sorted={column === 'command_skill' ? direction : null} onClick={() => this.handleSort('command_skill', true)} >Command</Table.HeaderCell>
                        <Table.HeaderCell width={1} sorted={column === 'diplomacy_skill' ? direction : null} onClick={() => this.handleSort('diplomacy_skill', true)} >Diplomacy</Table.HeaderCell>
                        <Table.HeaderCell width={1} sorted={column === 'engineering_skill' ? direction : null} onClick={() => this.handleSort('engineering_skill', true)} >Engineering</Table.HeaderCell>
                        <Table.HeaderCell width={1} sorted={column === 'medicine_skill' ? direction : null} onClick={() => this.handleSort('medicine_skill', true)} >Medicine</Table.HeaderCell>
                        <Table.HeaderCell width={1} sorted={column === 'science_skill' ? direction : null} onClick={() => this.handleSort('science_skill', true)} >Science</Table.HeaderCell>
                        <Table.HeaderCell width={1} sorted={column === 'security_skill' ? direction : null} onClick={() => this.handleSort('security_skill', true)} >Security</Table.HeaderCell>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {data.map(crew =>
                        <Table.Row key={crew.symbol} style={{ cursor: 'zoom-in' }} onClick={() => this.modalCrewDetails.current.handleOpen(crew)}>
                            <Table.Cell>
                                <div style={{ display: 'grid', gridTemplateColumns: '60px auto', gridTemplateAreas: `'icon stats' 'icon description'`, gridGap: '1px' }}>
                                    <div style={{ gridArea: 'icon' }}>
                                        <img width={48} src={STTTools.assetProvider.getCrewCached(crew)} />
                                    </div>
                                    <div style={{ gridArea: 'stats' }}>
                                        <span style={{ fontWeight: '900', fontSize: '1.25em' }}>{crew.name}</span>
                                    </div>
                                    <div style={{ gridArea: 'description' }}>
                                        {crew.short_name}
                                    </div>
                                </div>
                            </Table.Cell>
                            <Table.Cell><Rating defaultRating={crew.max_rarity} maxRating={crew.max_rarity} size='large' disabled /></Table.Cell>
                            {crew.skills.command_skill ?
                                <Table.Cell textAlign='center'><b>{crew.skills.command_skill.core}</b><br />+({crew.skills.command_skill.range_min}-{crew.skills.command_skill.range_max})</Table.Cell> :
                                <Table.Cell></Table.Cell>}
                            {crew.skills.diplomacy_skill ?
                                <Table.Cell textAlign='center'><b>{crew.skills.diplomacy_skill.core}</b><br />+({crew.skills.diplomacy_skill.range_min}-{crew.skills.diplomacy_skill.range_max})</Table.Cell> :
                                <Table.Cell></Table.Cell>}
                            {crew.skills.engineering_skill ?
                                <Table.Cell textAlign='center'><b>{crew.skills.engineering_skill.core}</b><br />+({crew.skills.engineering_skill.range_min}-{crew.skills.engineering_skill.range_max})</Table.Cell> :
                                <Table.Cell></Table.Cell>}
                            {crew.skills.medicine_skill ?
                                <Table.Cell textAlign='center'><b>{crew.skills.medicine_skill.core}</b><br />+({crew.skills.medicine_skill.range_min}-{crew.skills.medicine_skill.range_max})</Table.Cell> :
                                <Table.Cell></Table.Cell>}
                            {crew.skills.science_skill ?
                                <Table.Cell textAlign='center'><b>{crew.skills.science_skill.core}</b><br />+({crew.skills.science_skill.range_min}-{crew.skills.science_skill.range_max})</Table.Cell> :
                                <Table.Cell></Table.Cell>}
                            {crew.skills.security_skill ?
                                <Table.Cell textAlign='center'><b>{crew.skills.security_skill.core}</b><br />+({crew.skills.security_skill.range_min}-{crew.skills.security_skill.range_max})</Table.Cell> :
                                <Table.Cell></Table.Cell>}
                        </Table.Row>
                    )}
                </Table.Body>
            </Table>
        </div>;
    }
}