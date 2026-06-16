module.exports = {
  apps: [
    {
      name: "resifaso",
      script: "dist/server.cjs",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 5000
      }
    }
  ]
};
