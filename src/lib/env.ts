/**
 * Environment variable helpers
 * Server-side safe: throws clear errors if required vars are missing
 */

/**
 * Require an environment variable (throws if missing)
 * Use for server-side code where missing env vars should fail fast
 */
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

/**
 * Get an optional environment variable
 * Returns undefined if not set
 */
export function getEnv(name: string): string | undefined {
  return process.env[name]
}
