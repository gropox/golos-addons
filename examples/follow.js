const ga = require("../index");

/**
 * Start with...
 * node get_curation_rewards
 */


ga.global.initApp("follow");

const debug = ga.global.debug("follow");
const info = ga.global.info("follow");
const error = ga.global.error("follow");

/**
 * Проверяем, есть ли уже подписка на этот аккаунт.
 * @param {*} follower 
 * @param {*} following 
 */
async function isAlreadyFollowing(follower, following) {
    //check
    let followers = await ga.golos.golos.api.getFollowersAsync(following, follower, "blog", 1);
    if(followers && followers.length == 1 && followers[0].follower == follower) {
        info(JSON.stringify(followers[0]));
        return true;
    }
    return false;
}

async function follow(key, follower, following) {
    //проверяем
    if(await isAlreadyFollowing(follower  , following)) {
        info("already following, nothing to do");
        process.exit(0);
    }

    //подписываемся собственно
    try {
        const action = ["follow",{"follower":follower,"following":following,"what":["blog"]}];
        const custom_json = JSON.stringify(action);
        info("executing.. " + custom_json);
        await ga.golos.golos.broadcast.customJsonAsync(key, [], [follower], "follow", custom_json);
        info("executed");
    } catch(e) {
        error(ga.golos.getExceptionCause(e));
    }

    //убеждаемся, что подписались
    if(await isAlreadyFollowing(follower, following)) {
        info("done");
        process.exit(0);
    }
    info("something went wrong!");
    process.exit(1);
}

async function unfollow(key, follower, following) {

    //снимаем подписку - what пустой массив
    try {
                     //["follow",{"follower":"ropox" ,"following":"dr2073" ,"what":[]}]
        const action = ["follow",{"follower":follower,"following":following,"what":[]}];
        const custom_json = JSON.stringify(action);
        info("executing.. " + custom_json);
        await ga.golos.golos.broadcast.customJsonAsync(key, [], [follower], "follow", custom_json);
        info("executed");
    } catch(e) {
        error(ga.golos.getExceptionCause(e));
    }

    //убеждаемся, что отподписались
    if(!await isAlreadyFollowing(follower, following)) {
        info("done");
        process.exit(0);
    }
    info("something went wrong!");
    process.exit(1);
}


unfollow("5f4e", "abrakadabra", "golosmedia");