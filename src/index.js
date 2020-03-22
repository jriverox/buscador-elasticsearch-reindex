const Server = require('./server');
const Utils = require("./utils");

(async () => {
  const clusterId = 1;
  const server = new Server();
  await server.evaluateTasks(clusterId);
  console.log("continua");
})();
