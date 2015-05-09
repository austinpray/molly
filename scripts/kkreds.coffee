# Description:
#   Minable currency for your chat
#
# Commands:
#   hubot balance - get the asker's balance
#   pay me - during special times 2x/day you can get kkreds
#   hubot pay (person) (amount) - give a person kkreds
#
# Notes:
#   have fun
#
# Author:
#   austinpray

Decimal = require "decimal.js"
validator = require "validator"

module.exports = (robot) ->

  getUser = (res) ->
    return res.message.user.name.toLowerCase()

  class User
    constructor: (res) ->
      if typeof res is "string"
        # just set name explicitly
        @name = res
      if typeof res is "object"
        # probably a res object
        @name = res.message.user.name.toLowerCase()

      data = robot.brain.get("kkreds-user-#{@name}") || {}

      @kkreds =  new Decimal(data.kkreds || 0)
      @transactions = data.transactions || []
      @debounce = data.debounce || null

    credit: (amount) ->
      @kkreds = @kkreds.plus(amount)

    debit: (amount) ->
      @kkreds = @kkreds.minus(amount)

    # send kkreds to user
    # amount (number)
    # target (User)
    send: (amount, target) ->
      if @kkreds.comparedTo(amount) == -1 # have enough creds?
        return {success: false, message: "You do not have enough kkreds"}
      else
        @debit(amount)
        target.credit(amount)
        return {
          success: true,
          message: "Successfully sent #{amount} to #{target.name}"
        }

    save: ->
      robot.brain.set "kkreds-user-#{@name}", {
        kkreds: @kkreds.toString(),
        transactions: @transactions,
        debounce: @debounce
      }

    @exists: (name) ->
      return !!robot.brain.get("kkreds-user-#{name}")

  # get user balance
  robot.respond /balance/i, (res) ->
    user = new User(res)
    res.reply "you have #{user.kkreds.toFormat()} kkreds"

  # mining kkreds at special times
  triggers = [
    "(gibbe|give( me)?) money",
    "pay me( bitch)?",
    ":watermelon:"
  ]

  robot.hear new RegExp(triggers.join("|"), "i"), (res) ->
    current = new Date()
    currentUTC = Date.UTC(
      current.getUTCFullYear(),
      current.getUTCMonth(),
      current.getUTCDay(),
      current.getUTCHours(),
      current.getUTCMinutes(),
    )

    specialTimes = [
      Date.UTC(
        current.getUTCFullYear(),
        current.getUTCMonth(),
        current.getUTCDay(),
        4+5, # 4:20 am CST
        20
      ),
      Date.UTC(
        current.getUTCFullYear(),
        current.getUTCMonth(),
        current.getUTCDay(),
        16+5 # 4:20 pm CST
        20
      )
    ]

    user = new User(res)

    is420 = specialTimes.some (t) ->
      return currentUTC == t

    # aight I'm going to bed
    hasNotParticipatedThisMeridian = currentUTC != user.debounce

    if is420 && hasNotParticipatedThisMeridian
      user.credit(1)
      user.debounce = currentUTC
      user.save()
      res.reply "successfully mined 1 kkred"

  robot.respond /(pay|tip|give|send) (\S*) (\S*)/i, (res) ->
    sender = new User(res)
    target = res.match[2]
    amount = res.match[3]

    if !target
      return res.reply "Need to specify a target"
    else
      target = target.replace('@', '') # strip @ mention

    if !amount
      return res.reply "Need to specify amount"

    # validation
    if !validator.isAlphanumeric(target)
      return res.reply "Invalid characters in username"
    if !validator.isFloat(amount)
      return res.reply "Amount needs to be a number"


    if User.exists(target)
      target = new User(target)
      if sender.name.toLowerCase() != target.name.toLowerCase()
        result = sender.send(amount, target)
        if result.success
          sender.save()
          target.save()

        return res.reply result.message
      else
        return res.reply "You can't trade yourself lol"
    else
      return res.reply "#{target} does not have an account"


