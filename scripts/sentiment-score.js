// Description:
//     score communication based on sentiment
//
// Commands:
//     hubot sentiment report - dump sentiment data
//
// Author:
//     austinpray


const {collectSentimentData, dumpSentimentData} = require("../lib/sentiment-score");
const redis = require("redis").createClient(process.env.REDISTOGO_URL);

module.exports = function(robot) {
  robot.hear(/.*/i, collectSentimentData({redis}));
  robot.respond(/sentiment report/i, dumpSentimentData({redis}));
};
