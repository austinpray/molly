// Description:
//     watch items from microcenter
//
// Commands:
//     hubot microcenter add (url) - add watch item for richardson location
//     hubot microcenter remove (url) - remove watch item for richardson location
//     hubot microcenter list - list all watch items
//
// Notes:
//     weeeee
//
// Author:
//    austinpray

const {microcenterAdd, microcenterRemove, microcenterList} = require("../lib/microcenter");
const redis = require("redis").createClient(process.env.REDISTOGO_URL);

module.exports = function(robot) {
  robot.respond(/(?:microcenter|mc) add (\S*)/i, microcenterAdd({
    redis,
    http: robot.http.bind(robot)
  }));

  robot.respond(/(?:microcenter|mc) remove (\S*)/i, microcenterRemove({redis}));

  robot.respond(/(?:microcenter|mc) list/i, microcenterList({
    redis,
    http: robot.http.bind(robot)
  }));
};
