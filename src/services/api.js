import axios from 'axios'
import { API_BASE_URL, STORAGE } from '../config'

const onGithubPages =
  typeof window !== 'undefined' && /\.github\.io$/i.test(window.location.hostname)

// Render free tier can take ~30–50s to wake from sleep
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: onGithubPages ? 60000 : 20000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE.TOKEN)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'Something went wrong'
    const status = error.response?.status
    if (!error.response) {
      message = onGithubPages
        ? 'Cannot reach PahadLink API. Deploy Render API and set GitHub secret VITE_API_URL.'
        : 'Cannot reach server. Start API with: npm run server'
    } else if (status === 502 || status === 503 || status === 504) {
      message = onGithubPages
        ? 'API is waking up or offline. Wait ~30s and try again (Render free tier sleeps).'
        : 'API not running. Keep MongoDB on and run: npm run server'
    } else if (status === 405 && onGithubPages) {
      message =
        'API URL missing in this build. Set repo secret VITE_API_URL and redeploy Pages.'
    } else if (error.response.data?.message) {
      message = error.response.data.message
    } else if (error.message) {
      message = error.message
    }

    return Promise.reject(new Error(message))
  }
)

export default api
