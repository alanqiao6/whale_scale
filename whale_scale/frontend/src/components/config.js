// Configuration settings for the application
const config = {
    // API base URL
    API_URL: process.env.REACT_APP_API_URL || '',
    
    // API endpoints
    endpoints: {
      login: '/accounts/api/login/',
      signup: '/accounts/api/signup/',
      logout: '/accounts/api/logout/',
      checkAuth: '/accounts/api/user/'
    }
  };
  
// Add the API_URL prefix to all endpoints, but handle case when API_URL is empty
Object.keys(config.endpoints).forEach(key => {
    if (config.API_URL) {
      // If API_URL exists and doesn't end with a slash, ensure we have correct path
      const baseUrl = config.API_URL.endsWith('/') ? config.API_URL.slice(0, -1) : config.API_URL;
      config.endpoints[key] = baseUrl + config.endpoints[key];
    }
  });
  
  export default config;