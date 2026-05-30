import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { BASE_URL } from '../../ENV';
import { refresh } from './endpoint';

export type NetworkMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface IMakeANetworkCall {
  (
    endpoint: string,
    method: NetworkMethod,
    params?: any,
    extraHeaders?: Record<string, string>
  ): Promise<AxiosResponse>;
}

export const makeANetworkCall: IMakeANetworkCall = async (
  endpoint,
  method,
  params,
  extraHeaders
) => {
  const config: AxiosRequestConfig = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      ...extraHeaders,
    },
    withCredentials: true,
  };

  if (method !== 'GET' && params) {
    config.data = params;
  } else if (method === 'GET' && params) {
    config.params = params;
  }

  try {
    const response = await axios(config);
    return response;
  } catch (error: any) {
    if (error.response?.status === 401) {
      try {
        // Refresh token
        await axios.get(`${BASE_URL}${refresh}`, { withCredentials: true });

        // Retry the original request
        const retryResponse = await axios(config);
        return retryResponse;
      } catch (refreshError) {
        throw refreshError;
      }
    }
    throw error;
  }
};

