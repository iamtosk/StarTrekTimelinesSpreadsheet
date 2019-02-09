import React from 'react';
import { Container, Menu, Loader, Icon } from 'semantic-ui-react';

import { CrewPage } from './CrewPage';
import { HomePage } from './HomePage';

import STTTools from './api';

export class SiteHome extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: true,
            activeItem: 'home'
        };

        STTTools.initialize().then(() => {
            this.setState({ loading: false });
        });
    }

    render() {
        if (this.state.loading) {
            return <div style={{ display: 'flex', width: '100vw', height: '100vh', justifyContent: 'center', alignItems: 'center' }} >
                <Loader active inline='centered' content='Loading...' />
            </div>;
        }

        const handleItemClick = (e, { name }) => this.setState({ activeItem: name });

        return <div>
            <Menu fixed='top' inverted>
                <Container>
                    <Menu.Item as='a' header onClick={handleItemClick} name='home' active={this.state.activeItem === 'home'}>Home</Menu.Item>
                    <Menu.Item as='a' onClick={handleItemClick} name='crewstats' active={this.state.activeItem === 'crewstats'}>Crew stats</Menu.Item>
                </Container>

                <Menu.Menu position='right'>
                    <Menu.Item as='a' onClick={() => this._switchTheme()}><Icon name='adjust' /></Menu.Item>
                </Menu.Menu>
            </Menu>

            <div style={{ marginTop: '3em', padding: '1em' }}>
                {this.renderItem(this.state.activeItem)}
            </div>
        </div>;
    }

    _switchTheme() {
        window.swapThemeCss();
        this.forceUpdate();
    }

    renderItem(name) {
        switch (name) {
            case 'home':
                return <HomePage onAccessToken={this.props.onAccessToken} />;

            case 'crewstats':
                return <CrewPage />;
        }
    }
}