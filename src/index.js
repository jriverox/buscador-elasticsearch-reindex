const argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .command('cluster', 'numero del cluster')
  .example('$0 cluster 1', 'cluster en el que se ejecutará la reindexación')
  .alias('c', 'cluster')
  .demandOption(['c']).argv;

const Server = require("./server");
const Utils = require("./utils");

(async () => {
  const clusterId = argv.cluster;
  console.log('cluster', clusterId);
  //const server = new Server(clusterId);
while(true) {
  await Utils.backoff(2000);
  console.log('cluster', clusterId, ' segs:', new Date().getSeconds());
}
  //await server.execJob();
})();
