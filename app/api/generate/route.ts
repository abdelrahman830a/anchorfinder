/* eslint-disable @typescript-eslint/no-explicit-any */
import { TopPagesApiResponse } from "@/lib/types";
import { formattedDate } from "@/lib/utils/timeFormatter";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { targetUrl, topic } = body;

    if (!targetUrl) {
        return NextResponse.json({ error: "Target URL is required" }, { status: 400 });
    }
    // Options for Ahrefs API calls.
    const options = {
        method: "GET",
        headers: {
            Accept: "application/json, application/xml",
            Authorization: `Bearer ${process.env.AHREFS_API_KEY}`,
        },
    };

    // 1️⃣ Fetch organic keywords for the target URL.
    const organicKeywordsUrl = `https://api.ahrefs.com/v3/site-explorer/organic-keywords?target=${encodeURIComponent(
        targetUrl
    )}&country=de&limit=100&select=keyword,volume,keyword_difficulty&date=${formattedDate}&token=${process.env.AHREFS_API_KEY}`;


    try {
        const ahrefsResponse = await fetch(organicKeywordsUrl, options);


        if (!ahrefsResponse.ok) {
            const errorBody = await ahrefsResponse.text();
            console.error("Ahrefs API Error:", {
                status: ahrefsResponse.status,
                url: organicKeywordsUrl,
                error: errorBody,
            });
            throw new Error(`Ahrefs API Error: ${ahrefsResponse.statusText}`);
        }

        const ahrefsData = await ahrefsResponse.json();
        // Try to get keywords from either 'data' or 'keywords' property.
        const keywordResults: any[] = ahrefsData.keywords || ahrefsData.data || [];


        // 2️⃣ Filter keywords:
        const filteredKeywords = keywordResults.filter((k) => {
            const vol = Number(k.volume);
            const kd = Number(k.keyword_difficulty);
            // const keyword = (k.keyword || "").toLowerCase();
            return vol >= 50 && kd < 50;
        });


        // Combine the filtered keywords with their volume and difficulty.
        const refinedKeywordsRawData = filteredKeywords.map((k) => ({
            keyword: k.keyword,
            volume: Number(k.volume),
            difficulty: Number(k.keyword_difficulty),
        }));

        const refinedKeywordsData = JSON.stringify(refinedKeywordsRawData);

        console.log("Refined Keywords Data:", refinedKeywordsData);

        let refinedKeywords: string[] = filteredKeywords.map((k) => k.keyword);
        console.log("Refined SEO Metric Keywords:", refinedKeywords);

        // 3️⃣ If no organic keywords are found, fetch competitor keywords.
        if (refinedKeywords.length === 0) {
            console.warn("No organic keywords found meeting criteria. Fetching competitor keywords.");

            // Build the Top Pages API URL.
            const topPagesUrl = `https://api.ahrefs.com/v3/site-explorer/top-pages?target=${encodeURIComponent(
                targetUrl
            )}&country=de&limit=100&select=top_keyword&date=${formattedDate}&token=${process.env.AHREFS_API_KEY}`;

            const topPagesResponse = await fetch(topPagesUrl, options);

            if (!topPagesResponse.ok) {
                const errorBody = await topPagesResponse.text();
                console.error("Ahrefs Top Pages API Error:", {
                    status: topPagesResponse.status,
                    url: topPagesUrl,
                    error: errorBody,
                });
            } else {
                const topPagesData: TopPagesApiResponse = await topPagesResponse.json();

                // Extract keywords from 'pages' array
                const competitorKeywords = (topPagesData.pages || []).map((page) => ({
                    keyword: page.top_keyword,
                }));

                console.log("Extracted Competitor Keywords:", competitorKeywords);

                // Filter competitor keywords
                const filteredCompetitorKeywords = competitorKeywords
                    .map((k: any) => k.keyword)
                    .filter((keyword) => !topic || keyword.toLowerCase().includes(topic.toLowerCase()));


                refinedKeywords = filteredCompetitorKeywords;
            }
        }


        // 4️⃣ Build the OpenAI prompt.
        const prompt = `Given the following refined keywords data (each with its unique search volume and keyword difficulty): ${refinedKeywordsData}, from the website ${targetUrl} and considering the business niche, please generate a structured JSON object containing SEO-optimized anchor text suggestions. The response **must be a valid JSON object** with no additional text.
Ensure that:
- The difficulty is returned as a percentage string (e.g., "75%").
- ChatGPT considers each keyword’s volume and difficulty when generating the recommendations.

The JSON structure should be as follows:
{
  "Exact Match": {
    "anchorText": "...",
    "searchVolume": 000,
    "difficulty": "0%",
    "bestFor": "..."
  },    
  "Partial Match": {
    "anchorText": "...",
    "searchVolume": 000,
    "difficulty": "0%",
    "bestFor": "..."
  },
  "Branded": {
    "anchorText": "...",
    "searchVolume": 000,
    "difficulty": "0%",
    "bestFor": "..."
  },
  "Natural":{
    "anchorText": "...",
    "searchVolume": 000,
    "difficulty": "0%",
    "bestFor": "..."
  },
  "Generic": {
    "anchorText": "...",
    "searchVolume": 000,
    "difficulty": "0%",
    "bestFor": "..."
  }
}
Return only this JSON object without any explanations, markdown, or additional formatting.
`;



        // 5️⃣ Call OpenAI API.
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "You are a very helpful SEO and backlinks assistant." },
                    { role: "user", content: prompt },
                ],
                temperature: 0.7,
                max_tokens: 300,
            }),
        });

        console.log("OpenAI is generating anchor text suggestions...");
        if (!openaiResponse.ok) {
            const errorText = await openaiResponse.text();
            console.error("OpenAI API Error:", openaiResponse.status, errorText);
            throw new Error("Failed to fetch data from OpenAI");
        }

        const openaiData = await openaiResponse.json();
        if (
            !openaiData.choices ||
            openaiData.choices.length === 0 ||
            !openaiData.choices[0].message ||
            !openaiData.choices[0].message.content
        ) {
            console.error("Unexpected OpenAI response structure:", openaiData);
            throw new Error("Unexpected OpenAI API response structure");
        }

        let content = openaiData.choices[0].message.content.trim();

        // Ensure the response is valid JSON (strip Markdown if needed)
        if (content.startsWith("```json")) {
            content = content.replace(/```json|```/g, "").trim();
        }

        let anchorTexts;
        try {
            anchorTexts = JSON.parse(content);
            console.log("Parsed OpenAI response as JSON:", anchorTexts);
        } catch (error) {
            console.warn("Failed to parse OpenAI response as JSON. Returning raw text.", error);
            anchorTexts = content;
        }

        return NextResponse.json({
            anchorTexts,
            metrics: {
                keywordCount: refinedKeywords.length,
                refinedKeywords,
            },
        });
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}