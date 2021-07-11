import * as vscode from 'vscode';

import * as ui from './ui'
import * as configUtils from './configUtils'

import { Config, ProfileAction, ProfileRef } from "./types";

export function startupCheck(config: Config) {
	config.activeProfiles?.forEach(activeProfileName => {
		const activeProfileConfig = config.profiles[activeProfileName];
		if (!activeProfileConfig) {
			ui.showActiveProfileDoesNotExistPopup(activeProfileName);
		} else if (activeProfileConfig.temporaryProfile) {
			ui.showTemporaryProfileIsActivePopup(activeProfileName);
		} else {
			profileAction(activeProfileName, ProfileAction.STARTUP);
		}
	});
}

export function activeProfilesSetupCommand() {
	let profileRefs: ProfileRef[] = configUtils.getProfileRefs();

	if (profileRefs.length == 0) {
		ui.showNoProfilesDefinedPopup();
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

export function activateProfileCommand(profileName: string) {
	const config = configUtils.getConfig();

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

const extNotEnabled = (ext: string): boolean => !vscode.extensions.getExtension(ext);
const extEnabled = (ext: string): boolean => !!vscode.extensions.getExtension(ext);
function settingSetForWorkspace(settingKey: string): boolean {
	if (vscode.workspace.getConfiguration().inspect(settingKey)?.workspaceValue !== undefined) {
		return true;
	} else if (!vscode.workspace.workspaceFolders) {
		return false;
	} else {
		return vscode.workspace.workspaceFolders
			.map(f => vscode.workspace.getConfiguration(undefined,f.uri).inspect(settingKey)?.workspaceFolderValue !== undefined)
			.reduce((p,c) => p && c);
	}
}


//                  exts                        disabledExts                  Settings                  Notes
// ACTIVATE         sidebar(exts.needToEnable)  popup(disExts.needToDisable)  display(settings.notSet)  If nothing displayed, info popup
// STARTUP          popup(exts.needToEnable)    popup(disExts.needToDisable)  popup(settings.notSet)  
// VIEW             sidebar(exts)               popup(disExts)                display(settings)         
// DEACTIVATE       (none)                      (none)                                                  Info Popup
export function profileAction(profileName: string, action: ProfileAction, config: Config = configUtils.getConfig()) {
	if (action == ProfileAction.ACTIVATE || action == ProfileAction.DEACTIVATE) {
		let activeProfiles = config.activeProfiles;
		if (action == ProfileAction.ACTIVATE) {
			activeProfiles.push(profileName);
		} else if (action == ProfileAction.DEACTIVATE) {
			activeProfiles = activeProfiles.filter(p => p != profileName);
		}
	
		vscode.workspace.getConfiguration("extension-profiles").update("activeProfiles", activeProfiles, vscode.ConfigurationTarget.Workspace)
			.then(undefined, ui.showErrorSavingActiveProfilesPopup)
	}

	const profileConfig = config.profiles[profileName];
	if (action == ProfileAction.DEACTIVATE) {
		ui.showProfileActionCompletedPopup(profileName, "Profile '" + profileName + "' deactivated", profileConfig != undefined);
		return;
	}

	const isViewAction = action == ProfileAction.VIEW;
	let extsNeedEnabled: Array<string> = (isViewAction ? profileConfig.extensions : profileConfig.extensions.filter(extNotEnabled));
	let extsNeedDisabled: Array<string> = (isViewAction ? profileConfig.disabledExtensions : profileConfig.disabledExtensions?.filter(extEnabled)) || [];
	let settingsNeedSet:{ [key: string]: any; } = (isViewAction ? profileConfig.settings : filterNotSetInWorkspace(profileConfig.settings)) || {};

	if (extsNeedEnabled.length) {
		if (action == ProfileAction.STARTUP) {
			ui.showExtsNeedEnabledPopup(extsNeedEnabled, profileName);
		} else {
			ui.showExtensionsSearch(extsNeedEnabled, profileName, "enable");
		}
	}

	if (Object.keys(settingsNeedSet).length) {
		if (action == ProfileAction.STARTUP) {
			ui.showSettingsNeedSetPopup(settingsNeedSet, profileName);
		} else {
			ui.showSettingsNeedToBeSet(settingsNeedSet, profileName);
		}
	}
	if (extsNeedDisabled.length) {
		ui.showExtsNeedDisabledPopup(extsNeedDisabled, profileName);
	}
	if (!extsNeedEnabled.length && !extsNeedDisabled.length) {
		if (action == ProfileAction.ACTIVATE) {
			ui.showProfileActionCompletedPopup(profileName, "Profile '" + profileName + "' activated - no extensions need to be enabled or disabled");
		}
	}

}

function filterNotSetInWorkspace(profileSettings: { [key: string]: any; } | undefined): { [key: string]: any; } | undefined {
	if (!profileSettings) {
		return;
	}
	const notSetSettings:{ [key: string]: any; } = {};
	Object.keys(profileSettings).forEach(settingKey => {
		if (!settingSetForWorkspace(settingKey)) {
			notSetSettings[settingKey] = unproxy(profileSettings[settingKey]); // settings are wrapped in a Proxy, which doesn't work right with JSON.stringify, so need to unproxy value
		}
	})
	return notSetSettings;
}

function unproxy(original: any): any {
	if (typeof original != "object") {
		return original;
	} else {
		const unproxied: { [key: string]: any; } = {};
		Object.keys(original).forEach(originalKey => {
			unproxied[originalKey] = unproxy(original[originalKey]);
		})
		return unproxied;
	}
}
