module.exports = {
  apps: [
    {
      name: "unlocked",
      // TanStack Start + Nitro outputs the Node-compatible server to dist/server/index.mjs
      script: "./dist/server/index.mjs",
      cwd: "/var/www/unlocked",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
      },
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 3000,
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      // Make sure .env is loaded by the app (TanStack Start uses dotenv automatically).
      // If not, add env vars explicitly below or in a .env file in /var/www/unlocked.
    },
  ],
};

