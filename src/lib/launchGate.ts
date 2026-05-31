const launchGateEnabledValue = process.env.NEXT_PUBLIC_LAUNCH_GATE_ENABLED;
const launchAtValue = process.env.NEXT_PUBLIC_LAUNCH_AT;

export type LaunchGateStatus = {
    isLocked: boolean;
    isConfigured: boolean;
    launchAt: string | null;
    launchAtMs: number | null;
};

export function getLaunchGateStatus(now = new Date()): LaunchGateStatus {
    const isEnabled = launchGateEnabledValue === "true";

    if (!launchAtValue) {
        return {
            isLocked: isEnabled,
            isConfigured: false,
            launchAt: null,
            launchAtMs: null,
        };
    }

    const launchAtMs = Date.parse(launchAtValue);
    if (!Number.isFinite(launchAtMs)) {
        return {
            isLocked: isEnabled,
            isConfigured: false,
            launchAt: null,
            launchAtMs: null,
        };
    }

    return {
        isLocked: now.getTime() < launchAtMs,
        isConfigured: true,
        launchAt: launchAtValue,
        launchAtMs,
    };
}

export function isLaunchGateLocked(now = new Date()) {
    return getLaunchGateStatus(now).isLocked;
}
