const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias['@primordiaos/ui'] = path.resolve(__dirname, 'src/ui');
    config.resolve.alias['@primordiaos/core'] = path.resolve(__dirname, '../backend/src/core');
    return config;
  },
};

module.exports = nextConfig;
