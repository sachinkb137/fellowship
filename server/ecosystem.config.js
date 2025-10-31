module.exports = {
  apps: [
    {
      name: 'mgnrega-api',
      script: './dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'mgnrega-etl',
      script: './dist/etl/worker.js',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 */1 * * *',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};