import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateAccessToken } from "@/lib/token/generateAccessToken";
import { generateRefreshToken } from "@/lib/token/generateRefreshToken";
import { connectDB } from "@/lib/db";
import UserModel from "@/lib/models/User.model";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await UserModel.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = user._id.toString();
    const accessToken = await generateAccessToken(
      userId,
      user.email,
      user.role
    );
    const refreshToken = await generateRefreshToken(
      userId,
      user.email,
      user.role
    );

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };

    const response = NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: userId,
          fname: user.fname,
          lname: user.lname,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
      },
    });

    response.cookies.set("accessToken", accessToken, cookieOptions);
    response.cookies.set("refreshToken", refreshToken, cookieOptions);
    response.cookies.set(
      "user",
      JSON.stringify({
        id: userId,
        fname: user.fname,
        lname: user.lname,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      }),
      cookieOptions
    );

    return response;
  } catch (error: any) {
    console.error("Google token generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate token" },
      { status: 500 }
    );
  }
}

