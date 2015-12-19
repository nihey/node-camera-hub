import React from 'react';
import ReactDOM from 'react-dom';
import io from 'socket.io-client';

import MultiRTC from 'multi-rtc';

var domain;
var socket;
var peers = new MultiRTC({channel: true});

peers.on('signal', function(id, signal) {
  socket.emit('signal', {
    dest: id,
    signal: signal,
  });
});

peers.on('connect', function(id) {
  console.info('connected to peer', id);
});

peers.on('disconnect', function(id) {
  console.info('disconnected to peer', id);
});


var connect = function() {
  socket = io('ws://nihey.org:9091', {
    'force new connection': true,
    'max reconnection attempts': Infinity,
  });

  socket.on('connect', function() {
    console.info('connected to the signal server');
    domain && socket.emit('join', domain);
  });

  socket.on('joined', function(id) {
    peers.add(id);
  });

  socket.on('signal', function(data) {
    peers.add(data.source, data.signal);
  });

  socket.on('disconnect', function() {
    console.info('disconnected to the signal server');
  });

  socket.on('error', function(error) {
    if (error.match(/ECONNREFUSED/)) {
      console.error('connection failed: trying again in 5 seconds');
      return setTimeout(connect, 5000);
    }
    console.error(error);
  });
};
connect();

let Index = React.createClass({
  onSubmit: function(event) {
    event.preventDefault();

    domain = this.refs.domain.value;
    this.setState({loading: true}, () => {
      socket.connected && socket.emit('join', domain);
    });
  },

  /*
   * ReactJS
   */

  componentDidMount: function() {
    this.refs.domain.focus();

    peers.on('data', (id, data) => {
      if (data === 'CAMERA-AVAILABLE') {
        this.setState({cameraPeer: id, loading: false});
        return peers.send({type: 'frame'}, id);
      }

      // Ask for the next frame;
      peers.send({type: 'frame'});
      // Don't use React to update this, so we don't get frame delay
      document.getElementById('stream').src = "data:image/png;base64," + data.content;
    });
  },

  getInitialState: function() {
    return {
      cameraPeer: null,
      image: null,
    };
  },

  render: function() {
    if (this.state.loading) {
      return <section className="ctnr">
        <div className="ldr">
          <div className="ldr-blk"></div>
          <div className="ldr-blk an_delay"></div>
          <div className="ldr-blk an_delay"></div>
          <div className="ldr-blk"></div>
        </div>
      </section>;
    }

    if (this.state.cameraPeer) {
      return <div>
        <img id="stream" src={"data:image/png;base64," + this.state.image}/>
      </div>
    }

    return <form onSubmit={this.onSubmit}>
      <input ref="domain" placeholder="domain" type="password" required="true"/>
      <button>enter</button>
    </form>
  },
});



ReactDOM.render(<Index/>, document.getElementById('react-body'));
