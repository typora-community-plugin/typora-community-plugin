import { HelperOpError, type HelperResponse, type HelperRuntime, HelperUnavailableError } from './protocol'


export const DEFAULT_TIMEOUT_MS = 5_000

/**
 * Sends one op to the helper.
 *
 * The body is a JSON string, which makes the request a CORS "simple request":
 * no preflight, so no `OPTIONS` round trip on every call.
 */
export async function callHelper<T>(
  runtime: HelperRuntime,
  op: string,
  args: Record<string, unknown> = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(`http://127.0.0.1:${runtime.port}/v1/op`, {
      method: 'POST',
      body: JSON.stringify({ token: runtime.token, op, args }),
      signal: controller.signal,
    })
  }
  catch (error) {
    throw new HelperUnavailableError(
      `Helper request failed: ${(error as Error)?.message ?? String(error)}`,
    )
  }
  finally {
    clearTimeout(timer)
  }

  let body: HelperResponse<T>
  try {
    body = await response.json() as HelperResponse<T>
  }
  catch {
    throw new HelperUnavailableError(`Helper returned an unreadable response (${response.status}).`)
  }

  if (body?.ok === true) return body.data

  const code = body?.error?.code ?? 'unknown'
  const message = body?.error?.message ?? `Helper request failed (${response.status}).`

  if (response.status === 401 || code === 'unauthorized') {
    throw new HelperUnavailableError('Helper rejected the session token.')
  }

  throw new HelperOpError(code, message)
}

export async function health(runtime: HelperRuntime, timeoutMs = 1_500): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`http://127.0.0.1:${runtime.port}/v1/health`, {
      signal: controller.signal,
    })
    if (!response.ok) return false

    const body = await response.json() as HelperResponse<{ protocol: number }>
    return body?.ok === true && typeof body.data?.protocol === 'number'
  }
  catch {
    return false
  }
  finally {
    clearTimeout(timer)
  }
}
