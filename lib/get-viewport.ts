import { headers } from "next/headers"

export default async function getViewport(): Promise<'desktop' | 'mobile'> {
    const headersList = await headers()
    const viewport = headersList.get('x-viewport') as 'desktop' | 'mobile'
    return viewport || 'desktop'
}
