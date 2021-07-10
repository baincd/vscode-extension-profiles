export interface ProfileConfig {
	extensions: Array<string>
	disabledExtensions?: Array<string>,
	temporaryProfile?: boolean
}

export interface ProfilesConfig {
	[key: string]: ProfileConfig;
}

export interface Config {
	profiles: ProfilesConfig
	activeProfiles: Array<string>
	checkAllActiveProfileExtensionsAreEnabledOnStartup: boolean
}

export enum ProfileAction {
	ACTIVATE,
	DEACTIVATE,
	STARTUP,
	VIEW
}

export class ProfileRef {
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
