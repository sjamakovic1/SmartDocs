import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api',
});

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Backend API is not available. Please start the server.';
    }

    const apiErrorMessage = error.response.data?.error?.message;
    if (typeof apiErrorMessage === 'string') {
      return apiErrorMessage;
    }

    const responseMessage = error.response.data?.message;
    if (typeof responseMessage === 'string') {
      return responseMessage;
    }
  }

  return 'Something went wrong. Please try again.';
}
