import axios from 'axios';

const BACKEND_UNAVAILABLE_MESSAGE = 'Backend API is not available. Please start the server.';
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
});

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return BACKEND_UNAVAILABLE_MESSAGE;
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

  return GENERIC_ERROR_MESSAGE;
}
