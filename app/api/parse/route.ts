import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY! });

export async function POST(req: Request) {
  const { query } = await req.json();

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a parser. Extract restaurant search parameters from user text. Output JSON with fields: keyword (string), radius (number in meters). If not found, use defaults: keyword='', radius=1500.",
        },
        { role: "user", content: query },
      ],
        response_format: { type: "json_object" },
      temperature: 0,
    });

    // Parse JSON response
    const text = completion.choices[0]?.message?.content || "{}";
    let parsed = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { keyword: "", radius: 1500 };
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to parse" }, { status: 500 });
  }
}
