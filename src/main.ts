import { deprecate } from 'util';
import * as vscode from 'vscode';

import { activeProfilesSetupCommand, activateProfileCommand, startupCheck } from "./actions";
import { getConfig } from './configUtils';

const MS_STARTUP_CHECK_DELAY = 250;

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand("extension-profiles.active-profiles-setup",activeProfilesSetupCommand)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("extension-profiles.activate-profile",activateProfileCommand)
	);

	const config = getConfig();
	if (config.enableStartupCheck) {
		setTimeout(() => {startupCheck(config)}, MS_STARTUP_CHECK_DELAY);
	}

	deprecatedSettingsCheck();
}


function deprecatedSettingsCheck() {
	if (vscode.workspace.getConfiguration().has("extension-profiles.checkAllActiveProfileExtensionsAreEnabledOnStartup")) { // Added 1.3.0 July 2021
		vscode.window.showWarningMessage("Setting extension-profiles.checkAllActiveProfileExtensionsAreEnabledOnStartup has been renamed as extension-profiles.enableStartupCheck.  Please update your settings.");
	}
}
