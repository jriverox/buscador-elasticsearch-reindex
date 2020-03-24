const Server = require("./server");
const argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .command('cluster', 'numero del cluster')
  .example('$0 cluster 1', 'cluster en el que se ejecutará la reindexación')
  .alias('c', 'cluster')
  .demandOption(['c']).argv;

(async () => {
  const clusterId = argv.cluster;
  const server = new Server(clusterId);

  await server.execJob();
})();
