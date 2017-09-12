const global = require("./global");
const golos = require("golos-js");

const debug = global.debug("golos");
const info = global.info("golos");
const error = global.error("golos");
const trace = global.trace("golos");
const warn = global.warn("golos");

//golos.golos.config.set('websocket',global.CONFIG.golos_websocket);
//golos.golos.config.set('address_prefix',"GLS");
//golos.golos.config.set('chain_id', global.CONFIG.chain_id);

module.exports.setWebsocket = function(ws) {
    golos.config.set("websocket", ws);
}

module.exports.setPrefix = function(prefix) {
    golos.config.set("address_prefix", prefix);
}

module.exports.setChainId = function(id) {
    golos.config.set("chain_id", id);
}

var props = {};
var lastCommitedBlock = 0;

/** holt properties */
async function retrieveDynGlobProps() {
    props = await golos.api.getDynamicGlobalPropertiesAsync();
}

module.exports.retrieveDynGlobProps = retrieveDynGlobProps;

/** time in milliseconds */
async function getCurrentServerTimeAndBlock() {
    await retrieveDynGlobProps();
    if(props.time) { 
        lastCommitedBlock = props.last_irreversible_block_num;
        trace("lastCommitedBlock = " + lastCommitedBlock + ", headBlock = " + props.head_block_number);
        return {
            time : Date.parse(props.time), 
            block : props.head_block_number,
            commited_block :  props.last_irreversible_block_num
        };
    }
    throw "Current time could not be retrieved";
}


let HIST_BLOCK = 2000;

module.exports.setHistBlock = function(n) {
    HIST_BLOCK = n;
}

async function scanUserHistory(userid, scanner) {

    //scan user history backwards, and collect transfers
    let start = -1;
    let count = HIST_BLOCK;
    debug("scan history, userid = " + userid);
    while(start == -1 || start > 0) {
        debug("\tget history start = "+ start + ", count = " + count);
        let userHistory = await golos.api.getAccountHistoryAsync(userid, start, count);
        if(!(userHistory instanceof Array)) {
            error("not an array");
            return;
        }
        
        if(userHistory.length == 0) {
            error(userid + " has no history");
            return;
        }
        //trace("h = " + JSON.stringify(userHistory));
        let firstReadId = userHistory[0][0];
        trace("first id = " + firstReadId);
        let terminate = false;
        for(let h = 0; h < userHistory.length; h++) {
            trace("check hist id " + userHistory[h][0] + " / " + userHistory[h][1].op[0]);
            if(scanner.process(userHistory[h])) {
                if(!terminate) {
                    terminate = true;
                }
            }
        }
        trace("terminate = " + terminate);
        start = firstReadId-1;
        if(terminate || start <= 0) {
            break;
        }
        count = (start > HIST_BLOCK)?HIST_BLOCK:start;
    }
}

async function getContent(userid, permlink) {
    debug("retrive content for user " + userid + "/" + permlink);
    var content = await golos.api.getContentAsync(userid, permlink);
    if(permlink == content.permlink) {
        return content;
    } 
    return null;
}

module.exports.getContent = getContent;

async function getAccount(userid) {
    debug("get acc user " + userid);
    var users = await golos.api.getAccountsAsync([userid]);
    if(users && users.length > 0) {
        return users[0];
    } 
    return null;
}

function convertVerstings(vesting) {
    let SPMV = 1000000.0 * parseFloat(props.total_vesting_fund_steem.split(" ")[0]) / parseFloat(props.total_vesting_shares.split(" ")[0]);
    return SPMV * vesting / 1000000;
}

function convertGolos(golos) {
    let SPMV = 1000000.0 * parseFloat(props.total_vesting_fund_steem.split(" ")[0]) / parseFloat(props.total_vesting_shares.split(" ")[0]);
    return 1000000 * golos / SPMV;
}

module.exports.convertVestingToGolos = function (vesting) {
    let vests = parseFloat(vesting.split(" ")[0]);
    return (convertVerstings(vests).toFixed(3) + " GOLOS");
}

module.exports.convertGolosToVesting = function (golos) {
    golos = parseFloat(golos.split(" ")[0]);
    return (convertGolos(golos).toFixed(6) + " GESTS");
}

