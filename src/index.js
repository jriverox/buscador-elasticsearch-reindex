const Server = require("./server");

(async () => {
  const clusterId = process.argv[process.argv.length - 1];
  console.log("Iniciando en el cluster:", clusterId);

  if(!clusterId || isNaN(clusterId) || parseInt(clusterId) < 1 || parseInt(clusterId) > 3)
    throw new Error("Se esperaba el parametro cluster y debe ser un numero entre 1 y 3");
  const server = new Server(parseInt(clusterId));

  await server.execJob();
})();
