import { getAccount } from "./db";
import { listMedia, type IgMedia } from "./instagram";

export async function loadMedia(): Promise<{ media: IgMedia[]; error: string | null }> {
  const account = await getAccount();
  if (!account) return { media: [], error: "Instagram not connected" };
  try {
    return { media: await listMedia(account.access_token, 30), error: null };
  } catch (e) {
    return { media: [], error: (e as Error).message };
  }
}
