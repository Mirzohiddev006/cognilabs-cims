const fallbackApiBaseUrl = 'https://api.project.cims.cognilabs.org/'
const fallbackWebsiteStatsApiBaseUrl = 'https://height-varied-civilian-plastic.trycloudflare.com/'

export const env = {
  appName: import.meta.env.VITE_APP_NAME || 'Cognilabs CIMS',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || fallbackApiBaseUrl,
  websiteStatsApiBaseUrl: import.meta.env.VITE_WEBSITE_STATS_API_BASE_URL || fallbackWebsiteStatsApiBaseUrl,
  appEnv: import.meta.env.VITE_APP_ENV || 'development',
} as const
