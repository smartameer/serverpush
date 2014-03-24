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
  attr_writer :userName

  def initialize
    @driver = WebSocket::Driver.server(self)

    @driver.on(:connect) do
      if WebSocket::Driver.websocket?(@driver.env)
        @userName = false
        @driver.start
      else
        # handle other HTTP requests
      end
    end

    @driver.on(:message) { |e| @driver.text(e.data) }
    @driver.on(:close)   { |e| close_connection_after_writing }
  end

  def receive_data(data)
    puts data.encoding
    puts data.force_encoding("iso-8859-1").force_encoding("utf-8")
    puts data.force_encoding("UTF-8").to_json
    puts @userName
    if @userName == false
      data = "msg"
    end
    @driver.parse(data)
  end

  def write(data)
    send_data(data)
  end
end

EM.run {
  EM.start_server('localhost', 8123, Connection)
}

