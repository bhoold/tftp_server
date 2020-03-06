const Server = require('./server');

let config = {};
if(process.argv.length > 2) {
  process.argv.forEach((val, index) => {
    if(index < 2)
      return;
    let arr = val.split('=');
    switch(arr[0]) {
      case '--documentRoot':
        config.documentRoot = arr[1];
        break;
      case '--port':
          config.port = arr[1];
        break;
    }
  });
}


let tftp = new Server(config);
tftp.run();



