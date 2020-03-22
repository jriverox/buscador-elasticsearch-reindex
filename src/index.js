const Server = require("./server");

(async () => {
  const clusterId = 1;
  const server = new Server(clusterId);

  await server.execJob();
})();
