import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  )
}

let app
let auth

export function getFirebaseApp() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured. Add VITE_FIREBASE_API_KEY and VITE_FIREBASE_APP_ID from Firebase Console → Project settings → Your apps (Web).'
    )
  }
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  }
  return app
}

export function getFirebaseAuth() {
  if (!auth) {
    auth = getAuth(getFirebaseApp())
  }
  return auth
}
