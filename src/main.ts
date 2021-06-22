import * as vscode from 'vscode';

///// Types
interface ProfileConfig {
	extensions: Array<string>
	disabledExtensions?: Array<string>
}

interface ProfilesConfig {
	[key: string]: ProfileConfig;
}

interface Config {
	profiles: ProfilesConfig
	activeProfiles: Array<string>
	checkAllActiveProfileExtensionsAreEnabledOnStartup: boolean
}

class ProfileRef {
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

///// activate method
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand("extension-profiles.active-profiles-setup",activeProfilesSetupCommand)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("extension-profiles.activate-profile",activateProfileCommand)
	);

	const config = getConfig();
	if (config.checkAllActiveProfileExtensionsAreEnabledOnStartup) {
		activeProfilesStartupCheck(config);
	}
}


///// Commands and Events
function activeProfilesStartupCheck(config: Config) {
	config.activeProfiles?.forEach(activeProfileName => {
		const activeProfileConfig = config.profiles[activeProfileName];
		if (!activeProfileConfig) {
			showActiveProfileDoesNotExistPopup(activeProfileName);
			return;
		}

		let extsNeedEnabled = activeProfileConfig.extensions.filter(extNotEnabled);
		if (extsNeedEnabled.length) {
			showExtsNeedEnabledPopup(extsNeedEnabled, activeProfileName);
		}

		let extsNeedDisabled = activeProfileConfig.disabledExtensions?.filter(extEnabled)
		if (extsNeedDisabled?.length) {
			showExtsNeedDisabledPopup(extsNeedDisabled, activeProfileName);
		}
	});
}


///// Configuration getters
function getConfig(): Config {
	return vscode.workspace.getConfiguration().get<Config>("extension-profiles")
		|| {
			activeProfiles: [],
			checkAllActiveProfileExtensionsAreEnabledOnStartup: false,
			profiles: {}
		};
}


///// Popup Messages
function showExtsNeedEnabledPopup(extsNeedEnabled: string[], profileName: string) {
	vscode.window.showWarningMessage("Profile '" + profileName + "': Not all extensions enabled", ENABLE_EXTENSIONS)
		.then(selected => {
			switch (selected) {
				case ENABLE_EXTENSIONS: viewExtensionsSearch(extsNeedEnabled, profileName, "enable"); break;
			}
		});
}
function showExtsNeedDisabledPopup(needToBeDisabledExts: string[], profileName: string) {
	vscode.window.showWarningMessage("Profile '" + profileName + "': extensions need to be DISABLED", DISABLE_EXTENSIONS)
		.then(selected => {
			if (selected == DISABLE_EXTENSIONS) {
				viewExtensionsSearch(needToBeDisabledExts, profileName, "disable");
			}
		});
}

function showActiveProfileDoesNotExistPopup(activeProfile: string) {
	vscode.window.showErrorMessage("Profile '" + activeProfile + "' Not Defined", DEFINE_PROFILE_NOW, DEACTIVATE_PROFILE)
		.then(selected => {
			switch (selected) {
				case DEFINE_PROFILE_NOW: viewExtensionProfilesSettings(); break;
				case DEACTIVATE_PROFILE: profileAction(activeProfile, false, false, true); break;
			}
		});
}


///// Filters
const extNotEnabled = (ext: string): boolean => !vscode.extensions.getExtension(ext);
const extEnabled = (ext: string): boolean => !!vscode.extensions.getExtension(ext);

////////////////////////////////////////////////////////////////


const DEFINE_PROFILE_NOW = "Define Profile Now";
const DEACTIVATE_PROFILE = "Deactivate Profile";
const ENABLE_EXTENSIONS = "Show Extensions to Enable";


const DISABLE_EXTENSIONS = "Show Extensions to Disable";

function activeProfilesSetupCommand() {
	let extProfiles: ProfileRef[] = getExtProfiles();

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
	let extProfiles: ProfileRef[] = [];

	Object.keys(config.get<any>("profiles")).forEach(key => extProfiles.push(new ProfileRef(key)));
	config.get<Array<string>>("activeProfiles")?.forEach(key => {
		let opt = extProfiles.find(opt => opt.name == key);
		if (opt) {
			opt.activated = true;
		} else {
			const newOpt = new ProfileRef(key);
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

function profileActionPicker(opt: ProfileRef) {
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


const showErrorSavingActiveProfilesError: ((reason: any) => void | Thenable<void>) | undefined = err => {
	vscode.window.showWarningMessage("Cannot save active extension profile: " + err);
};
function profileAction(profileName: string, activate: boolean, view: boolean, deactivate: boolean) {

	const config = getConfig();
	if (activate || deactivate) {
		let activeProfiles = config.activeProfiles;
		if (activate) {
			activeProfiles.push(profileName);
		} else if (deactivate) {
			activeProfiles = activeProfiles.filter(p => p != profileName);
		}
	
		vscode.workspace.getConfiguration("extension-profiles").update("activeProfiles", activeProfiles, vscode.ConfigurationTarget.Workspace)
			.then(undefined, showErrorSavingActiveProfilesError)
	}

	if (view) {
		const profileConfig = config.profiles[profileName];
		let extsNeedDisabled = !deactivate ? profileConfig.disabledExtensions : undefined;
		if (extsNeedDisabled?.length) {
			showExtsNeedDisabledPopup(extsNeedDisabled, profileName);
		}
		viewExtensionsSearch(profileConfig.extensions, profileName, "enable");
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
