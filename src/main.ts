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
				const selectedOpt = options.find(opt => opt.displayName() == selectedDisplayName);
				if (selectedOpt) {
					profileActionPicker(selectedOpt)
				}
			}
		}
	)
}

function profileActionPicker(opt: ProfileQuickPickOption) {
	let viewAction = "View extensions in " + opt.name + " profile";
	let activateAction = "Activate " + opt.name + " profile";
	let deactivateAction = "Deactivate " + opt.name + " profile";

	let options: string[] = [];

	if (opt.exists && !opt.enabled) {
		options.push(activateAction);
	}
	if (opt.exists) {
		options.push(viewAction);
	}
	if (opt.enabled) {
		options.push(deactivateAction);
	}

	vscode.window.showQuickPick(options)
		.then(selectedOption => {
			switch(selectedOption) {
				case viewAction: profileAction(opt.name, false, opt.exists, false); break;
				case activateAction: profileAction(opt.name, true, opt.exists, false); break;
				case deactivateAction: profileAction(opt.name, false, opt.exists, true); break;
			}
		})
}

function profileAction(profileName: string, activate: boolean, view: boolean, deactivate: boolean) {

	if (activate || deactivate) {
		const config = vscode.workspace.getConfiguration("extension-profiles");
		let activeProfiles = config.get<Array<string>>("activeProfiles") || [];
		if (activate) {
			activeProfiles.push(profileName);
		} else if (deactivate) {
			activeProfiles = activeProfiles.filter(p => p != profileName);
		}
	

		config.update("activeProfiles", activeProfiles, vscode.ConfigurationTarget.Workspace)
			.then(undefined, err => {
				vscode.window.showWarningMessage("Cannot save active extension profile: " + err);        
			})
	}

	if (view) {
		const extensions = vscode.workspace.getConfiguration("extension-profiles.profiles").get<any>(profileName)["extensions"] as Array<string>;
		vscode.commands.executeCommand("workbench.extensions.search",extensions.join(" "));
	}
}

export function activate(context: vscode.ExtensionContext) {
	vscode.commands.registerCommand("extension-profiles.active-profiles-setup",activeProfilesSetup);
}
