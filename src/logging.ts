import winston = require('winston');

let logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({ filename: 'server.log' })
    ]
});

module.exports = logger