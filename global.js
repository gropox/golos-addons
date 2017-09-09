const debug = require("debug");
let APP_NAME = "";

function setAppName(an) {
    APP_NAME = an + ":";
}

module.exports.debug = function(file) {
    return debug(APP_NAME + file + ":dbg");
};

module.exports.error = function(file) {
    return debug(APP_NAME + file + ":err");
};

module.exports.info = function(file) {
    return debug(APP_NAME + file + ":inf");
};

module.exports.trace = function(file) {
    return debug(APP_NAME + file + ":trc");
};

let BROADCAST = false;
let DEBUG = false;
let TRACE = false;

module.exports.initApp = function(appName) {
    setAppName(appName);

    for(let val of process.argv) {
        switch(val) {
        case "broadcast" :
            BROADCAST = true;
            break;
        case "debug" :
            DEBUG = true;
            break;
        case "trace" :
            TRACE = true;
            DEBUG = true;
            break;
        }
    }

    if(typeof process.env.DEBUG == "undefined") {
        let dbgNamespace = "reward:err,reward:wrn,reward:inf";
        if(DEBUG) {
            dbgNamespace += ",reward:dbg";
        }
        if(TRACE) {
            dbgNamespace += ",reward:trc";
        }
        require("debug").enable(dbgNamespace);
    }
}
