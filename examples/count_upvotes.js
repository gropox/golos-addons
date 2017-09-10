const ga = require("../index");

/**
 * Start with...
 * node get_curation_rewards
 */


ga.global.initApp("cu");

const debug = ga.global.debug("count_upvotes");
const info = ga.global.info("count_upvotes");

info(ga.global.CONFIG.roq);

class Scanner {
    constructor(userid, minBlock) {
        this.minBlock = minBlock;
        this.count = 0;
        this.userid = userid;
    }

    process(he) {
        const id = he[0];
        const tr = he[1];
        const block = tr.block;
        if(block < this.minBlock) {
            return true;
        }
        const op = tr.op[0];
        const opBody = tr.op[1];
        switch(op) {
            case "vote":
                if(opBody.voter == this.userid) {
                    this.count++;
                }
                break;
        }
    }
}

async function scan() {

    const BLOCKS_AGO = ((60 * 60 * 24 * 1) / 3);

    let props = await ga.golos.getCurrentServerTimeAndBlock();

    let scanner = new Scanner("coinbank", props.block - BLOCKS_AGO);
    await ga.golos.scanUserHistory("coinbank", scanner);
    info("count = " + scanner.count);
    process.exit(0);
}

scan();