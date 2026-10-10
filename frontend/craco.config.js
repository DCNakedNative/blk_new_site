const path = require("path");

module.exports = {
  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  devServer: (config) => {
    config.allowedHosts = "all";
    return config;
  },
};
