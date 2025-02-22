import { headers } from "next/headers"

export default async function getPathname(): Promise<string> {
    const headersList = await headers()
    const pathname = headersList.get('x-pathname')
    return pathname || '/'
}
