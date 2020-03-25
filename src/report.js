const yenv = require("yenv");
const ElasticManager = require("./elasticManager");
const Utils = require("./utils");
const numeral = require("numeral");
const moment = require("moment");
const config = yenv();

(async () => {
  let clusterId = process.argv[process.argv.length - 1];
  console.log("Iniciando en el cluster:", clusterId);

  if(!clusterId || isNaN(clusterId) || parseInt(clusterId) < 1 || parseInt(clusterId) > 3)
    throw new Error("Se esperaba el parametro cluster y debe ser un numero entre 1 y 3");

  clusterId = parseInt(clusterId);
  const elasticManager = new ElasticManager(clusterId);
  const countries = elasticManager.getCluster().COUNTRIES;
  const indices = await elasticManager.catIndices("producto_v");
  const indexPattern = config.ELASTICSEARCH.INDEX_PATTERN;
  const newIndexPattern = config.ELASTICSEARCH.NEW_INDEX_PATTERN;
  let detailedReport = [];
  let reportByCountry = [];
  let docsSourceTotal = 0;
  let docsTargetTotal = 0;

  for (const country of countries) {
    let docsSourceByCountry = 0;
    let docsTargetByCountry = 0;
    const campaigns = config.CAMPAIGNS_BY_COUNTRIES[country] || config.CAMPAIGNS_BY_COUNTRIES["DEFAULT"];
    for (const campaign of campaigns) {
      let currentIndexName = `${indexPattern}_${country.toLowerCase()}_${campaign}`;
      let currentIndex = indices.find(i => {return i.index === currentIndexName} );
      if(currentIndex) {
          //console.log(`Indice ${currentIndex.index} encontrado en la lista`);
          let queryResponse = await elasticManager.aggregate(currentIndexName);
          if(queryResponse) {
            //let totalDocs = queryResponse.hits.total;
            let buckets = queryResponse.aggregations.tipoPersonalizacion.buckets;
            for (const bucket of buckets) {
                let personalization = bucket.key;
                let docsSource = bucket.doc_count;
                let docsTarget = 0;
                let newIndexName = `${newIndexPattern}_${country.toLowerCase()}_${campaign}_${personalization.toLowerCase()}`;
                //console.log("newIndex", newIndexName);
                let newIndex = indices.find(x => {return x.index === newIndexName} );

                if(newIndex) {
                  docsTarget = parseInt(newIndex["docs.count"]);
                }
                let reportItem = {
                  Indice : newIndexName,
                  Pais: country,
                  Campania: campaign,
                  Palanca: personalization,
                  "Cant. Origen": numeral(docsSource).format('0,0'),
                  "Cant. Destino": numeral(docsTarget).format('0,0'),
                  Faltante:  numeral(docsSource - docsTarget).format('0,0')
                };
                docsSourceByCountry += docsSource;
                docsTargetByCountry += docsTarget;
                detailedReport.push(reportItem);
            }
          }
      }
    }
    docsSourceTotal += docsSourceByCountry;
    docsTargetTotal += docsTargetByCountry;

    reportByCountry.push({
      Pais: country,
      "Cant. Origen": numeral(docsSourceByCountry).format('0,0'),
      "Cant. Destino": numeral(docsTargetByCountry).format('0,0'),
      Faltante: numeral(docsTargetByCountry - docsTargetByCountry).format('0,0')
      })
  }
  console.log("Detallado");
  console.table(detailedReport);
  console.log("Por Pais");
  console.table(reportByCountry);
  console.log("Total");

  console.table([{
    "Cant. Origen": numeral(docsSourceTotal).format('0,0'),
    "Cant. Destino": numeral(docsTargetTotal).format('0,0'),
    Faltante: numeral(docsSourceTotal - docsTargetTotal).format('0,0')
  }]);
  console.log(moment().format('lll'));
})();
