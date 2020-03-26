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

  for (const country of countries) {

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
                  CantOrigen: docsSource,
                  CantDestino: docsTarget,
                  Faltante:  docsSource - docsTarget
                };
                detailedReport.push(reportItem);
            }
          }
      }
    }
  }

  printDetails(detailedReport);
  printByCountry(countries, detailedReport);
  printTotal(detailedReport);

  console.log("Reporte Generado:", moment().format('lll'));
})();

const printDetails = (details) => {
  console.log("Detallado");
  const result = details.map(x => {
    return {
      Pais: x.Pais,
      Indice: x.Indice,
      Campania: x.Campania,
      Palanca: x.Palanca,
      CantOrigen: numeral(x.CantOrigen).format('0,0'),
      CantDestino: numeral(x.CantDestino).format('0,0'),
      Faltante: numeral(x.Faltante).format('0,0'),
    }
  })
  console.table(result);
}

const printByCountry = (countries, details) => {

  console.log("Por Pais");

  console.table(groupReportByCountry(countries, details));
}

const  groupReportByCountry = (countries, data) => {
  let result = [];
  countries.forEach(country => {
    let item = data
      .filter(x => x.Pais === country)
      .map(x => {
        return {
          Pais: x.Pais,
          CantOrigen: x.CantOrigen,
          CantDestino: x.CantDestino}
      })
      .reduce((accumulator, current) => {
        const origen = accumulator.CantOrigen + current.CantOrigen;
        const destino = accumulator.CantDestino + current.CantDestino;

        return {
          Pais: current.Pais,
          CantOrigen: origen,
          CantDestino: destino,
          Faltante: origen - destino
        }
      });
    result.push(item);
  })
  return result.map(x => {
    return {
      Pais: x.Pais,
      CantOrigen: numeral(x.CantOrigen).format('0,0'),
      CantDestino: numeral(x.CantDestino).format('0,0'),
      Faltante: numeral(x.CantOrigen - x.CantDestino).format('0,0')
    }
  });
}

const grandTotal = (details) => {
  return details.reduce((accumulator, current) => {
    const origen = accumulator.CantOrigen + current.CantOrigen;
    const destino = accumulator.CantDestino + current.CantDestino;
    const faltante = origen - destino;
    return {
      CantOrigen: origen,
      CantDestino: destino,
      Faltante: faltante
      }
  });
}

const printTotal = (details) => {
  console.log("Total");
  const grandTotalArray = [];
  const totals = grandTotal(details);
  const avance = (totals.CantDestino / totals.CantOrigen) * 100;
  totals.CantOrigen = numeral(totals.CantOrigen).format('0,0');
  totals.CantDestino = numeral(totals.CantDestino).format('0,0');
  totals.Faltante = numeral(totals.Faltante).format('0,0');

  grandTotalArray.push(totals);
  console.table(grandTotalArray);
  console.log("---------------------------");
  console.log("Avance:", avance.toFixed(2), "%");
  console.log("---------------------------");
}


