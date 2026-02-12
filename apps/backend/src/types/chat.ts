// ─── Collected Info from visitor ─────────────────────────────────────────────

export interface CollectedInfo {
    name?: string;
    email?: string;
    reason?: string;
    phone?: string;
}

// ─── AI Service ──────────────────────────────────────────────────────────────

export interface AIResponseOptions {
    detectHumanNeed?: boolean;
    collectedInfo?: CollectedInfo;
}

export interface AIResponseResult {
    response: string;
    needsHuman: boolean;
    extractedInfo: CollectedInfo;
}
