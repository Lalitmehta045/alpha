import { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { connectDB } from "./db";
import User from "@/lib/models/User.model";
import bcrypt from "bcryptjs";
import { IUserProfile } from "@/@types/user";
import crypto from "crypto";

export const authOptions: NextAuthOptions = {
  // Rely on env secret so callbacks/redirects use the correct host in prod
  secret: process.env.NEXTAUTH_SECRET,
  session: { 
    strategy: "jwt",
    maxAge: 10 * 365 * 24 * 60 * 60, // 10 years
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        await connectDB();

        const user = await User.findOne({
          email: credentials?.email,
        }).lean<IUserProfile>();
        if (!user) return null;

        const ok = await bcrypt.compare(credentials!.password, user.password);
        if (!ok) return null;

        return {
          id: String(user._id),
          email: user.email,
          fname: user.fname,
          lname: user.lname,
          role: user.role,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    // ✅ When Google login happens, ensure user exists in our MongoDB
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      await connectDB();

      const email = user.email;
      if (!email) return false;

      let existing = await User.findOne({ email });

      if (!existing) {
        const randomPassword = crypto.randomBytes(32).toString("hex");
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        existing = await User.create({
          fname: (profile as any)?.given_name || "Google",
          lname: (profile as any)?.family_name || "User",
          email,
          password: hashedPassword,
          avatar: (profile as any)?.picture || "",
          role: "USER",
          status: "Active",
          verify_email: true,
        });
      }

      // Attach DB info to NextAuth user
      (user as any).id = existing._id.toString();
      (user as any).role = existing.role;

      return true;
    },

    async redirect({ url, baseUrl }) {
      // Ensure redirects stay on the allowed host to avoid redirect_uri_mismatch
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const target = new URL(url);
        if (target.origin === baseUrl) return url;
      } catch {
        // fall through to baseUrl
      }
      return baseUrl;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      // Set token to expire in 10 years
      token.exp = Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60);
      return token;
    },

    async session({ session, token }) {
      (session.user as any).id = token.id;
      (session.user as any).role = token.role;
      return session;
    },
  },

  pages: { signIn: "/auth/sign-in" },
};
