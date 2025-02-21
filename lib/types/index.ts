export type Data = {
    anchorTexts?: AnchorTextsResult | string;
    metrics?: {
        keywordCount?: number;
        // Add other specific metric properties here
    };
    error?: string;
    keywordCount?: number;
};

export interface AnchorTextSuggestion {
    type?: string;
    text: string;
    searchVolume: string;
    difficulty: string;
}

export interface AnchorTextsResult {
    primary?: AnchorTextSuggestion;
    alternatives?: AnchorTextSuggestion[];
}

export interface ResultType {
    anchorTexts: AnchorTextsResult | string;
    metrics: {
        keywordCount: number;
        // You can extend this with additional metrics if needed
    };
}