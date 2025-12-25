"use client";

import { SessionProvider } from "next-auth/react";

export default function NextAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider
      refetchInterval={60 * 60} // Refetch session every 1 hour
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  );
}


