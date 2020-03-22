const Utils = require("./utils");
const config = require("../config");

module.exports = class {
  async reindexar(elasticManager) {
    const countries = elasticManager.COUNTRIES;
    for (let i = 0; i < countries.length; i++) {
      const country = countries[i];
      const campaignList =
        config.CAMPAIGNS_BY_COUNTRIES[country] ||
        config.CAMPAIGNS_BY_COUNTRIES["DEFAULT"];
      for (let j = 0; j < campaignList.length; j++) {
        const campaign = campaignList[j];
        const indexName = `${config.ELASTICSEARCH.INDEX_PATTERN}_${country}_${campaign}`;
      }
    }
  }

  async getIndices(elasticManager) {
    return await elasticManager.catIndices("producto_v");
  }

  async evaluateTasksIncluster(elasticManager) {
    try {
      const body = { query: { term: { completed: true } } };
      const response = await elasticManager.search(config.NAME_INDEX_LOG, body);
      await Utils.asyncForEach(response.hits.hits, async item => {
        const _source = item._source;
        const taskId = _source.taskId;
        const taskComplete = await this.evaluateTaskId(elasticManager, taskId);
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

  async evaluateTaskId(elasticManager, taskId) {
    let inWhile = true;
    let taskComplete = {};
    while (inWhile) {
      let task = elasticManager.tasksGet(taskId);
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
