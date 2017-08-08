// Description:
//     add claps
//
// Commands:
//     hubot clap (something)
//
// Author:
//     austinpray

module.exports = function(robot) {
  robot.respond(/clap (.+)/i, function (res) {
    res.send(res.match[1].split(' ').join(' :clap: '));
  });
};
