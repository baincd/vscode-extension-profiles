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
	if (config.checkAllActiveProfileExtensionsAreEnabledOnStartup) {
		setTimeout(() => {startupCheck(config)}, MS_STARTUP_CHECK_DELAY);
	}
}
