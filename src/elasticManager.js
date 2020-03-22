const elasticClient = require("elasticsearch");
const config = require("../config");
const yenv = require("yenv");

const env = yenv();

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

  async catIndices(indexPattern) {
    return await client.cat.indices({
      index: `${indexPattern}*`,
      h: ["index", "docs.count"],
      s: "index",
      format: "json"
    });
  }

  async insertLog(
    indexName,
    startTime,
    taskId,
    endTime,
    completed,
    docs,
    executionTime,
    hasError,
    exception
  ) {
    let body = [];
    let item = {
      header: {
        update: {
          _index: config.NAME_INDEX_LOG,
          _type: "_doc",
          _id: taskId
        }
      },
      doc: {
        doc: {
          indexName,
          startTime,
          taskId,
          endTime,
          completed,
          docs,
          executionTime,
          hasError,
          exception
        },
        doc_as_upsert: true
      }
    };

    body.push(item.header);
    body.push(item.doc);
    return await this.client.bulk({ body });
  }
};
