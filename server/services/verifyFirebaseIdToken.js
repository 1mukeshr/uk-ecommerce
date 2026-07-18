import * as jose from 'jose'

const JWKS = jose.createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
  )
)

/**
 * Verify a Firebase Auth ID token (from Google sign-in or other providers).
 * @param {string} idToken
 * @returns {Promise<object>} decoded JWT payload
 */
export async function verifyFirebaseIdToken(idToken) {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    'pahadlink-56803'

  if (!idToken || typeof idToken !== 'string') {
    const err = new Error('Missing Firebase ID token')
    err.status = 400
    throw err
  }

  try {
    const { payload } = await jose.jwtVerify(idToken, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    })
    return payload
  } catch (error) {
    const err = new Error('Invalid or expired Google sign-in token')
    err.status = 401
    err.cause = error
    throw err
  }
}
