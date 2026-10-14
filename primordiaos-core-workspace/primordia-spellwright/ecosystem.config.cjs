module.exports = {
  apps: [
    {
      name: 'primordia-spellwright-engine',
      script: './target/verify/release/primordia-spellwright.exe',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        RUST_LOG: 'info',
        PORT: 8080
      }
    }
  ]
};
