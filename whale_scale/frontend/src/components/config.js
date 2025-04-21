// Configuration settings for the application
const config = {
    // API base URL
    API_URL: process.env.REACT_APP_API_URL,
    
    // API endpoints
    endpoints: {
      login: '/accounts/api/login/',
      signup: '/accounts/api/signup/',
      logout: '/accounts/api/logout/',
      checkAuth: '/accounts/api/check-auth/'
    }
  };
  
  // Add the API_URL prefix to all endpoints
  Object.keys(config.endpoints).forEach(key => {
    config.endpoints[key] = config.API_URL + config.endpoints[key];
  });
  
  export default config;