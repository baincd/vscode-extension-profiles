import * as vscode from 'vscode';

import * as actions from './actions'
import { ProfileAction } from "./types";

const DEFINE_PROFILE_NOW = "Define Profile Now";
const VIEW_PROFILE = "View Extensions in Profile";
const DEACTIVATE_PROFILE = "Deactivate Profile";
const ENABLE_EXTENSIONS = "Show Extensions to Enable";
const DISABLE_EXTENSIONS = "Show Extensions to Disable";
const SET_SETTINGS = "Show Settings to Configure";


function showSettings() {
	vscode.commands.executeCommand("workbench.action.openSettings", "extension-profiles.profiles");
}


export function showExtsNeedEnabledPopup(extsNeedEnabled: string[], profileName: string) {
	vscode.window.showWarningMessage("Profile '" + profileName + "': extensions need to be enabled", ENABLE_EXTENSIONS)
		.then(selected => {
			switch (selected) {
				case ENABLE_EXTENSIONS: showExtensionsSearch(extsNeedEnabled, profileName, "enable"); break;
			}
		});
}
export function showExtsNeedDisabledPopup(needToBeDisabledExts: string[], profileName: string) {
	vscode.window.showWarningMessage("Profile '" + profileName + "': extensions need to be DISABLED", DISABLE_EXTENSIONS)
		.then(selected => {
			if (selected == DISABLE_EXTENSIONS) {
				showExtensionsSearch(needToBeDisabledExts, profileName, "disable");
			}
		});
}
export function showSettingsNeedSetPopup(settingsNeedSet: { [key: string]: any; }, profileName: string) {
	vscode.window.showWarningMessage("Profile '" + profileName + "': settings need to be configured on the workspace", SET_SETTINGS)
		.then(selected => {
			if (selected == SET_SETTINGS) {
				showSettingsNeedToBeSet(settingsNeedSet, profileName);
			}
		});
}

export function showProfileActionCompletedPopup(profileName: string, msg: string, viewBtn: boolean = true) {
	if (!viewBtn) {
		vscode.window.showInformationMessage(msg);
	} else {
		vscode.window.showInformationMessage(msg, VIEW_PROFILE)
		.then(selected => {
			if (selected) {
				actions.profileAction(profileName, ProfileAction.VIEW);
			}
		})
	}
}
export function showActiveProfileDoesNotExistPopup(activeProfile: string) {
	vscode.window.showErrorMessage("Profile '" + activeProfile + "' Not Defined", DEFINE_PROFILE_NOW, DEACTIVATE_PROFILE)
		.then(selected => {
			switch (selected) {
				case DEFINE_PROFILE_NOW: showSettings(); break;
				case DEACTIVATE_PROFILE: actions.profileAction(activeProfile, ProfileAction.DEACTIVATE); break;
			}
		});
}
export function showNoProfilesDefinedPopup() {
	vscode.window.showErrorMessage("No profiles defined!", "Define profiles now")
		.then(btnPressed => {
			if (btnPressed) {
				showSettings();
			}
		});
}
export function showErrorSavingActiveProfilesPopup(err: string) {
	vscode.window.showErrorMessage("Cannot save active extension profile: " + err);
}

export function showExtensionsSearch(extensionIds: string[], profileName: string, extDisposition: "enable"|"disable") {
	doExtensionSearch(extensionIds.join(" "));

	function doExtensionSearch(fullExtSearchStr: string) {
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
					doExtensionSearch(rolloverSearchStr);
				}
			})
		}
	}
}

export function showTemporaryProfileIsActivePopup(profileName: string) {
	vscode.window.showWarningMessage("Temporary Profile '" + profileName + "' is active", DEACTIVATE_PROFILE, VIEW_PROFILE).then(
		selectedBtn => {
			switch (selectedBtn) {
				case DEACTIVATE_PROFILE: actions.profileAction(profileName, ProfileAction.DEACTIVATE); break;
				case VIEW_PROFILE: actions.profileAction(profileName, ProfileAction.VIEW); break;
				default: actions.profileAction(profileName, ProfileAction.STARTUP); break;
			}
		}
	)
}

export async function showSettingsNeedToBeSet(settingsNeedSet: { [key: string]: any; }, profileName: string) {
	// Disable opening workplace settings
	// await vscode.commands.executeCommand("workbench.action.openWorkspaceSettingsFile");
	// await vscode.commands.executeCommand("workbench.action.newGroupRight");
	const doc = await vscode.workspace.openTextDocument({content: "// Profile '" + profileName + "' needs the following settings configured for the workspace (or all workspace folders):\n" + JSON.stringify(settingsNeedSet,null,2), language: "jsonc"});
	await vscode.window.showTextDocument(doc);
}
