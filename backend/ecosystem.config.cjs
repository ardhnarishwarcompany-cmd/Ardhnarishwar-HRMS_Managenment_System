module.exports = {
  apps: [{
    name: "ardhnarishwar-hrms",
    script: "./server.js",
    exec_mode: "fork",
    instances: 1,
    env: {
      NODE_ENV: "production",
      TZ: "Asia/Kolkata",
      PORT: 5000
    },
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    log_file: "./logs/combined.log",
    time_format: "YYYY-MM-DD HH:mm:ss Z",
    watch: false,
    max_memory_restart: "500M"
  }]
};
