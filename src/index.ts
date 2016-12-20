import {startRequest} from './lib/craw';

process.on('unhandledRejection', function (e) {
    console.log(e.message, e.stack)
})

// bắt đầu chạy
startRequest();
