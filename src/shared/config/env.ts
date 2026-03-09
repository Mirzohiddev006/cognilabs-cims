const fallbackApiBaseUrl = "https://api.project.cims.cognilabs.org/";

export const env = {
  appName: import.meta.env.VITE_APP_NAME || 'Cognilabs CIMS',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || fallbackApiBaseUrl,
  appEnv: import.meta.env.VITE_APP_ENV || 'development',
} as const
