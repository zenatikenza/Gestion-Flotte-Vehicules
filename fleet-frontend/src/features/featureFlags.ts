export interface FeatureFlags {
  gpsSimulatorEnabled: boolean
  geofencingAlertsEnabled: boolean
  maintenanceSignalEnabled: boolean
  darkModeEnabled: boolean
  advancedStatsEnabled: boolean
}

const STORAGE_KEY = 'fleet_feature_flags'

const DEFAULTS: FeatureFlags = {
  gpsSimulatorEnabled: true,
  geofencingAlertsEnabled: true,
  maintenanceSignalEnabled: true,
  darkModeEnabled: false,
  advancedStatsEnabled: false,
}

export function getFlags(): FeatureFlags {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function setFlag(key: keyof FeatureFlags, value: boolean): void {
  const current = getFlags()
  current[key] = value
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
}

export function resetFlags(): void {
  localStorage.removeItem(STORAGE_KEY)
}
