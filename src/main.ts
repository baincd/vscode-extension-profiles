import * as vscode from 'vscode';

class ExtProfile {
	name: string;
	activated = false;
	exists = true;
	constructor(name: string) {
		this.name = name;
	}
	displayName() {
		return (this.activated ? "(Active) " : "") + this.name + (!this.exists ? " (PROFILE NOT DEFINED)" : "") ;
	}
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand("extension-profiles.active-profiles-setup",activeProfilesSetupCommand)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("extension-profiles.activate-profile",activateProfileCommand)
	);

	const config = vscode.workspace.getConfiguration("extension-profiles");
	if (config.get<boolean>("checkAllActiveProfileExtensionsAreEnabledOnStartup")) {
		activeProfilesStartupCheck(config);
	}
}

const DEFINE_PROFILE_NOW = "Define Profile Now";
const DEACTIVATE_PROFILE = "Deactivate Profile";
const ENABLE_EXTENSIONS = "Show Extensions to Enable";
function activeProfilesStartupCheck(config: vscode.WorkspaceConfiguration) {
	config.get<Array<string>>("activeProfiles")?.forEach(activeProfile => {
		const profileConfig = config.get<any>("profiles")[activeProfile];
		if (!profileConfig) {
			vscode.window.showErrorMessage("Profile '" + activeProfile + "' Not Defined", DEFINE_PROFILE_NOW, DEACTIVATE_PROFILE)
				.then(selected => {
					switch(selected) {
						case DEFINE_PROFILE_NOW: viewExtensionProfilesSettings(); break;
						case DEACTIVATE_PROFILE: profileAction(activeProfile, false, false, true); break;
					}
				})
			return;
		}

		let activeProfileExts = profileConfig["extensions"] as Array<string>;
		let nonEnabledExts = activeProfileExts.filter(ext => !vscode.extensions.getExtension(ext));
		if (nonEnabledExts.length) {
			vscode.window.showWarningMessage("Profile '" + activeProfile + "': Not all extensions enabled", ENABLE_EXTENSIONS)
				.then(selected => {
					switch(selected) {
						case ENABLE_EXTENSIONS: viewExtensionsSearch(nonEnabledExts, activeProfile, "enable"); break;
					}
				})
		}

		popupActiveProfileDisabledExts(profileConfig["disabledExtensions"] as Array<string>|undefined , activeProfile);

	});
}

const DISABLE_EXTENSIONS = "Show Extensions to Disable";
function popupActiveProfileDisabledExts(activeProfileDisabledExts: Array<string>|undefined, activeProfile: string) {
	if (!activeProfileDisabledExts) {
		return;
	}
	let needToBeDisabledExts = activeProfileDisabledExts.filter(ext => vscode.extensions.getExtension(ext));
	if (needToBeDisabledExts.length) {
		vscode.window.showWarningMessage("Profile '" + activeProfile + "': extensions need to be DISABLED",DISABLE_EXTENSIONS)
		.then(selected => {
			if (selected == DISABLE_EXTENSIONS) {
				viewExtensionsSearch(needToBeDisabledExts, activeProfile, "disable");
			}
		})
	}
}

function activeProfilesSetupCommand() {
	let extProfiles: ExtProfile[] = getExtProfiles();

	if (extProfiles.length == 0) {
		vscode.window.showErrorMessage("No profiles defined!","Define profiles now")
			.then(btnPressed => { 
				if (btnPressed) {
					viewExtensionProfilesSettings();
				}
			}
		)
		return;
	}


	vscode.window.showQuickPick(extProfiles.map(opt => opt.displayName()))
		.then(selectedDisplayName => {
			if (selectedDisplayName) {
				const selectedOpt = extProfiles.find(opt => opt.displayName() == selectedDisplayName);
				if (selectedOpt) {
					profileActionPicker(selectedOpt)
				}
			}
		}
	)
}

