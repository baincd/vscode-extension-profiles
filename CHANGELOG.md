# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.2] - 2021-11-07
### Updated
- Settings examples

## [1.3.1] - 2021-07-17
### Updated
- List profiles in \"Active Profiles Setup\" quick pick list in same order as configured in settings
- New setting to enable/disable listing active profiles first in \"Active Profiles Setup\" quick pick list (default to enabled)

## [1.3.0] - 2021-07-11
### Added
- Ability to configure a profile as temporary
- Ability to define settings on a profile that must be set on workspace or all workspace root folders
### Changed
- Change extension display name to Extension Profiles 3000

## [1.2.0] - 2021-06-24
### Changed
- Break extension searches into batches of no more than 200 characters, and display a popup prompt if there are additional extensions to display
- Reworded some messages and buttons to improve clarity
- Refactored extension internals
- Use webpack to bundle extension

## [1.1.1] - 2021-06-20
### Fixed
- Numbering of steps in README

## [1.1.0] - 2021-06-20
### Added
- Ability to configure extensions that should be disabled for a profile

## [1.0.0] - 2021-06-19
### Added
- Configuration settings to define profiles, activated profiles, and startup check enablement
- Command to enable, disable, or view profiles
- Startup check to confirm all active profile extensions are enabled
- Command that can be configured to a keyboard shortcut to enable a specific profile
- Warning if extension sidebar search exceeds the 200 character limit
