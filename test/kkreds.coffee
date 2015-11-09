# lol
Helper = require('hubot-test-helper')
expect = require('chai').expect

helper = new Helper('../scripts/kkreds.coffee')

describe 'kkreds', ->
  beforeEach ->
    @room = helper.createRoom()

  afterEach ->
    @room.destroy()

  describe '420', ->
    it 'should handle 420 regardless of DST', ->
      # not 420 while daylight savings is active
      is420 = @room.robot.check420(new Date(2015, 11, 10, 3, 20, 0))
      expect(is420).to.equal(false)
      # 420 while daylight savings is active
      is420 = @room.robot.check420(new Date(2015, 11, 17, 4, 20, 0))
      expect(is420).to.equal(true)
      # not 420 while daylight savings is not active
      is420 = @room.robot.check420(new Date(2015, 6, 26, 3, 20, 0))
      expect(is420).to.equal(false)
      # 420 while daylight savings is not active
      is420 = @room.robot.check420(new Date(2015, 6, 26, 4, 20, 0))
      expect(is420).to.equal(true)

