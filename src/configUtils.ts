import * as vscode from 'vscode';

import { Config, ProfileRef } from "./types";

export function getConfig(): Config {
	return vscode.workspace.getConfiguration().get<Config>("extension-profiles")
		|| {
			activeProfiles: [],
			enableStartupCheck: false,
			profiles: {}
		};
}
export function getProfileRefs() {
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
