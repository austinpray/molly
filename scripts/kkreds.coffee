# Description:
#   Minable currency for your chat
#
# Commands:
#   hubot balance - get the asker's balance
#   pay me - during special times 2x/day you can get kkreds
#
# Notes:
#   have fun
#
# Author:
#   austinpray

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

      @kkreds =             data.kkreds || 0
      @transactions = data.transactions || []
      @debounce =          data.debouce || null

    credit: (amount) ->
      @kkreds += amount

    save: ->
      robot.brain.set "kkreds-user-#{@name}", {
        kkreds: @kkreds,
        transactions: @transactions
      }

  # get user balance
  robot.respond /balance/i, (res) ->
    user = new User(res)
    res.reply "you have #{user.kkreds} kkreds"

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
    hasNotParticipatedThisMeridian = currentUTC != user.debouce

    if is420 && hasNotParticipatedThisMeridian
      user.credit(1)
      user.debounce = currentUTC
      user.save()
      res.reply "successfully mined 1 kkred"
