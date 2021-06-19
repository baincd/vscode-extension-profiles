import * as vscode from 'vscode';

class ProfileQuickPickOption {
	name: string;
	enabled = false;
	exists = true;
	constructor(name: string) {
		this.name = name;
	}
	displayName() {
		return (this.enabled ? "(Active) " : "") + this.name + (!this.exists ? " (Profile Not Defined)" : "") ;
	}
}

function activeProfilesSetup() {
	const config = vscode.workspace.getConfiguration("extension-profiles");
	let options: ProfileQuickPickOption[] = [];

	Object.keys(config.get<any>("profiles")).forEach(key => options.push(new ProfileQuickPickOption(key)));
	config.get<Array<string>>("activeProfiles")?.forEach(key => {
		let opt = options.find(opt => opt.name == key);
		if (opt) {
			opt.enabled = true;
		} else {
			const newOpt = new ProfileQuickPickOption(key);
			newOpt.exists = false;
			newOpt.enabled = true;
			options.push(newOpt)
		}
	});

	options.sort((a,b) => {
		if (a.enabled && !b.enabled) {
			return -1;
		} else if (!a.enabled && b.enabled) {
			return 1;
		} else {
			return a.name.localeCompare(b.name,);
		}
	})

	if (options.length == 0) {
		vscode.window.showErrorMessage("No profiles defined!","Define profiles now")
			.then(btnPressed => { 
				if (btnPressed) {
					vscode.commands.executeCommand("workbench.action.openSettings", "extension-profiles.profiles")
				}
			}
		)
		return;
	}


	vscode.window.showQuickPick(options.map(opt => opt.displayName()))
		.then(selectedDisplayName => {
			if (selectedDisplayName) {
				vscode.window.showInformationMessage(options.find(opt => opt.displayName() == selectedDisplayName)?.name + "");
			}
		}
	)
}

export function activate(context: vscode.ExtensionContext) {
	vscode.commands.registerCommand("extension-profiles.active-profiles-setup",activeProfilesSetup);
}
