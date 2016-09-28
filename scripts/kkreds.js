// Description:
//   Minable currency for your chat
//
// Commands:
//   hubot balance - get the asker's balance
//   pay me - during special times 2x/day you can get kkreds
//   hubot pay (person) (amount) - give a person kkreds
//
// Notes:
//   have fun
//
// Author:
//   austinpray

let Decimal = require("toformat")(require("decimal.js"));
import validator from "validator";

export default function(robot) {

  let getUser = res => res.message.user.name.toLowerCase();

  class User {
    constructor(res) {
      if (typeof res === "string") {
        // just set name explicitly
        this.name = res;
      }
      if (typeof res === "object") {
        // probably a res object
        this.name = res.message.user.name.toLowerCase();
      }

      let data = robot.brain.get(`kkreds-user-${this.name}`) || {};

      this.kkreds =  new Decimal(data.kkreds || 0);
      this.transactions = data.transactions || [];
      this.debounce = data.debounce || null;
    }

    credit(amount) {
      return this.kkreds = this.kkreds.plus(amount);
    }

    debit(amount) {
      return this.kkreds = this.kkreds.minus(amount);
    }

    // send kkreds to user
    // amount (number)
    // target (User)
    send(amount, target) {
      if (new Decimal(amount).comparedTo(0) === -1) {
        return {success: false, message: "Amount must be positive"};
      }

      if (this.kkreds.comparedTo(amount) === -1) { // have enough creds?
        return {success: false, message: "You do not have enough kkreds"};
      } else {
        this.debit(amount);
        target.credit(amount);
        return {
          success: true,
          message: `Successfully sent ${amount} to ${target.name}`
        };
      }
    }

    save() {
      return robot.brain.set(`kkreds-user-${this.name}`, {
        kkreds: this.kkreds.toString(),
        transactions: this.transactions,
        debounce: this.debounce
      });
    }

    static exists(name) {
      return !!robot.brain.get(`kkreds-user-${name}`);
    }
  }

  // get user balance
  robot.respond(/balance/i, function(res) {
    let user = new User(res);
    return res.reply(`you have ${user.kkreds.toFormat()} kkreds`);
  }
  );

  // mining kkreds at special times
  let triggers = [
    "(gibbe|give( me)?) money",
    "pay me( bitch)?",
    ":watermelon:"
  ];

  robot.hear(new RegExp(triggers.join("|"), "i"), function(res) {
    let current = new Date();
    let currentUTC = Date.UTC(
      current.getUTCFullYear(),
      current.getUTCMonth(),
      current.getUTCDay(),
      current.getUTCHours(),
      current.getUTCMinutes()
    );

    let is420 = robot.check420(current);
    let user = new User(res);

    if (["ridbot", "hal", "viper"].indexOf(user.name) > -1) {
      return;
    }

    // aight I'm going to bed
    let hasNotParticipatedThisMeridian = currentUTC !== user.debounce;

    if (is420 && hasNotParticipatedThisMeridian) {
      let amount = robot.isSuper420(current) ? 42 : 1;
      user.credit(amount);
      user.debounce = currentUTC;
      user.save();
      let currency = amount === 1 ? "kkred" : "kkreds";
      let successMessage = `successfully mined ${amount} ${currency}`;
      console.log(`${user.name} ${successMessage}`);
      return res.reply(successMessage);
    }
  }
  );

  robot.toUTC = current =>
    Date.UTC(
      current.getUTCFullYear(),
      current.getUTCMonth(),
      current.getUTCDay(),
      current.getUTCHours(),
      current.getUTCMinutes()
    )
  ;

  robot.isSuper420 = function(current) {
    let day420 = Date.UTC(
      current.getUTCFullYear(),
      4-1,
      20
    );
    let dayCurrent = Date.UTC(
      current.getUTCFullYear(),
      current.getUTCMonth(),
      current.getUTCDate()
    );

    return day420 === dayCurrent;
  };

  robot.check420 = function(current) {
    let currentUTC = robot.toUTC(current);
    let currentOffset = current.getTimezoneOffset() / 60;
    let specialTimes = [
      Date.UTC(
        current.getUTCFullYear(),
        current.getUTCMonth(),
        current.getUTCDay(),
        4 + currentOffset, // 4:20 am CST
        20
      ),
      Date.UTC(
        current.getUTCFullYear(),
        current.getUTCMonth(),
        current.getUTCDay(),
        16 + currentOffset, // 4:20 pm CST
        20
      )
    ];

    let is420 = specialTimes.some(t => currentUTC === t);
    return is420;
  };


  return robot.respond(/(pay|tip|give|send) (\S*) (\S*)/i, function(res) {
    let sender = new User(res);
    let target = res.match[2];
    let amount = res.match[3];

    if (!target) {
      return res.reply("Need to specify a target");
    } else {
      target = target.replace('@', ''); // strip @ mention
      target = target.toLowerCase();
    }

    if (!amount) {
      return res.reply("Need to specify amount");
    }

    // validation
    if (!validator.isAlphanumeric(target)) {
      return res.reply("Invalid characters in username");
    }
    if (!validator.isFloat(amount)) {
      return res.reply("Amount needs to be a number");
    }


    if (User.exists(target)) {
      target = new User(target);
      if (sender.name.toLowerCase() !== target.name.toLowerCase()) {
        let result = sender.send(amount, target);
        if (result.success) {
          sender.save();
          target.save();
        }

        return res.reply(result.message);
      } else {
        return res.reply("You can't trade yourself lol");
      }
    } else {
      return res.reply(`${target} does not have an account`);
    }
  }
  );
};


