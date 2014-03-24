###
## @author : Sushma Pathak
##
require 'websocket/driver'
require 'eventmachine'
require 'json'

class WS
  attr_reader :env, :url

  def initialize(env)
    @env = env

    secure = Rack::Request.new(env).ssl?
    scheme = secure ? 'wss:' : 'ws:'
    @url = scheme + '//' + env['HTTP_HOST'] + env['REQUEST_URI']

    @driver = WebSocket::Driver.rack(self)

    env['rack.hijack'].call
    @io = env['rack.hijack_io']

    EM.attach(@io, Reader) { |conn| conn.driver = @driver }

    @driver.start
  end

  def write(string)
    @io.write(string)
  end

  module Reader
    attr_writer :driver

    def receive_data(string)
      @driver.parse(string)
    end
  end
end

module Connection
  attr_writer :userName, :client, :history, :type, :retMsg, :userType

  def initialize
    @type = [ 'success', 'inverse', 'default', 'warning', 'error', 'info', 'primary' ]
    @history = []
    @client = []

    @driver = WebSocket::Driver.server(self)
    #@client.push(@driver)

    @driver.on(:connect) { |e|
      if WebSocket::Driver.websocket?(@driver.env)
        @driver.start
        @userName = false
        @userType = false
        puts "Connection Accepted"
      else
        # handle other HTTP requests
      end
    }

    @driver.on(:message) { |e|
      if @userName == false
         @userName = e.data
         num = Random.rand(0...6)
         @userType =  @type[num]
         msg = {:type => "color", :data => @userType}
         @retMsg = JSON.generate(msg)
      elsif defined?(@userName) && (@userName != '') 
         msg = {:time => Time.now.to_i,
                :text => e.data,
                :author => @userName,
                :color => @userType
         }
         finalMsg = {:type => 'message', :data => msg}
         @retMsg = JSON.generate(finalMsg)
      else
         @retMsg = e.data
      end
     # for drive in @client
     @driver.text(@retMsg)
     # end
    }
    @driver.on(:close)   { |e|
      close_connection_after_writing
    }
  end

  def receive_data(data)
    @driver.parse(data)
  end

  def write(data)
    send_data(data)
  end
end

EM.run {
  EM.start_server('localhost', 8123, Connection)
}

