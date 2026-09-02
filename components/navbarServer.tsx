import { getSessionUserId, getAccessData } from "@/lib/auth/session";
import Navbar from "./navbar";

type Props = { active?: "courts" | "dashboard" | "admin" | "" };

export default async function NavbarServer({ active }: Props) {
  const userId = await getSessionUserId();
  if (!userId) return <Navbar active={active} />;

  // Pass server-known auth so navbar doesn't flash Sign In on public pages
  const access = await getAccessData(userId);
  const userName = access?.user?.displayName ?? access?.user?.username ?? null;
  if (!access) return <Navbar active={active} />;

  return <Navbar active={active} isAuthed userName={userName} />;
}
