import React from 'react';
import { Modal } from 'office-ui-fabric-react/lib/Modal';

import UserStore from './Styles';

export class ModalNotification extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            title: undefined,
            content: undefined,
            showModal: false
        };
    }

    show(title, content) {
        this.setState({ title, content, showModal: true });
    };

    render() {
        let currentTheme = UserStore.get('theme');

        return <Modal
            isOpen={this.state.showModal}
            onDismiss={() => this.setState({ showModal: false })}
            isBlocking={false}
            containerClassName="modalNotification-container"
            styles={{
                main: {
                    backgroundColor: currentTheme.semanticColors.bodyStandoutBackground,
                    color: currentTheme.semanticColors.bodyText
                }
            }}
        >
            <div className="modalNotification-header">
                <span dangerouslySetInnerHTML={{ __html: this.state.title }} />
            </div>
            <div className="modalNotification-body">
                <div dangerouslySetInnerHTML={{ __html: this.state.content }} />
            </div>
        </Modal>;
    }
}