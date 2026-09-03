export const getApiUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return url.replace(/\/$/, ''); // Safely remove trailing slash if it exists
};
