import * as vscode from 'vscode';

import { Config, ProfileRef } from "./types";

export function getConfig(): Config {
	return vscode.workspace.getConfiguration().get<Config>("extension-profiles")
		|| {
			activeProfiles: [],
			enableStartupCheck: false,
			listActiveProfilesFirst: true,
			profiles: {}
		};
}
export function getProfileRefs() {
	const config = getConfig();
	const activeProfileList: string[] = config.activeProfiles.slice(0);

	const topList: ProfileRef[] = [];
	const bottomList: ProfileRef[] = [];

	for (const profileName in config.profiles) {
		const isActive = findAndRemoveFromActiveProfileList(profileName);
		(!config.listActiveProfilesFirst || isActive ? topList : bottomList).push(createProfileRef(profileName, isActive, true));
	}

	activeProfileList.forEach(profileName => {
		topList.push(createProfileRef(profileName, true, false));
	});

	topList.push(...bottomList);
	return topList;

	function findAndRemoveFromActiveProfileList(profileName: string): boolean {
		const idx = activeProfileList.indexOf(profileName);
		if (idx < 0) {
			return false;
		}
		activeProfileList.splice(idx,1);
		return true;
	}

	function createProfileRef(name: string, isActive: boolean, exists: boolean) {
		const profileRef = new ProfileRef(name);
		profileRef.activated = isActive;
		profileRef.exists = exists;
		return profileRef;
	}


}
