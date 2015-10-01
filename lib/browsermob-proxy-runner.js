var fs = require('fs')
    , path = require('path')
    , https = require('https')
    , request = require('request')
    , spawn = require('child_process').spawn
    , freeport = require('freeport')
    , EventEmitter = require('events').EventEmitter
    , util = require('util')
    , portscanner = require('portscanner')
    , extract = require('extract-zip');

var override = process.env.BROWSERMOB_VERSION ? process.env.BROWSERMOB_VERSION : []
    , version = override[0] || '2.0.0'
    , filename = 'browsermob-proxy-' + version + '-bin' + '.zip'
    , url = 'https://github.com/lightbody/browsermob-proxy/releases/download/' + 'browsermob-proxy-' + version + '/' + filename
    , outfile = path.join(path.dirname(__filename), filename);

/**
 * download browsermob-proxy-server-<version>.zip
 * @param url
 * @param outfile
 * @param cb
 */
function download(url, outfile, cb) {
    var real = function () {
        console.log('Downloading Browsermob ' + version);
        console.log('From: ' + url);

        var options = {
            hostname: 'github.com',
            port: 443,
            path: url,
            method: 'GET'
        };

        var file = fs.createWriteStream(outfile);

        https.request(options, function (res) {
            console.log("statusCode: ", res.statusCode);
            console.log("headers: ", res.headers);
            res
                .on('data', function (d) {
                    file.write(d);
                })
                .on('end', function () {
                    extract(outfile, {dir: './'}, function (err) {
                        if (err) console.log("error: ", err);
                        cb()
                    });
                })
                .on('error', function (e) {
                    console.error(e);
                });
        });
    };

    fs.stat(outfile, function (er, stat) {
        console.log('stat: ' + JSON.stringify(stat));

        if (er) return real();

        cb()
    })
}

/**
 * Run Browsermob server with port
 * @param host
 * @param port
 * @param cb
 */
function runBrowsermob(host, port, cb) {
    var _outfile = outfile.replace('-bin.zip', '') + '/bin/browsermob-proxy';
    console.log('Starting Browsermob ' + version + ' on port ' + port);
    console.log('Filename: ' + _outfile);

    var child = spawn('sh', [
        _outfile,
        '-port', port
    ]);

    console.log('runBrowsermob: ' + host + ':' + port);
    child.host = host;
    child.port = port;

    var badExit = function () {
        cb(new Error('Could not start Browsermob.'))
    };

    child.stderr.on('data', function (data) {
        var sentinal = 'Started SelectChannelConnector';

        if (data.toString().indexOf(sentinal) != -1) {
            child.removeListener('exit', badExit);
            cb(null, child)
        } else {
            console.log('Browsermob started on ' + host + ':' + port);
        }
    });

    child.on('exit', badExit)
}

/**
 * Run Browsermob server on a defined port
 * @param host
 * @param port
 * @param cb
 */
function runOnDefinedPort(host, port, cb) {
    portscanner.checkPortStatus(port, '127.0.0.1', function (error, status) {
        // Status is 'open' if currently in use or 'closed' if available
        console.log('port ' + port + ' is ' + status);

        if (status === 'open') {
            console.log('BROWSERMOB_RUNNER_PORT is currently opened => create FakeProcess');
            return process.nextTick(
                cb.bind(null, null, new FakeProcess(host, port)))
        }

        /* else (not opened), download and run Browsermob server on defined port */
        console.log('BROWSERMOB_RUNNER_PORT is currently not opened => start new process with port ' + port);
        download(url, outfile, function (er) {
            if (er) return cb(er);
            runBrowsermob(host, port, cb)
        })
    });
}

/**
 * Run Browsermob server on random port
 * @param host
 * @param cb
 */
function runOnRandomPort(host, cb) {
    /* find random free port */
    freeport(function (er, port) {
        if (er) throw er;

        runBrowsermob(host, port, cb);
    })
}

/**
 * Create fake process as real running process
 * @param host
 * @param port
 * @constructor
 */
function FakeProcess(host, port) {
    EventEmitter.call(this);
    this.host = host;
    this.port = port
}

util.inherits(FakeProcess, EventEmitter);
FakeProcess.prototype.kill = function () {
    this.emit('exit');
};

module.exports = function (cb) {
    var host = (process.env.BROWSERMOB_RUNNER_HOST ? process.env.BROWSERMOB_RUNNER_HOST : '127.0.0.1');
    var port = (process.env.BROWSERMOB_RUNNER_PORT ? process.env.BROWSERMOB_RUNNER_PORT : 0);

    /* if BROWSERMOB_RUNNER_PORT is defined */
    if (port > 0) {
        /* if BROWSERMOB_RUNNER_PORT is currently opened => create a FakeProcess connects to host:port */
        console.log('BROWSERMOB_RUNNER_PORT is defined as ' + port + ' => start new process defined port');
        runOnDefinedPort(host, port, cb);
    } else {
        /* else (not defined), download and run Browsermob server on random free port */
        console.log('BROWSERMOB_RUNNER_PORT is not defined => start new process with random free port');
        download(url, outfile, function (er) {
            if (er) return cb(er);
            runOnRandomPort(host, cb)
        })
    }
};