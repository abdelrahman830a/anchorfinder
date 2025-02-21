import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { targetUrl, topic } = body;

        if (!targetUrl) {
            return NextResponse.json({ error: "Target URL is required" }, { status: 400 });
        }

        // 1. Fetch keyword data from Ahrefs API
        const ahrefsUrl = `https://apiv2.ahrefs.com?from=backlinks&limit=100&target=${targetUrl}&mode=prefix&token=${process.env.AHREFS_API_KEY}`;


        const ahrefsResponse = await fetch(ahrefsUrl);
        if (!ahrefsResponse.ok) {
            const errorBody = await ahrefsResponse.text();
            console.error('Ahrefs API Error:', {
                status: ahrefsResponse.status,
                url: ahrefsUrl,
                error: errorBody
            });
            throw new Error(`Ahrefs API Error: ${ahrefsResponse.statusText}`);
        }

        const ahrefsData = await ahrefsResponse.json();
        const keywords: string[] = ahrefsData.keywords || [];

        // 2. Generate prompt for OpenAI API
        const prompt = `
Using the following keywords: ${keywords.join(", ")}
${topic ? `and considering the niche: ${topic}` : ""}
Generate several types of SEO-optimized anchor texts for a backlink:
- Exact Match (e.g., using the exact keyword)
- Partial Match (e.g., slight variation)
- Branded (e.g., including a brand name)
- Natural/LSI variation
- Generic
Provide the anchor texts along with associated metrics like keyword search volume and difficulty.
`;

        // 3. Call OpenAI API for anchor text generation using Chat Completions
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
                max_tokens: 150,
                temperature: 0.7,
                store: true,
            }),
        });

        if (!openaiResponse.ok) {
            const errorText = await openaiResponse.text();
            console.error("OpenAI API Error:", openaiResponse.status, errorText);
            throw new Error("Failed to fetch data from OpenAI");
        }

        const openaiData = await openaiResponse.json();
        console.log("OpenAI response data:", openaiData);

        // Validate response structure before accessing properties
        if (
            !openaiData.choices ||
            openaiData.choices.length === 0 ||
            !openaiData.choices[0].message ||
            !openaiData.choices[0].message.content
        ) {
            console.error("Unexpected OpenAI response structure:", openaiData);
            throw new Error("Unexpected OpenAI API response structure");
        }

        const anchorTexts = openaiData.choices[0].message.content.trim();


        // 4. Return processed data
        return NextResponse.json({
            anchorTexts,
            metrics: {
                keywordCount: keywords.length,
            },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error("Error:", error.message);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
