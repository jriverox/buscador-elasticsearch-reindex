module.exports = class {
  static async backoff(delay) {
    return new Promise(res => setTimeout(res, delay));
  }

  static async asyncForEach(array, callback) {
    for (let i = 0; i < array.length; i++) {
      await callback(array[i], i, array);
    }
  }

  static nanoSecondsTotime(timeInNanoSeconds) {
    let timeInSeconds = parseInt(timeInNanoSeconds / 1000000000);
    let pad = function(num, size) {
        return ("000" + num).slice(size * -1);
      },
      time = parseFloat(timeInSeconds).toFixed(3),
      hours = Math.floor(time / 60 / 60),
      minutes = Math.floor(time / 60) % 60,
      seconds = Math.floor(time - minutes * 60),
      milliseconds = time.slice(-3);

    return (
      pad(hours, 2) +
      ":" +
      pad(minutes, 2) +
      ":" +
      pad(seconds, 2) +
      "," +
      pad(milliseconds, 3)
    );
  }
};
