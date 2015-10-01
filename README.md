# browsermob-proxy-runner
A library to download and launch the Browsermob-proxy Server.

```javascript
var browsermobRunner = require('browsermob-proxy-runner')
browsermobRunner(function(er, browsermob) {
  // browsermob-proxy is running
  // browsermob.host / browsermob.port are available
  // browsermob is a child process, so you can do browsermob.kill()
})
```

Testing
---

```sh
npm test
```