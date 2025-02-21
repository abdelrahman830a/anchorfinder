/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { targetUrl, topic } = body;

        if (!targetUrl) {
            return NextResponse.json({ error: "Target URL is required" }, { status: 400 });
        }

        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().split("T")[0]; // e.g. "2025-02-21"
        console.log("Formatted Date:", formattedDate);


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
        console.log("Ahrefs Organic Keywords Response:", JSON.stringify(ahrefsData, null, 2));

        // Try to get keywords from either 'data' or 'keywords' property.
        const keywordResults: any[] = ahrefsData.data || ahrefsData.keywords || [];

        // 2️⃣ Filter keywords:
        const filteredKeywords = keywordResults.filter((k) => {
            const vol = Number(k.volume);
            const kd = Number(k.keyword_difficulty);
            const keyword = (k.keyword || "").toLowerCase();
            return vol >= 50 && kd < 50 && (!topic || keyword.includes(topic.toLowerCase()));
        });

        let refinedKeywords: string[] = filteredKeywords.map((k) => k.keyword);

        // 3️⃣ If no organic keywords are found, fetch competitor keywords.
        if (refinedKeywords.length === 0) {
            console.warn("No organic keywords found meeting criteria. Fetching competitor keywords.");

            // Build the Top Pages API URL.
            const topPagesUrl = `https://api.ahrefs.com/v3/site-explorer/top-pages?target=${encodeURIComponent(
                targetUrl
            )}&country=de&limit=5&select=url&date=${formattedDate}&token=${process.env.AHREFS_API_KEY}`;

            const topPagesResponse = await fetch(topPagesUrl, options);
            if (!topPagesResponse.ok) {
                const errorBody = await topPagesResponse.text();
                console.error("Ahrefs Top Pages API Error:", {
                    status: topPagesResponse.status,
                    url: topPagesUrl,
                    error: errorBody,
                });
            } else {
                const topPagesData = await topPagesResponse.json();
                console.log("Ahrefs Top Pages Response:", JSON.stringify(topPagesData, null, 2));

                // Try to get competitor pages from either 'data' or 'pages'
                const competitorPages: any[] = topPagesData.data || topPagesData.pages || [];
                const competitorUrls = competitorPages.map((page) => page.url);
                console.log("Competitor URLs:", competitorUrls);

                // For each competitor URL, fetch organic keywords.
                const competitorKeywordsArrays = await Promise.all(
                    competitorUrls.map(async (url) => {
                        const competitorOrganicUrl = `https://api.ahrefs.com/v3/site-explorer/organic-keywords?target=${encodeURIComponent(
                            url
                        )}&country=de&limit=100&select=keyword,volume,keyword_difficulty&date=${formattedDate}&token=${process.env.AHREFS_API_KEY}`;
                        const compResponse = await fetch(competitorOrganicUrl, options);
                        if (!compResponse.ok) {
                            console.error("Ahrefs Competitor Organic API Error for URL:", url, await compResponse.text());
                            return [];
                        }
                        const compData = await compResponse.json();
                        return compData.data || compData.keywords || [];
                    })
                );

                const competitorKeywords = competitorKeywordsArrays.flat();

                const filteredCompetitorKeywords = competitorKeywords.filter((k) => {
                    const vol = Number(k.volume);
                    const kd = Number(k.keyword_difficulty);
                    const keyword = (k.keyword || "").toLowerCase();
                    return vol >= 50 && kd < 50 && (!topic || keyword.includes(topic.toLowerCase()));
                });

                refinedKeywords = filteredCompetitorKeywords.map((k) => k.keyword);
            }
        }

        console.log("Final Refined Keywords:", refinedKeywords);

        // 4️⃣ Build the OpenAI prompt.
        const prompt = `
Given the following refined keywords: [${refinedKeywords.join(", ")}] from the website ${targetUrl},
and considering the business niche: ${topic || "general"},
generate a structured JSON object with SEO-optimized anchor text suggestions.
The JSON object should have the following structure:
{
  "primary": {
      "text": "Primary anchor text suggestion using an exact match",
      "searchVolume": "Estimated search volume",
      "difficulty": "Estimated keyword difficulty"
  },
  "alternatives": [
      {
          "type": "Partial Match",
          "text": "Anchor text suggestion variation",
          "searchVolume": "Estimated search volume",
          "difficulty": "Estimated keyword difficulty"
      },
      {
          "type": "Branded",
          "text": "Anchor text suggestion including a brand name",
          "searchVolume": "Estimated search volume",
          "difficulty": "Estimated keyword difficulty"
      },
      {
          "type": "Natural/LSI",
          "text": "Anchor text suggestion with semantic variation",
          "searchVolume": "Estimated search volume",
          "difficulty": "Estimated keyword difficulty"
      },
      {
          "type": "Generic",
          "text": "Generic anchor text suggestion",
          "searchVolume": "Estimated search volume",
          "difficulty": "Estimated keyword difficulty"
      }
  ]
}
Ensure that the suggestions are realistic and diverse to help improve SEO rankings.
    `;

        // 5️⃣ Call OpenAI API.
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a very helpful SEO and backlinks assistant." },
                    { role: "user", content: prompt },
                ],
                max_tokens: 300,
                temperature: 0.7,
            }),
        });

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

        let anchorTexts;
        try {
            anchorTexts = JSON.parse(openaiData.choices[0].message.content.trim());
        } catch {
            console.warn("Failed to parse OpenAI response as JSON. Returning raw text.");
            anchorTexts = openaiData.choices[0].message.content.trim();
        }

        return NextResponse.json({
            anchorTexts,
            metrics: {
                keywordCount: refinedKeywords.length,
                refinedKeywords,
            },
        });
    } catch (error: any) {
        console.error("Error:", error.message);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
