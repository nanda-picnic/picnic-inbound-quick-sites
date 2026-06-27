import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: { hd: "teampicnic.com" },
      },
    }),
  ],
  callbacks: {
    signIn({ profile }) {
      return profile?.email?.endsWith("@teampicnic.com") ?? false;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
