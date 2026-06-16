import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required fields." },
        { status: 400 }
      );
    }

    // Insert submission using service role client to bypass any reading restrictions
    const supabase = createAdminClient();
    const { error } = await supabase.from("contact_submissions").insert([
      {
        name,
        email,
        company: company || null,
        message,
      },
    ]);

    if (error) {
      console.error("Supabase error inserting contact submission:", error);
      return NextResponse.json(
        { error: "Failed to save contact submission. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Thank you! Your submission has been recorded." });
  } catch (err) {
    console.error("Contact API error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
