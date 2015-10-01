/**
 * Created by dunght163 on 10/1/15.
 */
var browsermobRunner = require('../lib/browsermob-proxy-runner');

process.env.BROWSERMOB_RUNNER_PORT = '8080';
browsermobRunner(function(er, browsermob){
    delete process.env.BROWSERMOB_RUNNER_PORT;
    if (er) {
        console.log('error: ' + er);
        return;
    }

    console.log('browsermob host: ' + browsermob.host);
    console.log('browsermob port: ' + browsermob.port);

    browsermob.on('exit', function() {
        console.log('exit');
    });

    setTimeout(function(){
        browsermob.kill();
    }, 5000);
});