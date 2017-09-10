/**
 * 
 * Бот голосующий по сигналу в комментарии.
 * В директории вместе с ботом поместите config.json c содержимым вида 
 * {
 *     "votebot" : "promobot",
 *     "votebotkey" : "5rgergjn...",
 *     "votebotcommand" : "votemebot",
 *     "votebotweight" : 100
 * }
 * 
 */

/**
 * Если отдельно, то 
 * const ga = require("golos-addons");
 */
const ga = require("../index");
const golos = ga.golos;
const global = ga.global;

/**
 * Запуск...
 * node votebot debug
 */

ga.global.initApp("follow");

const debug = ga.global.debug("follow");
const info = ga.global.info("follow");
const error = ga.global.error("follow");

const VOTEBOT = global.CONFIG.votebot;
const KEY = global.CONFIG.votebotkey;
const COMMAND = global.CONFIG.votebotcommand;
const WEIGHT = global.CONFIG.votebotweight;

async function addComment(comment, text) {
    await golos.golos.broadcast.commentAsync(KEY, 
        comment.author, comment.permlink, 
        VOTEBOT, "re-" + comment.author + "-" + comment.permlink, 
        text, text, comment.json_metadata );
}

async function vote(post, comment) {
    info("Голосую за " + post.author + "/" + post.permlink + "(" + post.title + ")");
    await golos.golos.broadcast.voteAsync(KEY, VOTEBOT, post.author, post.permlink, WEIGHT * 100);

    //Ответить на комманду
    await addComment(comment, "Проголосовал");
}

/**
 * Обрабатываем комментарий.
 * @param {*} comment 
 */
async function processComment(comment) {
    debug("Найден комментарий " + comment.author + "/"+ comment.permlink);

    //Это должен быть комментарий, а не пост. parent_author не должен быть пустым
    if(comment.parent_author == "") {
        debug("это пост!, пропускаем")
        //выходим
        return false;
    }

    //Проверим на наличие команды
    if(!comment.body.match(COMMAND)) {
        debug("комманда не найдена! Пропускаем")
        //выходим
        return false;
    }

    info("Обнаружена комманда к голосованию!");

    //Получаем содержимое поста, к которому был комментарий-команда
    let content = await golos.getContent(comment.parent_author, comment.parent_permlink);

    //Игнорируем комментарии, то-есть голосуем только за посты
    if(content.parent_author != "") {
        debug("Это комментарий к другому комментарию, а не посту. пропускаем");
        //выходим
        return false;
    }

    //Проверим, голосовали ли уже
    for(let vote of content.active_votes) {
        if(vote.voter == VOTEBOT) {
            //выходим
            debug("Уже голосовали за этот пост. пропускаем");
            //Ответить на комманду
            await addComment(comment, "Уже один раз голосовал");
            return false;
        }
    }

    //Все проверки сделаны, голосуем!
    await vote(content, comment);
    return true;
}

/**
 * Обрабатываем блок с определенным номером.
 * @param {*} bn 
 */
async function processBlock(bn) {
    let voteCounter = 0;

    //получаем все транзакции из блока
    let transactions = await golos.golos.api.getOpsInBlockAsync(bn, false);
    for(let tr of transactions) {
        let op = tr.op[0];
        let opBody = tr.op[1];

        switch(op) {
            //нас интересует только комментарий к посту
            case "comment":
                if(await processComment(opBody)) {
                    voteCounter++;
                }                    
                break;
        }
    }
    return voteCounter;
}

async function run() {
    //Получаем текущий блок и серверное время 
    let props = await golos.getCurrentServerTimeAndBlock();
    let block = props.block;
    block = 9397431;
    let voteCounter = 0;
    info("запускаем цикл с блока " + block);
    while(true) {
        try {
            if(block >= props.block) {
                //тек9397431ущий блок выше последнего. Проверяем, появились ли новые блоки и засыпаем на 3 секнуды
                props = await golos.getCurrentServerTimeAndBlock();
                await global.sleep(3000);
                continue;
            }
            debug("Обрабатываем блок " + block);
            //Ищем команду в комментариях
            voteCounter += await processBlock(block++);
            info("Всего проголосвал с момента запуска " + voteCounter);
        } catch(e) {
            error("Error catched in main loop!");
            error(golos.getExceptionCause(e));            
            await global.sleep(3000);
        }
    }
    //Неожиданный поворот
    process.exit(1);
}

run();


