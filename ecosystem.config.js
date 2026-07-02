module.exports = {
  apps: [
    {
      name: "resifaso-web",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