function getExtProfiles() {
	const config = vscode.workspace.getConfiguration("extension-profiles");
	let extProfiles: ExtProfile[] = [];

	Object.keys(config.get<any>("profiles")).forEach(key => extProfiles.push(new ExtProfile(key)));
	config.get<Array<string>>("activeProfiles")?.forEach(key => {
		let opt = extProfiles.find(opt => opt.name == key);
		if (opt) {
			opt.activated = true;
		} else {
			const newOpt = new ExtProfile(key);
			newOpt.exists = false;
			newOpt.activated = true;
			extProfiles.push(newOpt);
		}
	});

	extProfiles.sort((a, b) => {
		if (a.activated && !b.activated) {
			return -1;
		} else if (!a.activated && b.activated) {
			return 1;
		} else {
			return a.name.localeCompare(b.name);
		}
	});
	return extProfiles;
}

function profileActionPicker(opt: ExtProfile) {
	let viewAction = "View extensions in " + opt.name + " profile";
	let activateAction = "Activate " + opt.name + " profile";
	let deactivateAction = "Deactivate " + opt.name + " profile";

	let actionOptions: string[] = [];

	if (opt.exists && !opt.activated) {
		actionOptions.push(activateAction);
	}
	if (opt.exists) {
		actionOptions.push(viewAction);
	}
	if (opt.activated) {
		actionOptions.push(deactivateAction);
	}

	vscode.window.showQuickPick(actionOptions)
		.then(selectedAction => {
			switch(selectedAction) {
				case viewAction: profileAction(opt.name, false, opt.exists, false); break;
				case activateAction: profileAction(opt.name, true, opt.exists, false); break;
				case deactivateAction: profileAction(opt.name, false, opt.exists, true); break;
			}
		})
}

function profileAction(profileName: string, activate: boolean, view: boolean, deactivate: boolean) {

	const config = vscode.workspace.getConfiguration("extension-profiles");
	if (activate || deactivate) {
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
		const profileConfig = vscode.workspace.getConfiguration("extension-profiles.profiles").get<any>(profileName);
		if (!deactivate) {
			popupActiveProfileDisabledExts(profileConfig["disabledExtensions"] as Array<string>|undefined , profileName);
		}
		const extensions = profileConfig["extensions"] as Array<string>;
		viewExtensionsSearch(extensions, profileName, "enable");
	}
}

function viewExtensionProfilesSettings() {
	vscode.commands.executeCommand("workbench.action.openSettings", "extension-profiles.profiles");
}

function viewExtensionsSearch(extensionIds: string[], profileName: string, extDisposition: "enable"|"disable") {
	doDisplayExtensionSearch(extensionIds.join(" "));

	function doDisplayExtensionSearch(fullExtSearchStr: string) {
		let extSearchStr = fullExtSearchStr;
		let rolloverSearchStr = "";
		if (fullExtSearchStr.length > 200) {
			[, extSearchStr, rolloverSearchStr] = /^(.{0,200})(?: (.*))?$/.exec(fullExtSearchStr) || [];
		}
		vscode.commands.executeCommand("workbench.extensions.search", extSearchStr);
		if (rolloverSearchStr) {
			vscode.window.showWarningMessage("Profile '" + profileName + "': More extensions to " + extDisposition, "View Extensions to " + extDisposition.charAt(0).toUpperCase() + extDisposition.slice(1))
			.then(selected => {
				if (selected) {
					doDisplayExtensionSearch(rolloverSearchStr);
				}
			})
		}
	}
}




function activateProfileCommand(profileName: string) {
	const config = vscode.workspace.getConfiguration("extension-profiles");

	if (config.get<Array<string>>("activeProfiles")?.find(p => p == profileName)) {
		vscode.window.showInformationMessage("Profile '" + profileName + "' is already active");
		return;
	}

	if (!config.get<any>("profiles")[profileName]) {
		vscode.window.showErrorMessage("Profile '" + profileName + "' is not defined");
		return;
	}

	profileAction(profileName, true, true, false);
	vscode.window.showInformationMessage("Profile '" + profileName + "' activated");
}
