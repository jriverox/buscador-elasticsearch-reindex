const elasticClient = require("elasticsearch");
const yenv = require("yenv");

const config = yenv();

module.exports = class {
  constructor(clusterId) {
    this.clusterId = clusterId;
    this.client = this.createClient();
  }

  getCluster() {
    return config.ELASTICSEARCH.CLUSTERS.find(x => {
      return x.ID === this.clusterId;
    });
  }

  createClient() {
    const cluster = this.getCluster();
    return new elasticClient.Client({
      host: cluster.ENDPOINT
    });
  }

  async tasksGet(taskId) {
    const response = await this.client.tasks.get({
      taskId: taskId
    });
    return response;
  }

  async search(indexName, body) {
    return await this.client.search({
      index: indexName,
      type: "_doc",
      body
    });
  }

  async count(indexName, body) {
    return await this.client.count({
      index: indexName,
      type: "_doc",
      body
    });
  }

  async catIndices(indexPattern) {
    return await this.client.cat.indices({
      index: `${indexPattern}*`,
      h: ["index", "docs.count"],
      s: "index",
      format: "json"
    });
  }

  async reindex(nameIndex, newIndexName, personalization) {
    return await this.client.reindex({
      waitForCompletion: false,
      body: {
        conflicts: "proceed",
        source: {
          index: nameIndex,
          query: {
            bool: {
              must: [
                { term: { tipoPersonalizacion: personalization } },
                { term: { activo: true } }
              ]
            }
          }
        },
        dest: {
          index: newIndexName
        }
      }
    });
  }

  async insertLog(
    indexName,
    newIndexName,
    startTime,
    taskId,
    endTime,
    completed,
    docs,
    executionTime,
    hasError,
    exception,
    lastCheckTime = ""
  ) {
    let body = [];
    let item = {
      header: {
        update: {
          _index: config.NAME_INDEX_LOG,
          _type: "_doc",
          _id: newIndexName
        }
      },
      doc: {
        doc: {
          indexName,
          newIndexName,
          startTime,
          taskId,
          endTime,
          completed,
          docs,
          executionTime,
          hasError,
          exception,
          lastCheckTime
        },
        doc_as_upsert: true
      }
    };

    body.push(item.header);
    body.push(item.doc);
    return await this.client.bulk({ body });
  }

  async aggregate(currentIndexName) {
    return await this.client.search({
      size: 0,
      index: currentIndexName,
      filter_path: "aggregations.tipoPersonalizacion.buckets,hits.total",
      body:{
          "query":{
            "term": {"activo": true}
          },
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
  }
};
