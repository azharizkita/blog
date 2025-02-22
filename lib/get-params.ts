import { headers } from "next/headers"
import { ReadonlyURLSearchParams } from "next/navigation"

export default async function getParams(): Promise<ReadonlyURLSearchParams> {
    const headersList = await headers()
    const searchParams = new URLSearchParams(headersList.get('x-params') || '')
    return searchParams as ReadonlyURLSearchParams
}
