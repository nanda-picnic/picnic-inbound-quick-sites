import { auth, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
          Welcome to Picnic QuikSites
        </h1>
        <p className="text-sm text-zinc-500">{session?.user?.email}</p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-xs text-zinc-400 underline underline-offset-2 hover:text-zinc-600"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
