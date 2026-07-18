import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase'

const provider = new GoogleAuthProvider()
provider.setCustomParameters({ prompt: 'select_account' })

/**
 * Sign in with Google via Firebase Auth and return the Firebase ID token
 * for backend session exchange.
 */
export async function signInWithGoogleFirebase() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Google login needs Firebase Web config. Add firebase.apiKey and firebase.appId in public/runtime-config.json (or VITE_FIREBASE_* in .env), then redeploy.'
    )
  }

  const auth = getFirebaseAuth()
  try {
    const result = await signInWithPopup(auth, provider)
    const idToken = await result.user.getIdToken()

    return {
      idToken,
      profile: {
        name: result.user.displayName || '',
        email: result.user.email || '',
        photoURL: result.user.photoURL || '',
        uid: result.user.uid,
      },
    }
  } catch (error) {
    const code = error?.code || ''
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new Error('Google sign-in was cancelled')
    }
    if (code === 'auth/configuration-not-found') {
      throw new Error(
        'Firebase Authentication is not set up. In Firebase Console → Authentication, click Get started, then enable Google sign-in.'
      )
    }
    if (code === 'auth/operation-not-allowed') {
      throw new Error(
        'Google sign-in is disabled. Enable it in Firebase Console → Authentication → Sign-in method → Google.'
      )
    }
    if (code === 'auth/unauthorized-domain') {
      throw new Error(
        'This domain is not allowed for Google login. Add it under Firebase Auth → Settings → Authorized domains.'
      )
    }
    throw new Error(error?.message || 'Google sign-in failed')
  }
}

export async function signOutFirebase() {
  if (!isFirebaseConfigured()) return
  try {
    await signOut(getFirebaseAuth())
  } catch {
    // ignore
  }
}
