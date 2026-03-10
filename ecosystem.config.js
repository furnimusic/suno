module.exports = {
  apps: [
    {
      name: "furnimusic",
      script: "server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        // ANTHROPIC_API_KEY deve ser definida no .env ou no ambiente do sistema
      },
    },
  ],
};
