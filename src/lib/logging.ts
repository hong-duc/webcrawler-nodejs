import winston = require('winston');
import path = require('path');
let config = require(path.join(__dirname, "..", 'config.json'));

let logger = new (winston.Logger)({
    transports: [
        new (winston.transports.File)({
            filename: config.logging.filename,
            handleExceptions: true,
            humanReadableUnhandledException: true
        })
    ],
    exitOnError: false
});

export { logger }