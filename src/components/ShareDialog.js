import React from 'react';

import { Dialog, DialogType, DialogFooter } from 'office-ui-fabric-react/lib/Dialog';
import { PrimaryButton, DefaultButton } from 'office-ui-fabric-react/lib/Button';
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { Dropdown } from 'office-ui-fabric-react/lib/Dropdown';
import { Checkbox } from 'office-ui-fabric-react/lib/Checkbox';

export class ShareDialog extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			hideDialog: true,
			shareMissions: false,
			exportBuyback: false,
			exportWhere: 'L',
			exportType: 'html',
			title: '',
			htmlColorTheme: 'cyborg',
			description: 'Here are my crew stats. Recommendations?'
		};

		this.htmlColorThemes = ['cerulean', 'cosmo', 'cyborg', 'darkly', 'flatly', 'journal', 'litera', 'lumen', 'lux', 'materia', 'minty', 'pulse', 'sandstone', 'simplex', 'sketchy', 'slate', 'solar', 'spacelab', 'superhero', 'united', 'yeti'];

		this._closeDialog = this._closeDialog.bind(this);
		this._cancelDialog = this._cancelDialog.bind(this);
	}

	render() {
		return (
			<div>
				<Dialog
					hidden={this.state.hideDialog}
					onDismiss={this._cancelDialog}
					dialogContentProps={{
						type: DialogType.largeHeader,
						title: 'Share your crew roster',
						subText: 'Upload the crew list with their stats, allowing you to share the link with others online; maybe your fleet or on the forums / reddit to gather feedback.'
					}}
					modalProps={{
						isBlocking: false,
						containerClassName: 'sharedialogMainOverride'
					}}
				>
					<table style={{ width: '100%' }}>
						<tbody>
						<tr>
							<td style={{ verticalAlign: 'top' }}>
								<TextField
									label='Title:'
									value={this.state.title}
									onChanged={(value) => { this.setState({ title: value }) }}
								/>

								<TextField
									label='Description:'
									value={this.state.description}
									onChanged={(value) => { this.setState({ description: value }) }}
									multiline autoAdjustHeight
								/>
							</td>
							<td style={{ verticalAlign: 'top' }}>
							<Dropdown
								selectedKey={this.state.exportWhere}
								label='Where to export:'
								allowFreeform={false}
								autoComplete='on'
								options={[
									{ key: 'L', text: 'To local file' },
									{ key: 'O', text: 'Online' }
								]}
								onChanged={(item) => {
									this.setState({ exportWhere: item.key });
								}}
							/>

							<Dropdown
								selectedKey={this.state.exportType}
								label='Export format:'
								allowFreeform={false}
								autoComplete='on'
								options={[
									{ key: 'html', text: 'Formatted HTML' },
									{ key: 'json', text: 'Raw JSON' }
								]}
								onChanged={(item) => {
									this.setState({ exportType: item.key });
								}}
							/>

							{(this.state.exportType == 'html') &&
								<Dropdown
									selectedKey={this.state.htmlColorTheme}
									label='HTML color theme:'
									allowFreeform={false}
									autoComplete='on'
									options={this.htmlColorThemes.map(function (color) {
										return {
											key: color,
											text: color[0].toUpperCase() + color.substr(1),
											thumbnail: 'https://bootswatch.com/' + color + '/thumbnail.png'
										};
									})}
									onChanged={(item) => {
										this.setState({ htmlColorTheme: item.key });
									}}
									onRenderOption={(option) => <img src={option.thumbnail} height={80} />}
								/>
							}
							</td>
						</tr>
						</tbody>
					</table>

					<Checkbox
						label='Also share mission completion stats'
						checked={this.state.shareMissions}
						onChange={(ev, checked) => {
							this.setState({ shareMissions: checked });
						}}
					/>

					<Checkbox
						label='Export buyback (recently dismissed) crew'
						checked={this.state.exportBuyback}
						onChange={(ev, checked) => {
							this.setState({ exportBuyback: checked });
						}}
					/>

					<DialogFooter>
						<PrimaryButton onClick={this._closeDialog} text='Share' />
						<DefaultButton onClick={this._cancelDialog} text='Cancel' />
					</DialogFooter>
				</Dialog>
			</div>
		);
	}

	_showDialog(captainName) {
		this.setState({ hideDialog: false, title: captainName + '\'s crew' });
	}

	_closeDialog() {
		this.setState({ hideDialog: true });
		this.props.onShare({
			description: this.state.description,
			title: this.state.title,
			exportWhere: this.state.exportWhere,
			exportType: this.state.exportType,
			htmlColorTheme: this.state.htmlColorTheme,
			shareMissions: this.state.shareMissions,
			exportBuyback: this.state.exportBuyback,
		});
	}

	_cancelDialog() {
		this.setState({ hideDialog: true });
	}
}