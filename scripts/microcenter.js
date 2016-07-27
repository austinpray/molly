// Description:
//     watch items from microcenter
//
// Commands:
//     hubot microcenter add (url) - add watch item for richardson location
//     hubot microcenter remove (id) - remove watch item for richardson location
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
  robot.respond(/microcenter add (\S*)/i, microcenterAdd({
    redis,
    http: robot.http.bind(robot)
  }));

  robot.respond(/microcenter remove (\S*)/i, microcenterRemove({redis}));

  robot.respond(/microcenter list/i, microcenterList({
    redis,
    http: robot.http.bind(robot)
  }));
};
