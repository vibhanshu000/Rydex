import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import connectDb from "./lib/db"
import User from "./models/user.model"
import bcrypt from "bcryptjs"
import Google from "next-auth/providers/google"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {
          type: "email",
          label: "Email",
          placeholder: "johndoe@gmail.com",
        },
        password: {
          type: "password",
          label: "Password",
          placeholder: "*****",
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("missing credentials")
        }
        const email = (credentials.email as string).trim().toLowerCase()
        const password = credentials.password as string
        await connectDb()
        
        const user = await User.findOne({ email })

        if (!user) {
          throw new Error("user doesn't exist!")
        }

        if (!user.password) {
          throw new Error("no password set — use Google login or contact admin")
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
          throw new Error("incorrect Password")
        }

        if (!user.isEmailVerified) {
          user.isEmailVerified = true
          await user.save()
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role
        }
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await connectDb();
        const email = user.email?.trim().toLowerCase();

        let dbUser = await User.findOne({ email });

        if (!dbUser) {
          dbUser = await User.create({
            name: user.name,
            email: email,
          });
        }

        user.id = dbUser._id.toString();
        user.role = dbUser.role;

        return true;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.name = user.name
        token.id = user.id
        token.email = user.email
        token.role = user.role
      }
      return token
    },
    async session({ token, session }) {
      if (session.user) {
        session.user.name = token.name as string
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.role = token.role as string
      }
      return session
    }
  },
  pages: {
    signIn: "/signin",
    error: "/signin"
  },
  session: {
    strategy: "jwt",
    maxAge: 10 * 24 * 60 * 60
  },
  secret: process.env.AUTH_SECRET
})
