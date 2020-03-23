const ElasticManager = require("./elasticManager");
const Utils = require("./utils");
const config = require("../config");

module.exports = class {
  constructor(clusterId) {
    this.clusterId = clusterId;
    this.elasticManager = new ElasticManager(clusterId);
  }

  async execJob() {
    console.log("Iniciar execJob");
    const countries = this.elasticManager.getCluster().COUNTRIES;
    const indices = await this.elasticManager.catIndices("producto_v");
    console.log("Evaluando tareas en procesos");
    await this.evaluateTasksIncluster();
    console.log("Terminó evaluando tareas en proceso");
    await Utils.asyncForEach(countries, async country => {
      const campaignList = config.CAMPAIGNS_BY_COUNTRIES[country] || config.CAMPAIGNS_BY_COUNTRIES["DEFAULT"];

      for (let i = 0; i < config.PERSONALIZATION.length; i++) {
        const personalization = config.PERSONALIZATION[i];
        let promise = [];
        console.log("inicio de:", personalization);
        for (let j = 0; j < campaignList.length; j++) {
          const campaign = campaignList[j];
          const indexName = `${config.ELASTICSEARCH.INDEX_PATTERN}_${country.toLowerCase()}_${campaign}`;
          const newIndexName = `${config.ELASTICSEARCH.NEW_INDEX_PATTERN}_${country.toLowerCase()}_${campaign}_${personalization.toLowerCase()}`;
          const existIndex = indices.find(i => { return i.index === indexName; });
          const existNewIndex = indices.find(i => { return i.index === newIndexName; });

          if (existIndex && !existNewIndex) {
            const countPersonalization = await this.getCountByPersonalization(indexName, personalization);
            console.log(`Contador personalization: ${personalization}, campaña: ${campaign}, count: ${countPersonalization.hits.total}`);
            if (countPersonalization.hits.total === 0) continue;

            const startTime = new Date();
              promise.push(this.elasticManager.reindex(indexName, newIndexName, personalization).then(res => {
                return { indexName, newIndexName, startTime, res: res };
              }));
          }
        }

        if (promise.length === 0) continue;
        console.log(`Ejecutando ${promise.length} promesas`);
        const dataReindex = await Promise.all(promise);

        let arrayTasks = [];
        for (let i = 0; i < dataReindex.length; i++) {
          const item = dataReindex[i];
          await this.elasticManager.insertLog(item.indexName, item.newIndexName, item.startTime, item.res.task, "", false, 0, "", false, "");
          arrayTasks.push({
            indexName: item.indexName,
            newIndexName: item.newIndexName,
            startTime: item.startTime,
            taskId: item.res.task,
          });
        }

        let completeTask = true;
        let incremet = 0;

        while (completeTask) {
          promise = [];
          let arrayBool = [];

          for (let i = 0; i < arrayTasks.length; i++) {
            const item = arrayTasks[i];
            const getTask = await this.elasticManager.tasksGet(item.taskId);
            arrayBool.push(getTask.completed);
            item.total = getTask.task.status.total;
            item.running_time_in_nanos = getTask.task.running_time_in_nanos
            console.log(`taskId: ${item.taskId} completed: ${getTask.completed}`);
          }

          if (arrayBool.every(x => x)) {
            completeTask = false;
            for (let i = 0; i < arrayTasks.length; i++) {
              const item = arrayTasks[i];
              const endTime = new Date();
              const timeString = Utils.nanoSecondsTotime(item.running_time_in_nanos);
              await this.elasticManager.insertLog(item.indexName, item.newIndexName, item.startTime, item.taskId, endTime, true, item.total, timeString, false, "");
            }
            console.log('Se termino proceso de:', personalization);
          } else {
            await Utils.backoff(config.DELAY_MILISECONDS);
            console.log("in While bucle", incremet++);
          }
        }
      }
    });
  }

  async evaluateTasksIncluster() {
    try {
      const body = { query: { term: { completed: false } } };
      const response = await this.elasticManager.search(
        config.NAME_INDEX_LOG,
        body
      );
      await Utils.asyncForEach(response.hits.hits, async item => {
        const _source = item._source;
        const taskId = _source.taskId;
        const taskResponse = await this.evaluateTaskId(taskId);
        const timeString = Utils.nanoSecondsTotime(taskResponse.task.running_time_in_nanos);
        await this.elasticManager.insertLog(
          _source.indexName,
          _source.newIndexName,
          _source.startTime,
          _source.taskId,
          new Date(),
          taskResponse.completed,
          _source.docs,
          timeString,
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
      let task = await this.elasticManager.tasksGet(taskId);
      if (task.completed) {
        taskReturn = task;
        inWhile = !task.completed;
      } else {
        await Utils.backoff(config.DELAY_MILISECONDS);
      }
    }
    return taskReturn;
  }

  async getCountByPersonalization(indexName, personalization) {
    const body = {
      size: 0,
      query: {
        bool: {
          must: [
            {
              term: {
                "activo": true
              }
            },
            {
              term: {
                "tipoPersonalizacion": personalization
              }
            }
          ]
        }
      }
    }
    return await this.elasticManager.search(indexName, body);
  }
};
