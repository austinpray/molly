const _ = require("lodash");
const moment = require("moment");
const sentiment = require("sentiment");

const sentimentKey = "sentiment";
function buildSentimentKey(arr = []) {
  return [sentimentKey].concat(arr).join(":");
}

module.exports.collectSentimentData = _.curry(function ({redis}, res) {
  const {score, comparative} = sentiment(res.message.text);

  const dateKey = moment().format("Y-MM-DD");
  const user = res.message.user.name;

  redis
    .multi()
    .sadd(
      buildSentimentKey(),
      buildSentimentKey([user])
    )
    .hset(buildSentimentKey([user]), "name", user)
    .hincrbyfloat(buildSentimentKey([user]), "score", score)
    .hincrbyfloat(buildSentimentKey([user]), "comparative", comparative)
    .hincrby(buildSentimentKey([user]), "count", 1)
    .exec();

});

module.exports.dumpSentimentData = _.curry(function ({redis}, res) {
  if (res.message.user.name !== "austin" && process.env.NODE_ENV !== "development") {
    return;
  }
  let query = redis.multi();
  redis.smembers(buildSentimentKey(), function (err, results) {
    if (results) {
      _.each(results, function (user) {
        query = query.hgetall(user);
      });
      query.exec(function (err, results) {
        res.reply(_.reduce(results, function (acc, res) {
          return acc +
            `*${res.name}*: ` +
            `Total sentiment score is ${res.score}. ` +
            `Comparative score is ${res.comparative}. ` +
            `Message count is ${res.count}. ` +
            `Computed score is ${_.toNumber(res.score)/_.toNumber(res.count)}`;
        }, ""));
      })
    }
  })
});