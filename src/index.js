const Server = require("./server");
const yenv = require("yenv");
const Utils = require("./utils");

const config = yenv();
(async () => {
  const clusterId = process.argv[process.argv.length - 1];
  console.log("Iniciando en el cluster:", clusterId);

  if(!clusterId || isNaN(clusterId) || parseInt(clusterId) < 1 || parseInt(clusterId) > 3)
    throw new Error("Se esperaba el parametro cluster y debe ser un numero entre 1 y 3");
  const server = new Server(parseInt(clusterId));

  await server.execJob();
  console.log("----------------------------");
  console.log("Proceso Completado con exito:", new Date());
  console.log("----------------------------");
  await Utils.backoff(config.END_DELAY_MILISECONDS); //esperar 1h para que pm2 no se reincie
})();
