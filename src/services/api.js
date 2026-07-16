import axios from 'axios'
import { API_BASE_URL, STORAGE } from '../config'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
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
    const onGithubPages =
      typeof window !== 'undefined' &&
      /\.github\.io$/i.test(window.location.hostname)

    if (!error.response) {
      message = onGithubPages
        ? 'API is not available on GitHub Pages. Use the demo login or host the backend separately.'
        : 'Cannot reach server. Start API with: npm run server'
    } else if (status === 405 && onGithubPages) {
      message =
        'Login API cannot run on GitHub Pages (405). Use demo auth or deploy the backend.'
    } else if (error.response.data?.message) {
      message = error.response.data.message
    } else if (error.message) {
      message = error.message
    }

    return Promise.reject(new Error(message))
  }
)

export default api
