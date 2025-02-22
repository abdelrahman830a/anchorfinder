
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
        refinedKeywords: string[];
    }
}

export type AnchorTextData = {
    anchorText: string;
    searchVolume: number;
    difficulty: string;
    bestFor: string;
};

export interface TopPage {
    top_keyword: string;
}

export interface TopPagesApiResponse {
    pages?: TopPage[];
}