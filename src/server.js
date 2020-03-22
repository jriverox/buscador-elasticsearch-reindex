const ElasticManager = require("./elasticManager");
const Utils = require("./utils");
const config = require("../config");

module.exports = class {
  constructor(clusterId) {
    this.clusterId = clusterId;
    this.elasticManager = new ElasticManager(clusterId);
  }

  async execJob() {
    const countries = this.elasticManager.getCluster().COUNTRIES;
    const indices = await elasticManager.catIndices("producto_v");
    await this.evaluateTasksIncluster();
    await Utils.asyncForEach(countries, async country => {
      const campaignList =
        config.CAMPAIGNS_BY_COUNTRIES[country] ||
        config.CAMPAIGNS_BY_COUNTRIES["DEFAULT"];

      for (let i = 0; i < config.PERSONALIZATION.length; i++) {
        const personalization = config.PERSONALIZATION[i];
        for (let j = 0; j < campaignList.length; j++) {
          const campaign = campaignList[j];
          const indexName = `${config.ELASTICSEARCH.INDEX_PATTERN}_${country}_${campaign}`;
          const newIndexName = `${config.ELASTICSEARCH.NEW_INDEX_PATTERN}_${country}_${campaign}_${personalization.toLowerCase()}`;
          const existIndex = indices.find(i => {
            return i.index === indexName;
          });
          const existNewIndex = indices.find(i => {
            return i.index === newIndexName;
          });
          if (existIndex && !existNewIndex) {

          }
        }
      }
    });
  }

  async reindexar() {}

  async evaluateTasksIncluster() {
    try {
      const body = { query: { term: { completed: true } } };
      const response = await this.elasticManager.search(
        config.NAME_INDEX_LOG,
        body
      );
      await Utils.asyncForEach(response.hits.hits, async item => {
        const _source = item._source;
        const taskId = _source.taskId;
        const taskComplete = await this.evaluateTaskId(taskId);
        await this.elasticManager.insertLog(
          _source.indexName,
          _source.startTime,
          _source.taskId,
          _source.endTime,
          taskComplete,
          _source.docs,
          _source.executionTime,
          _source.hasError,
          _source.exception
        );
      });
    } catch (error) {
      console.log(
        `evaluateTasks error type: ${error.body.error.type}, index: ${error.body.error.index}`
      );
    }
  }

  async evaluateTaskId(taskId) {
    let inWhile = true;
    let taskComplete = {};
    while (inWhile) {
      let task = this.elasticManager.tasksGet(taskId);
      if (task.completed) {
        taskComplete = task;
        inWhile = task.completed;
      } else {
        await Utils.backoff(30000);
      }
    }
    return taskComplete;
  }
};
