import { DEFAULT_CACHE_TIME } from "@/constants";
import { unstable_cache } from "next/cache";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Callback = (...args: any[]) => Promise<any>;

export default function cache<T extends Callback>(
  cb: T,
  keyParts?: string[],
  options?: {
    revalidate?: number | false;
    tags?: string[];
  }
): T {
  return unstable_cache(cb, keyParts, {
    revalidate: DEFAULT_CACHE_TIME,
    ...options,
  });
}
