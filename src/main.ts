import * as vscode from 'vscode';

///// Global Constants
const DEFINE_PROFILE_NOW = "Define Profile Now";
const DEACTIVATE_PROFILE = "Deactivate Profile";
const ENABLE_EXTENSIONS = "Show Extensions to Enable";
const DISABLE_EXTENSIONS = "Show Extensions to Disable";


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

enum ProfileAction {
	ACTIVATE,
	DEACTIVATE,
	STARTUP,
	VIEW
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
		} else {
			profileAction(activeProfileName, ProfileAction.STARTUP);
		}
	});
}

function activeProfilesSetupCommand() {
	let profileRefs: ProfileRef[] = getProfileRefs();

	if (profileRefs.length == 0) {
		showNoProfilesDefinedPopup();
		return;
	}

	vscode.window.showQuickPick(profileRefs.map(opt => opt.displayName()))
		.then(selectedDisplayName => {
			profileSelectedAction(profileRefs.find(opt => opt.displayName() == selectedDisplayName))
		}
	)
}


function profileSelectedAction(opt?: ProfileRef) {
	if (!opt) {
		return;
	}
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
				case viewAction: profileAction(opt.name, ProfileAction.VIEW); break;
				case activateAction: profileAction(opt.name, ProfileAction.ACTIVATE); break;
				case deactivateAction: profileAction(opt.name, ProfileAction.DEACTIVATE); break;
			}
		})
}

function activateProfileCommand(profileName: string) {
	const config = getConfig();

	if (config.activeProfiles?.find(p => p == profileName)) {
		vscode.window.showInformationMessage("Profile '" + profileName + "' is already active");
		return;
	}

	if (!config.profiles[profileName]) {
		vscode.window.showErrorMessage("Profile '" + profileName + "' is not defined");
		return;
	}

	profileAction(profileName, ProfileAction.ACTIVATE);
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
function getProfileRefs() {
	const config = getConfig();
	let profileRefs: ProfileRef[] = [];

	Object.keys(config.profiles).forEach(profileName => profileRefs.push(new ProfileRef(profileName)));
	config.activeProfiles?.forEach(activeProfileName => {
		let matchingProfileRef = profileRefs.find(p => p.name == activeProfileName);
		if (matchingProfileRef) {
			matchingProfileRef.activated = true;
		} else {
			const newProfileRef = new ProfileRef(activeProfileName);
			newProfileRef.exists = false;
			newProfileRef.activated = true;
			profileRefs.push(newProfileRef);
		}
	});

	profileRefs.sort((a, b) => {
		if (a.activated && !b.activated) {
			return -1;
		} else if (!a.activated && b.activated) {
			return 1;
		} else {
			return a.name.localeCompare(b.name);
		}
	});
	return profileRefs;
}


///// Sidebar and editor actions
function showSettings() {
	vscode.commands.executeCommand("workbench.action.openSettings", "extension-profiles.profiles");
}


///// Popup Messages
function showExtsNeedEnabledPopup(extsNeedEnabled: string[], profileName: string) {
	vscode.window.showWarningMessage("Profile '" + profileName + "': extensions need to be enabled", ENABLE_EXTENSIONS)
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
function showProfileActionCompletedPopup(profileName: string, msg: string) {
	vscode.window.showInformationMessage(msg, "View extensions in profile")
	.then(selected => {
		if (selected) {
			profileAction(profileName, ProfileAction.VIEW);
		}
	})
}
function showActiveProfileDoesNotExistPopup(activeProfile: string) {
	vscode.window.showErrorMessage("Profile '" + activeProfile + "' Not Defined", DEFINE_PROFILE_NOW, DEACTIVATE_PROFILE)
		.then(selected => {
			switch (selected) {
				case DEFINE_PROFILE_NOW: showSettings(); break;
				case DEACTIVATE_PROFILE: profileAction(activeProfile, ProfileAction.DEACTIVATE); break;
			}
		});
}
function showNoProfilesDefinedPopup() {
	vscode.window.showErrorMessage("No profiles defined!", "Define profiles now")
		.then(btnPressed => {
			if (btnPressed) {
				showSettings();
			}
		});
}
function showErrorSavingActiveProfilesError(err: string) {
	vscode.window.showWarningMessage("Cannot save active extension profile: " + err);
}



///// Filters
const extNotEnabled = (ext: string): boolean => !vscode.extensions.getExtension(ext);
const extEnabled = (ext: string): boolean => !!vscode.extensions.getExtension(ext);

///// The Engine Room

//                  exts                     disabledExts            Notes
// ACTIVATE         sidebar(need to enable)  popup(need to disable)  If nothing displayed, info popup
// STARTUP          popup(need to enable)    popup(need to disable)
// VIEW             sidebar(all)             popup(all)
// DEACTIVATE       (none)                   (none)                  Info Popup
function profileAction(profileName: string, action: ProfileAction, config: Config = getConfig()) {
	if (action == ProfileAction.ACTIVATE || action == ProfileAction.DEACTIVATE) {
		let activeProfiles = config.activeProfiles;
		if (action == ProfileAction.ACTIVATE) {
			activeProfiles.push(profileName);
		} else if (action == ProfileAction.DEACTIVATE) {
			activeProfiles = activeProfiles.filter(p => p != profileName);
		}
	
		vscode.workspace.getConfiguration("extension-profiles").update("activeProfiles", activeProfiles, vscode.ConfigurationTarget.Workspace)
			.then(undefined, showErrorSavingActiveProfilesError)
	}

	let extsNeedEnabled: Array<string>;
	let extsNeedDisabled: Array<string>;
	const profileConfig = config.profiles[profileName];

	if (action == ProfileAction.ACTIVATE || action == ProfileAction.STARTUP) {
		extsNeedEnabled = profileConfig.extensions.filter(extNotEnabled);
		extsNeedDisabled = profileConfig.disabledExtensions?.filter(extEnabled) || [];
	} else if (action == ProfileAction.VIEW) {
		extsNeedEnabled = profileConfig.extensions;
		extsNeedDisabled = profileConfig.disabledExtensions || [];
	} else {
		extsNeedEnabled = [];
		extsNeedDisabled = [];
	}

	if (extsNeedEnabled.length) {
		if (action == ProfileAction.STARTUP) {
			showExtsNeedEnabledPopup(extsNeedEnabled, profileName);
		} else {
			viewExtensionsSearch(profileConfig.extensions, profileName, "enable");
		}
	}
	if (extsNeedDisabled.length) {
		showExtsNeedDisabledPopup(extsNeedDisabled, profileName);
	}
	if (!extsNeedEnabled.length && !extsNeedDisabled.length) {
		if (action == ProfileAction.ACTIVATE) {
			showProfileActionCompletedPopup(profileName, "Profile '" + profileName + "' activated - no extensions need to be enabled or disabled");
		} else if (action == ProfileAction.DEACTIVATE) {
			showProfileActionCompletedPopup(profileName, "Profile '" + profileName + "' deactivated");
		}
	}

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

