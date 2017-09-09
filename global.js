const debug = require("debug");
let APP_NAME = "";

function setAppName(an) {
    APP_NAME = an;
}

function getNameSpace(file) {
    let appfile = "";
    if(file) {
        appfile = ":" + file;
    }
    return APP_NAME + appfile;
}

module.exports.debug = function(file) {
    return debug(getNameSpace(file) + ":dbg");
};

module.exports.error = function(file) {
    return debug(getNameSpace(file) + ":err");
};

module.exports.info = function(file) {
    return debug(getNameSpace(file) + ":inf");
};

module.exports.trace = function(file) {
    return debug(getNameSpace(file) + ":trc");
};

let BROADCAST = false;
let DEBUG = false;
let TRACE = false;

module.exports.broadcast = BROADCAST;

function updateDebugNamespace() {
    if(typeof process.env.DEBUG == "undefined") {
        let dbgNamespace = `${getNameSpace()}*:err,${getNameSpace()}*:wrn,${getNameSpace()}*:inf`;
        if(DEBUG) {
            dbgNamespace += `,${getNameSpace()}*:dbg`;
        }
        if(TRACE) {
            dbgNamespace += `,${getNameSpace()}*:trc`;
        }
        require("debug").enable(dbgNamespace);
    }    
}

module.exports.enableDebug = function() {
    DEBUG = true;
    updateDebugNamespace();
}

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
    updateDebugNamespace();
}
