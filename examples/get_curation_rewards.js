const ga = require("../index");

/**
 * Start with...
 * node get_curation_rewards
 */


ga.global.initApp("gcr");

const debug = ga.global.debug("get_curation_rewards");
const info = ga.global.info("get_curation_rewards");

info(ga.global.CONFIG.roq);

class Scanner {
    constructor(minBlock) {
        this.minBlock = minBlock;
        this.sum = ga.asset.ZERO_GESTS;
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
            case "curation_reward":
                debug("add " + ga.golos.convertVestingToGolos(opBody.reward));
                this.sum = ga.asset.plus(this.sum, opBody.reward);
                break;
        }
    }
}

async function scan() {

    const BLOCKS_AGO = ((60 * 60 * 24 * 7) / 3);

    let props = await ga.golos.getCurrentServerTimeAndBlock();

    let scanner = new Scanner(props.block - BLOCKS_AGO);
    await ga.golos.scanUserHistory("eee", scanner);
    info("sum = " + ga.golos.convertVestingToGolos(scanner.sum));
    process.exit(0);
}

scan();