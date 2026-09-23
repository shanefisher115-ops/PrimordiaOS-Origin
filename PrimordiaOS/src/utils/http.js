import axios from 'axios';
export const Http = {
    async get(url, config) {
        const res = await axios.get(url, config);
        return res.data;
    },
    async post(url, data, config) {
        const res = await axios.post(url, data, config);
        return res.data;
    },
};
