import { NextResponse } from "next/server";
import { checkForDoxxing } from "@/lib/antiDoxx";
import { CATEGORIES } from "@/lib/categories";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, category } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content is required." }, { status: 400 });
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length < 5 || trimmedContent.length > 1000) {
      return NextResponse.json(
        { error: "Post must be between 5 and 1000 characters." },
        { status: 400 }
      );
    }

    const validCategory = CATEGORIES.some((c) => c.id === category);
    if (!validCategory) {
      return NextResponse.json({ error: "Invalid category selected." }, { status: 400 });
    }

    const doxxCheck = checkForDoxxing(trimmedContent);
    if (doxxCheck.hasPotentialDoxx) {
      return NextResponse.json(
        {
          error: "Doxxing protection triggered: Contains sensitive personal information.",
          patterns: doxxCheck.matchedPatterns,
        },
        { status: 422 }
      );
    }

    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const publicId = `#${randomNum}`;
    const authorAlias = `UNSAID ${publicId}`;

    const newPost = {
      publicId,
      authorAlias,
      content: trimmedContent,
      category,
      createdAt: new Date().toISOString(),
      status: "active",
      reactionCount: 0,
      reactions: { heart: 0, relate: 0, sad: 0, fire: 0 },
      commentCount: 0,
      reportCount: 0,
    };

    return NextResponse.json({ success: true, post: newPost }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
