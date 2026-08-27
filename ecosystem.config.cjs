module.exports = {
  apps: [
    {
      name: 'deltachem-prod',
      script: 'server.mjs',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4321,
        HOST: '0.0.0.0'
      }
    }
  ]
};
