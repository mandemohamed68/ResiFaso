module.exports = {
  apps: [
    {
      name: "resifaso-web",
      script: "./dist/server.cjs",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
