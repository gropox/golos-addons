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

module.exports.getLogger = function (file) {
    return {
        debug : debug(getNameSpace(file) + ":dbg"),
        error : debug(getNameSpace(file) + ":err"),
        info : debug(getNameSpace(file) + ":inf"),
        trace : debug(getNameSpace(file) + ":trc"),
        warn : debug(getNameSpace(file) + ":wrn")
    };
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

module.exports.warn = function(file) {
    return debug(getNameSpace(file) + ":wrn");
};

let BROADCAST = false;
let DEBUG = false;
let TRACE = false;

module.exports.broadcast = BROADCAST;

function updateDebugNamespace() {
    if(typeof process.env.DEBUG == "undefined") {
        let dbgNamespace = `*:err,*:wrn,*:inf`;
        if(DEBUG) {
            dbgNamespace += `,*:dbg`;
        }
        if(TRACE) {
            dbgNamespace += `,*:trc`;
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
            module.exports.broadcast = true;
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
    loadConfig();
}

let CONFIG = {};
module.exports.CONFIG = CONFIG;

function getConfigDir() {
    if(process.env.CONFIGDIR) {
        return process.env.CONFIGDIR;
    } else {
        return ".";
    }
}

function loadConfig() {
    const fs = require("fs");

    const CONFIG_DIR = getConfigDir();
    const CONFIG_FILE = CONFIG_DIR + "/config.json";
    try {
        if(fs.existsSync(CONFIG_FILE)) {
            let sets = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
            for(var k in sets) CONFIG[k]=sets[k];
        }                
    } catch(e) {
        console.error("unable to read config (" + CONFIG_FILE + ")");
        console.error(e);
    }
}

module.exports.sleep = async function(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
