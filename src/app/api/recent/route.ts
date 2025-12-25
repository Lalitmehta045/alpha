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
    console.error("Get recent error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent products" },
      { status: 500 }
    );
  }
}