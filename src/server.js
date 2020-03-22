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
    const indices = await this.elasticManager.catIndices("producto_v");
    await this.evaluateTasksIncluster();
    await Utils.asyncForEach(countries, async country => {
      const campaignList =
        config.CAMPAIGNS_BY_COUNTRIES[country] ||
        config.CAMPAIGNS_BY_COUNTRIES["DEFAULT"];

      for (let i = 0; i < config.PERSONALIZATION.length; i++) {
        const personalization = config.PERSONALIZATION[i];
        let promise = [];
        for (let j = 0; j < campaignList.length; j++) {
          const campaign = campaignList[j];
          const indexName = `${config.ELASTICSEARCH.INDEX_PATTERN}_${country.toLowerCase()}_${campaign}`;
          const newIndexName = `${config.ELASTICSEARCH.NEW_INDEX_PATTERN}_${country.toLowerCase()}_${campaign}_${personalization.toLowerCase()}`;
          const existIndex = indices.find(i => { return i.index === indexName; });
          const existNewIndex = indices.find(i => { return i.index === newIndexName; });
          const startTime = new Date();
          if (existIndex && !existNewIndex) {
            promise.push(this.elasticManager.reindex(indexName, newIndexName, personalization).then(res => {
              return { indexName, newIndexName, startTime, res: res };
            }));
          }
        }
        const dataReindex = await Promise.all(promise);

        let complete = true;

        //while (complete) {
        promise = [];
        for (let i = 0; i < dataReindex.length; i++) {
          const item = dataReindex[i];
          console.log("item", item.res.task);
          promise.push(this.elasticManager.tasksGet(item.res.task).then(res => {
            return res
          }));
        }
        const dataTask = await Promise.all(promise);
        console.log("dataTask", dataTask);

        //}
      }
    });
  }

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
        const taskResponse = await this.evaluateTaskId(taskId);
        await this.elasticManager.insertLog(
          _source.indexName,
          _source.startTime,
          _source.taskId,
          _source.endTime,
          taskResponse.completed,
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
    let taskReturn = {};
    while (inWhile) {
      let task = this.elasticManager.tasksGet(taskId);
      if (task.completed) {
        taskReturn = task;
        inWhile = task.completed;
      } else {
        await Utils.backoff(30000);
      }
    }
    return taskReturn;
  }
};
