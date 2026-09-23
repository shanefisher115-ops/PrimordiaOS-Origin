import axios, { AxiosRequestConfig } from 'axios';

export const Http = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await axios.get<T>(url, config);
    return res.data;
  },

  async post<T>(url: string, data: any, config?: AxiosRequestConfig): Promise<T> {
    const res = await axios.post<T>(url, data, config);
    return res.data;
  },
};
