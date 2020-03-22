module.exports = class {
  static async backoff(delay) {
    return new Promise(res => setTimeout(res, delay));
  }

  static async asyncForEach(array, callback) {
    for (let i = 0; i < array.length; i++) {
      await callback(array[i], i, array);
    }
  }
};
