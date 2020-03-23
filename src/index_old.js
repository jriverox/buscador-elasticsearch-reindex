const yenv = require('yenv');
const elasticsearch = require('elasticsearch');
const util = require('util');
const argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .command('cluster', 'numero del cluster')
  .example('$0 cluster 1', 'cluster en el que se ejecutará la reindexación')
  .alias('c', 'cluster')
  .demandOption(['c']).argv;

const env = yenv();

(async () => {
    const clusterId = argv.cluster;
    console.log('cluster', argv.cluster);
    
    const indexPattern = env.ELASTICSEARCH.INDEX_PATTERN;
    const newIndexPattern = env.ELASTICSEARCH.NEW_INDEX_PATTERN;
    const cluster = env.ELASTICSEARCH.CLUSTERS.find(x => {return x.ID === clusterId});
    
    console.log(cluster);
    
    const client = new elasticsearch.Client({
            host: cluster.ENDPOINT
          });

    let indices = await client.cat.indices({
        index: `${indexPattern}*`,
        h: ["index", "docs.count"],
        s:"index",
        format: "json"
    });
    
    console.log(indices);

    if(indices && Array.isArray(indices)) {
        const campaignsByContries = env.CAMPAIGNS_BY_COUNTRIES;
        console.log("campaignsByContries", campaignsByContries);
        
        const countries = cluster.COUNTRIES;
        console.log("countries", countries);

        for (const country of countries) {
            let campaigns = campaignsByContries[country] || campaignsByContries["DEFAULT"];
            for (const campaign of campaigns) {
                let currentIndexName = `${indexPattern}_${country.toLowerCase()}_${campaign}`;
                let currentIndex = indices.find(i => {return i.index === currentIndexName} );
                if(currentIndex) {
                    console.log(`Indice ${currentIndex.index} encontrado en la lista`);
                    let queryResponse = await client.search({
                        size: 0,
                        index: currentIndexName,
                        filter_path: "aggregations.tipoPersonalizacion.buckets,hits.total",
                        body:{
                            "aggs" : {
                                "tipoPersonalizacion" : {
                                    "terms": {
                                      "field": "tipoPersonalizacion",
                                      "size": 20,
                                      "order" : { "_count" : "asc" }
                                    }
                                }
                            }
                        }                        
                    });

                    console.log(util.inspect(queryResponse, { compact: true, depth: 5, breakLength: 80 }));
                    
                    if(queryResponse) {
                        let totalDocs = queryResponse.hits.total;
                        
                        let buckets = queryResponse.aggregations.tipoPersonalizacion.buckets;
                        for (const bucket of buckets) {
                            let tipoPersonalizacion = bucket.key;
                            let tipoPersonalizacionDocs = bucket.doc_count;
                            let newIndex = `${newIndexPattern}_${country.toLowerCase()}_${campaign}_${tipoPersonalizacion.toLowerCase()}`;
                            console.log("newIndex", newIndex);
                            //verificar si el indice a crear ya existe
                            let exists = await client.indices.exists({index: newIndex});
                            console.log("exists", exists);
                            if(!exists) {
                                //reindexar
                                let reindexResponse = await client.reindex({                                    
                                    wait_for_completion: false,
                                    body: {
                                        "conflicts": "proceed",
                                        "source": {
                                            "index": currentIndexName,
                                            "query": {
                                                "bool":{
                                                  "must": [
                                                    {"term": {"tipoPersonalizacion": tipoPersonalizacion}},
                                                    {"term": {"activo": true}}
                                                  ]
                                                }
                                            }
                                        },
                                        "dest": {
                                            "index": newIndex
                                        }
                                    }
                                  })
                                
                                console.log("reindexResponse", reindexResponse);
                                let taskId = reindexResponse.task;
                                let taskPending = true;
                                while (taskPending) {
                                    let task = await client.tasks.get({
                                        task_id: taskId
                                    });
                                    console.log(`Task: ${taskId} completed: ${task.completed}`);
                                    if(task && task.completed === true) {
                                        taskPending = false;                                        
                                    }
                                    await delayAsync(5000);
                                }
                            }
                        }
                    }

                    
                }
            }
        }
    }
})();

function delayAsync(millis) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(response), millis)
        });
}