async function getUserGests(userid) {
    let user = await getAccount(userid);
    let ret = convertVerstings(parseFloat(user.vesting_shares.split(" ")[0]));
    debug(userid + " gests " + ret);
    return ret.toFixed(3);
}


module.exports.getUserBalance = async function(userid) {
    let blist = await golos.api.getAccountBalancesAsync(userid, []);
    let balance = {};
    for(let b of blist) {
        let sp = b.split(" ");
        balance[sp[1]] = parseFloat(sp[0]);
    }
    return balance;
}

async function getGolosPrice() {
    let book = await golos.api.getOrderBookAsync("GBG", "GOLOS", 1);
    debug("order book " + JSON.stringify(book));
    let ask_price = 0;
    let bid_price = 0;
    
    if(book.asks.length > 0) {
        ask_price = parseFloat(book.asks[0].price);
    } 
    if(book.bids.length > 0) {
        bid_price = parseFloat(book.bids[0].price);
    }

    if(ask_price == 0 && bid_price == 0) {
        throw "Unable to retrieve price infos!";
    } else if(ask_price > 0 && bid_price > 0) {
        const avg = (ask_price + bid_price) / 2;
        debug("calculate avg price "  + ask_price + " - " + bid_price + " = " + avg.toFixed(6));
        return avg;
    } else if(ask_price > 0) {
        warn("only ask_price available " + ask_price);
        return ask_price;
    } else {
        warn("only bid_price available " + bid_price);
        return bid_price;
    }
}

async function getReputation(userid) {
    let users = await getAccount(userid);
    if(users && users.length > 0) {
        return repLog10(users[0].reputation);
    }
    return 0;
}

function log10(str) {
    const leadingDigits = parseInt(str.substring(0, 4));
    const log = Math.log(leadingDigits) / Math.LN10 + 0.00000001
    const n = str.length - 1;
    return n + (log - parseInt(log));
}

function repLog10(rep2) {
    if(rep2 == null) return rep2
    let rep = String(rep2)
    const neg = rep.charAt(0) === '-'
    rep = neg ? rep.substring(1) : rep

    let out = log10(rep)
    if(isNaN(out)) out = 0
    out = Math.max(out - 9, 0); // @ -9, $0.50 earned is approx magnitude 1
    out = (neg ? -1 : 1) * out
    out = (out * 9) + 25 // 9 points per magnitude. center at 25
    // base-line 0 to darken and < 0 to auto hide (grep rephide)
    return out
}

module.exports.transfer = async function(wif, userid, receiver, amount, memo) {
    info("transfer " + receiver + ", " + amount + ", [" + memo + "]" );

    if(global.broadcast) {
        info("\tbroadcasting transfer");    
        await golos.broadcast.transferAsync(wif, userid, 
            receiver, amount, memo);
        
    } else {
        info("no broadcasting, dont transfer");
    }
}

module.exports.transferToVesting = async function(key, from, to, amount) {
    info("transfer to vesting " + to + ", " + amount );

    if(global.broadcast) {
        info("\tbroadcasting transfer to karma");    
        await golos.broadcast.transferToVestingAsync(key, from, to, amount);
    } else {
        info("no broadcasting, dont transfer to vestings");
    }
}

module.exports.getExceptionCause = function(e) {
    if(e.cause && e.cause.payload && e.cause.payload.error) {
        let m = e.cause.payload.error.message; 
        if(m) {
            let am = m.split("\n");
            m = am[0];
            for(let i = 1; i < am.length && i < 3; i++) {
                m += ": " + am[i];
            }
            return m;
        }
    }
    return e;
}

module.exports.getCurrentServerTimeAndBlock = getCurrentServerTimeAndBlock;
module.exports.scanUserHistory = scanUserHistory;
module.exports.getUserGests = getUserGests;
module.exports.convertVerstings = convertVerstings;
module.exports.convertGolos = convertGolos;
module.exports.getAccount = getAccount;
module.exports.getContent = getContent;
module.exports.getReputation = getReputation;
module.exports.getGolosPrice = getGolosPrice;
module.exports.golos = golos;
