/**
 * Если отдельно, то 
 * const ga = require("golos-addons");
 */
const ga = require("../index");
const golos = ga.golos;
const global = ga.global;

//golos.golos.config.set('websocket', "ws://localhost:8090");

/**
 * Запуск...
 * node votebot debug
 */

ga.global.initApp("follow");
const log = global.getLogger("votewindow_stat");

class ContentCache {
    constructor() {
        this.created = {};
        this.contents = {};
    }

    async push(author, permlink) {
        const key = author + "/" + permlink;
        const content = await golos.getContent(author, permlink);
        const created = Date.parse(content.created);
        this.contents[key] = created;
        this.created[created] = content;
        return content;
    }

    /*
    cleanup(time) {
        for(let c of Object.keys(this.created)) {
            if(c > time) {
                delete this.created[c];
            }
        }
    }
    */

    async get(author, permlink, time) {
        const key = author + "/" + permlink;
        if(!this.contents[key]) {
            return await this.push(author, permlink);
        }
        let ret = this.created[this.contents[key]];
        //this.cleanup(time);
        return ret;
    }
}

class WindowStat {
    constructor() {
        this.rshares = [];
    }

    add(vote) {
        let sign = Math.sign(vote.weight);
        this.rshares.push(sign * (vote.rshares/1000000));
    }

    get median() {
        let count = 0;
        let sum = 0;
        if(this.rshares.length == 0) {
            return 0;
        }
        this.rshares.sort((a,b) => {return a - b;});

        return this.rshares[Math.floor(this.rshares.length / 2)];
    }

    get sum() {
        let count = this.rshares.length;
        let sum = 0;
        if(count == 0) {
            return 0;
        }
        for(let rs of this.rshares) {
            sum += rs;
        }
        return sum;
    }

    get avg() {
        let count = this.rshares.length;
        let sum = 0;
        if(count == 0) {
            return 0;
        }
        for(let rs of this.rshares) {
            sum += rs;
            count++;
        }
        return (sum / count);
    }
    get count() {
        return this.rshares.length;
    }
}

const WINDOW7 = (1000*60*60*24*7);
const WINDOW30 = (1000*60*60*24*30);


class ContentStats {
    constructor() {
        this.window7 = new WindowStat();
        this.window30 = new WindowStat();
        this.late = new WindowStat();
    }

    add(vote, delay) {
        if(delay <= WINDOW7) {
            this.window7.add(vote);
        } else if( delay <= WINDOW30) {
            this.window30.add(vote);
        } else {
            this.late.add(vote);
        }
    }
}

const stats = {};
const cache = new ContentCache();

function getStat(author, permlink) {
    const key = author + "/" + permlink;
    if(!stats[key]) {
        stats[key] = new ContentStats();
    }
    return stats[key];
}

async function processVote(vote, time) {
    //log.debug(JSON.stringify(vote));
    const content = await cache.get(vote.author, vote.permlink, time);
    //log.debug(JSON.stringify(content));
    const delay = time - Date.parse(content.created);
    
    for(let v of content.active_votes) {
        if(v.voter == vote.voter) {
            getStat(vote.author, vote.permlink).add(v, delay);
            return;
        }
    }
}


/**
 * Обрабатываем блок с определенным номером.
 * @param {*} bn 
 */
async function processBlock(bn) {
    //получаем все транзакции из блока
    let transactions = await golos.golos.api.getOpsInBlockAsync(bn, false);
    for(let tr of transactions) {
        let op = tr.op[0];
        let opBody = tr.op[1];
        let time = Date.parse(tr.timestamp);
        switch(op) {
            //нас интересует только комментарий к посту
            case "vote":
                await processVote(opBody, time);
                break;
        }
    }

}

async function run() {
    //Получаем текущий блок и серверное время 
    let props = await golos.getCurrentServerTimeAndBlock();
    let block = props.block - ((60*60*24*7)/3); //пропустим неделю
    const minBlock = block - ((60*60*24*7)/3); //за три месяца

    log.info("запускаем цикл с блока " + block + " до блока " + minBlock);
    while(block >= minBlock) {
        try {
            //Ищем команду в комментариях
            if(block % 100 == 0) {
                log.info("processed block = " + block);
            }
            await processBlock(block--);
        } catch(e) {
            log.error("Error catched in main loop!");
            log.error(golos.getExceptionCause(e));            
            await global.sleep(3000);
        }
    }

    console.log(`Пост\t7 Дней голосов\t7 Дней сумма\t7 Дней среднее\t7 Дней медиана\t30 Дней голосов\t30 Дней сумма\t30 Дней среднее\t30 Дней медиана\t> 30 Дней голосов\t> 30 Дней сумма\t> 30 Дней среднее\t> 30 Дней медиана`);
    for(let k of Object.keys(stats)) {
        console.log(`${k}\t${stats[k].window7.count}\t${stats[k].window7.sum.toFixed(2)}\t${stats[k].window7.avg.toFixed(2)}\t${stats[k].window7.median.toFixed(2)}\t${stats[k].window30.count}\t${stats[k].window30.sum.toFixed(2)}\t${stats[k].window30.avg.toFixed(2)}\t${stats[k].window30.median.toFixed(2)}\t${stats[k].late.count}\t${stats[k].late.sum.toFixed(2)}\t${stats[k].late.avg.toFixed(2)}\t${stats[k].late.median.toFixed(2)}`);
    }

    process.exit(0);
}

run();


