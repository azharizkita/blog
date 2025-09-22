import { config } from "@/lib/config";
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
    revalidate: config.cache.defaultTime,
    ...options,
  });
}
