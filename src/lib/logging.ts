import winston = require('winston');
import path = require('path');
let config = require(path.join(__dirname, "..", 'config.json'));

let logger = new (winston.Logger)({
    transports: [
        new (winston.transports.File)({
            filename: config.logging.filename,
            handleExceptions: true,
            humanReadableUnhandledException: true,
            "timestamp": () => {
                let date = new Date();
                return `${date.getUTCDate()}-${date.getUTCMonth()}-${date.getUTCFullYear()} ${date.getUTCHours()}:${date.getUTCMinutes()}:${date.getUTCSeconds()}`; 
            },
        })
    ],
    exitOnError: false
});

export { logger }