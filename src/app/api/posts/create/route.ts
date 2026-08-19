// src/app/api/posts/create/route.ts

import { NextResponse } from "next/server";
import { checkForDoxxing } from "@/lib/antiDoxx";
import { VALID_CATEGORIES, isValidCategory } from "@/lib/categories";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, category } = body;

    // Validate content presence
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Content is required." },
        { status: 400 }
      );
    }

    // Validate category using your helper
    const selectedCategory = isValidCategory(category) ? category : VALID_CATEGORIES[0];

    // Anti-doxxing check
    const doxxingCheck = checkForDoxxing(content);
    if (doxxingCheck.isDoxxing) {
      return NextResponse.json(
        { 
          error: "Post blocked due to sensitive personal information (doxxing check failed). Please keep it anonymous and safe.",
          details: doxxingCheck.reason 
        },
        { status: 400 }
      );
    }

    // Generate random anonymous author alias (e.g., UNSAID #48291)
    const randomId = Math.floor(10000 + Math.random() * 90000);
    const authorAlias = `UNSAID #${randomId}`;

    // Save post to Firestore
    const postData = {
      content: content.trim(),
      category: selectedCategory,
      authorAlias,
      upvotes: 0,
      replies: 0,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "posts"), postData);

    return NextResponse.json(
      { 
        success: true, 
        postId: docRef.id,
        message: "Post created successfully." 
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}