import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

const geminiUrl = process.env.GEMINI_API_URL!

/**
 * POST /api/chat/ai-suggestions
 * M3: Fixed double JSON serialization (was returning a JSON-encoded string, not an object).
 * M4: Removed unnecessary connectDb() — this route makes no DB queries.
 */
export async function POST(req: NextRequest) {
    try {
        // M4: No DB queries in this route — connectDb() removed
        const { lastMessage, role } = await req.json()

        const prompt = `You are an AI reply suggestion system for a vehicle booking chat app.

Generate short, smart, human-like quick reply suggestions based on:
- ROLE (${role})
- RECENT_MESSAGE (${lastMessage || "Hello"})

Rules:
- Return exactly 3 suggestions
- Keep replies short (3–12 words)
- Match the conversation context and tone
- Driver replies should sound professional and helpful
- User replies should sound natural and realistic
- Avoid repetition
- Return ONLY valid JSON

Output format:
{
  "suggestions": [
    "Reply 1",
    "Reply 2",
    "Reply 3"
  ]
}
`

        let suggestions = ["I'm on my way!", "What is your location?", "Thank you!"];
        try {
            const response = await axios.post(geminiUrl, {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": prompt
                            }
                        ]
                    }
                ]
            })

            const rawText = response.data.candidates[0].content.parts[0].text
            const cleanedText = rawText.replace(/```json/g, "").replace(/```/g, "").trim()
            const parsed = JSON.parse(cleanedText)
            if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
                suggestions = parsed.suggestions
            }
        } catch (apiErr) {
            console.error("[ai-suggestions] Gemini API error, using defaults:", apiErr instanceof Error ? apiErr.message : apiErr)
        }

        // M3: Fixed — was NextResponse.json(JSON.stringify({suggestions})) which double-serialized
        return NextResponse.json({ suggestions }, { status: 200 })

    } catch (error) {
        console.error("[ai-suggestions] Error:", error instanceof Error ? error.message : error)
        return NextResponse.json(
            { message: "get ai suggestions error" },
            { status: 500 }
        )
    }
}