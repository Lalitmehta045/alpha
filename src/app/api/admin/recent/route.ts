import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import RecentModel from "@/lib/models/Recent.model";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET() {
  try {
    await connectDB();
    const recents = await RecentModel.find({ order: { $exists: true } }).sort({ order: 1 });

    // Generate presigned URLs for images
    const recentsWithUrls = await Promise.all(
      recents.map(async (recent: any) => {
        try {
          // Extract key from S3 URL
          const url = new URL(recent.image);
          const key = url.pathname.substring(1); // Remove leading slash

          const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: key,
          });

          const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

          return {
            ...recent.toObject(),
            image: signedUrl,
          };
        } catch (error) {
          console.error("Error generating signed URL for", recent.image, error);
          return recent.toObject();
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: recentsWithUrls,
    });
  } catch (error) {
    console.error("Get admin recent error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent products" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    let { image, title, description, order } = await req.json();

    if (!image || order === undefined) {
      return NextResponse.json(
        { error: "Image and order are required" },
        { status: 400 }
      );
    }

    // Set default title if empty
    if (!title || title.trim() === "") {
      title = "Untitled";
    }

    const existing = await RecentModel.findOne({ order });
    let recent;
    if (existing) {
      existing.image = image;
      existing.title = title;
      existing.description = description;
      recent = await existing.save();
    } else {
      recent = await RecentModel.create({ image, title, description, order });
    }
    return NextResponse.json({
      success: true,
      data: recent,
    });
  } catch (error) {
    console.error("Create recent error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to create recent product" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    await RecentModel.findByIdAndDelete(id);
    return NextResponse.json({
      success: true,
      message: "Recent product deleted",
    });
  } catch (error) {
    console.error("Delete recent error:", error);
    return NextResponse.json(
      { error: "Failed to delete recent product" },
      { status: 500 }
    );
  }
}