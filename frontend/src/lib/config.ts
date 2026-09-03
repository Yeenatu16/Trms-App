export const getApiUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  // Trim spaces and remove ANY number of trailing slashes
  return url.trim().replace(/\/+$/, '');
};
