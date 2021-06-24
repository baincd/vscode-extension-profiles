import * as vscode from 'vscode';

import * as actions from './actions'
import { ProfileAction } from "./types";

const DEFINE_PROFILE_NOW = "Define Profile Now";
const DEACTIVATE_PROFILE = "Deactivate Profile";
const ENABLE_EXTENSIONS = "Show Extensions to Enable";
const DISABLE_EXTENSIONS = "Show Extensions to Disable";



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
export function showProfileActionCompletedPopup(profileName: string, msg: string, viewBtn: boolean = true) {
	if (!viewBtn) {
		vscode.window.showInformationMessage(msg);
	} else {
		vscode.window.showInformationMessage(msg, "Show Profile Extensions")
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
