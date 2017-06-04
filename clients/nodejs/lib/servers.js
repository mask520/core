'use strict';

// This code is based on a file of the same name that is part of greenlock-cli (see
// https://git.daplie.com/Daplie/greenlock-cli) and has been slightly modified
// (deleted one line) to suppress some output to the console.

var NOBJ = {};

module.exports.create = function (challenge) {
  var servers = {
    _servers: []

  , httpResponder: function (req, res) {
      var acmeChallengePrefix = '/.well-known/acme-challenge/';

      if (0 !== req.url.indexOf(acmeChallengePrefix)) {
        res.end("Let's Encrypt! Command line tool");
        return;
      }

      var token = req.url.slice(acmeChallengePrefix.length);

      challenge.get(NOBJ, req.headers.host.replace(/:.*/, ''), token, function (err, val) {
        res.end(val || '_ ERROR challenge not found _');
      });
    }

  , startServers: function (plainPorts, tlsPorts, opts) {
      opts = opts || {};

      var httpsOptions = opts.httpsOptions || require('localhost.daplie.me-certificates');
      var https = require('https');
      var http = require('http');

      if (servers._servers.length) {
        return;
      }

      // http-01-port
      plainPorts.forEach(function (port) {
        var server = http.createServer(servers.httpResponder);

        servers._servers.push(server);
        server.listen(port, function () {
          if (opts.debug) {
            console.info('Listening http on', this.address());
          }
        });
        server.on('error', function (err) {
          if ('EADDRINUSE' === err.code) {
            console.error("");
            console.error("You already have a different server running on port '" + port + "'.");
            console.error("You should probably use the --webroot-path option instead of --standalone.");
            return;
          }
          throw err;
        });
      });

      // tls-sni-01-port
      tlsPorts.forEach(function (port) {
        var server = https.createServer(httpsOptions, servers.httpResponder);

        servers._servers.push(server);
        server.listen(port, function () {
          if (opts.debug) {
            console.info('Listening https on', this.address());
          }
        });
        server.on('error', function (err) {
          if ('EADDRINUSE' === err.code) {
            console.error("");
            console.error("You already have a different server running on port '" + port + "'.");
            console.error("You should probably use the --webroot-path option instead of --standalone.");
            return;
          }
          throw err;
        });
      });

    }

  , closeServers: function (opts) {
      opts = opts || {};
      return new Promise(function (done) {
        var closedServers = 0;
        var serversToClose = servers._servers.length;
        if (0 === serversToClose) {
          done();
        }

        servers._servers.forEach(function (server) {
          server.close(function () {
            if (serversToClose === ++closedServers) {
              if (opts.debug) {
                console.info('Closed all servers');
              }
              servers._servers = [];
              done();
            }
          });
        });
      });
    }
  };

  return servers;
};
