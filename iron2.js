var alreadyStarted = false;

function initMod() {
    if (top.frames["d_act"].global_data != undefined && top.frames["d_act"].global_data.my_group != undefined) {
        if (localStorage.getItem("Start_script") == "true") {
            startScript();
        }
        setTimeout(createControls, 800);
    } else {
        setTimeout(initMod, 200);
    }
}

var reloadId = 0;

setTimeout(initMod, 1000);

var isStarted = false;
var isReallyStarted = false;

var forest_frame = top.frames["d_act"];

var count = 0;
var lastTimeStamp = new Date();
var currentState = "Nothing_forward"

var hitCount = 0;
var currentStoneId = 0;
var timeoutId = 0;

var possibleCopperIdList = [];
var possibleIronIdList = [];
var possibleGoldIdList = [];

var ignoredItems = [];

var timeoutIds = [];
var intervalId = 0;
var canvIntervalId = 0;

function startBtnClicked() {
    loadLocalStorage();
    log.v("startBtnClicked");
    isReallyStarted = true;
    startLoop()
    startGraph()
}

function startGraph() {
    canvIntervalId = setInterval(function() {
        clearDots();
        startCanv()
    }, 2000);
}

function stopBtnClicked() {
    log.v("stopBtnClicked");
    clearInterval(intervalId);
    do {
        clearTimeout(timeoutIds.pop())
    } while (timeoutIds.length != 0)
    isReallyStarted = false;
    clearInterval(canvIntervalId);
    clearDots();
    isStarted = false;
    rewriteLocalStorage();
}

function startLoop() {
    if (!isStarted) {
        isStarted = true;
        intervalId = setInterval(looper, getRandom(1000, 2000));
    } else {
        log.v("Already Started")
    }
}

function stopLoop() {
    if (isStarted) {
        clearInterval(intervalId);
        do {
            clearTimeout(timeoutIds.pop())
        } while (timeoutIds.length != 0)
        isStarted = false
    } else {
        log.v("Not started yet")
    }
}

function looper() {
    if (!isReallyStarted) return;
    log.v("START #" + count)
    var currTime = new Date()
    log.i(currTime - lastTimeStamp + " since last time stamp")
    lastTimeStamp = currTime;
    var timerCountDown = getSecondsLeft();
    var overlayResponse = getResponseIfExists();
    setOverlayOff();
    log.v("timerCountDown = " + timerCountDown)
    if (timerCountDown == "-1") { // Timer is off
        log.i("response = " + overlayResponse + ", currentState = " + currentState);
        if (overlayResponse == "Вы должны иметь в руках Кирка рудокопа") {
            stopLoop();
            var promise = new Promise(function(resolve) {
                jQuery.get('http://newforest.apeha.ru/bag_type_17.chtml', function(response) {
                    var re = new RegExp('<img width="75" height="50" src="http:\/\/resources\.apeha\.ru\/upload\/1_963\.gif" title="Кирка рудокопа">.+\\n.+\\n.+\\n<form method=post><input type=hidden name=actUser-Wear value=(\\d+)>', 'gm');
                    var match = re.exec(response);
                    if (match && match[1]) {
                        var itemId = +match[1];

                        setTimeout(function() {
                            jQuery.post('http://newforest.apeha.ru/bag_type_17.chtml', {
                                    'actUser-Wear': itemId
                                }).then(function() {
                                    resolve();
                                });
                        }, 3000);
                    }
                })
            })
            promise.then(function() {
                startLoop()
            })
        } else {
            if (overlayResponse == "Вы травмированы. Для работы необходимо вылечить травмы.") {
                stopLoop();
                var promise = new Promise(function(resolve) {
                    if (healId !== undefined) {
                        jQuery.post('http://newforest.apeha.ru/ability_type_common.chtml', {
                                'actUser-UseCast': healId
                            }).then(function() {
                                resolve();
                            });
                    } else {
                        log.e("healId not defined")
                    }
                })
                promise.then(function() {
                    startLoop()
                })
            } else {
                switch (currentState) {
                    case ("Copper_forward"):
                        {
                            hitCount = 0;
                            if (getLeftForwardAndRight()[1].type == "copper" ||
                                overlayResponse != "Перед Вами нечего добывать.") {
                                clickStartDig();
                                removeFromPossibleLists(currentStoneId, "copper");
                            } else {
                                currentState = "Nothing_forward"
                                stopLoop();
                                timeoutIds.push(setTimeout(startLoop, getRandom(400, 500)));
                            }
                            break;
                        }
                    case ("Iron_forward"):
                    case ("Gold_forward"):
                        {
                            hitCount = 0;
                            if (getLeftForwardAndRight()[1].type == "iron" ||
                                overlayResponse != "Перед Вами нечего добывать.") {
                                clickStartDig();
                                removeFromPossibleLists(currentStoneId, "iron");
                            } else {
                                currentState = "Nothing_forward"
                                stopLoop();
                                timeoutIds.push(setTimeout(startLoop, getRandom(400, 500)));
                            }
                            break;
                        }
                    case ("Nothing_forward"):
                        {
                            log.v("response = " + overlayResponse);
                            switch (overlayResponse) {
                                case ("медь в радиусе 5 шагов от Вас"):
                                    log.i("Copper in 5-cell radius")
                                    increaseCurrentRadiusStones()
                                    addToPossibleListItems(getLeftForwardAndRight()[1], "copper");
                                    stopLoop();
                                    hitCount = 0;
                                    var waitFor = goToTheNearestStone(possibleListItemsMostType(), true)
                                    log.v("Waiting for = " + waitFor)
                                    if (Number.isInteger(waitFor)) {
                                        timeoutIds.push(setTimeout(startLoop, waitFor * 1000 + getRandom(700, 1200)));
                                    }
                                    break;
                                case ("железо в радиусе 5 шагов от Вас"):
                                    log.i("Iron in 5-cell radius")
                                    increaseCurrentRadiusStones()
                                    addToPossibleListItems(getLeftForwardAndRight()[1], "iron");
                                    stopLoop();
                                    hitCount = 0;
                                    var waitFor = possibleListItemsMostType() == "gold" ? goToTheNearestStone("gold", true) : goToTheNearestStone("iron", true)
                                    log.v("Waiting for = " + waitFor)
                                    if (Number.isInteger(waitFor)) {
                                        timeoutIds.push(setTimeout(startLoop, waitFor * 1000 + getRandom(700, 1200)));
                                    }
                                    break;
                                case ("золото в радиусе 5 шагов от Вас"):
                                    log.i("Gold in 5-cell radius")
                                    increaseCurrentRadiusStones()
                                    addToPossibleListItems(getLeftForwardAndRight()[1], "gold");
                                    stopLoop();
                                    hitCount = 0;
                                    var waitFor = goToTheNearestStone("gold", true);
                                    log.v("Waiting for = " + waitFor)
                                    if (Number.isInteger(waitFor)) {
                                        timeoutIds.push(setTimeout(startLoop, waitFor * 1000 + getRandom(700, 1200)));
                                    }
                                    break;
                                case ("Перед Вами нечего добывать."):
                                    log.i("NOTHING TO DIG, GO TO ANOTHER PLACE")
                                    hitCount = 0;
                                    currentStoneId = 0;
                                    stopLoop();
                                    log.i("currentStoneId cleared");
                                    var waitFor = goToTheNearestStone(possibleListItemsMostType(), isThere5Possible())
                                    log.v("Waiting for = " + waitFor)
                                    if (Number.isInteger(waitFor)) {
                                        timeoutIds.push(setTimeout(startLoop, waitFor * 1000 + getRandom(700, 1200)));
                                    }
                                    break;
                                case ("Ничего не найдено"):
                                    increaseCurrentRadiusStones()
                                case ("Not overlayed"):
                                    log.v("hitCount = " + hitCount)
                                    if (hitCount < numberOfSearches() &&
                                        (isThere5Possible() || (searchIron || searchCopper) && getIgnoredItemById(currentStoneId).perc < 100 || searchGold && getIgnoredItemById(currentStoneId).percGold < 100)) {
                                        log.v("SEARCH")
                                        var direction = fixDirection(currentStoneId);
                                        log.i("direction = " + direction)
                                        switch (direction) {
                                            case ("good"):
                                                {
                                                    clickSearch();
                                                    break;
                                                }
                                            case ("turn_left"):
                                                {
                                                    stopLoop();
                                                    CheckKeyDown({
                                                            keyCode: 37
                                                        })
                                                    timeoutIds.push(setTimeout(startLoop, getRandom(500, 1000)));
                                                    break;
                                                }
                                            case ("turn_right"):
                                                {
                                                    stopLoop();
                                                    CheckKeyDown({
                                                            keyCode: 39
                                                        })
                                                    timeoutIds.push(setTimeout(startLoop, getRandom(500, 1000)));
                                                    break;
                                                }
                                            case ("need_to_go"):
                                                {
                                                    stopLoop();
                                                    var waitFor = goToTheNearestStone(possibleListItemsMostType(), isThere5Possible())
                                                    log.v("Waiting for = " + waitFor)
                                                    if (Number.isInteger(waitFor)) {
                                                        timeoutIds.push(setTimeout(startLoop, waitFor * 1000 + getRandom(700, 1200)));
                                                    }
                                                    break;
                                                }
                                            case ("try_to_turn"):
                                                {
                                                    stopLoop();
                                                    CheckKeyDown({
                                                            keyCode: 39
                                                        })
                                                    timeoutIds.push(setTimeout(startLoop, getRandom(500, 1000)));
                                                    break;
                                                }
                                        }
                                    } else {
                                        log.i("GO TO ANOTHER PLACE")
                                        hitCount = 0;
                                        currentStoneId = 0;
                                        stopLoop();
                                        log.i("currentStoneId cleared");
                                        var waitFor = goToTheNearestStone(possibleListItemsMostType(), isThere5Possible())
                                        log.v("Waiting for = " + waitFor)
                                        if (Number.isInteger(waitFor)) {
                                            timeoutIds.push(setTimeout(startLoop, waitFor * 1000 + getRandom(700, 1200)));
                                        }
                                    }
                                    break;
                                case ("медь прямо перед Вами"):
                                    {
                                        log.e("Copper forward")
                                        removeFromPossibleLists(currentStoneId, "copper")
                                        clickStartDig();
                                        hitCount = 0
                                        currentState = "Copper_forward"
                                        break;
                                    }
                                case ("медь слева от Вас"):
                                    {
                                        log.e("Copper on the left, turned and start")
                                        CheckKeyDown({
                                                keyCode: 37
                                            }) //TurnLeft
                                        removeFromPossibleLists(getLeftForwardAndRight[0], "copper")
                                        clickStartDig();
                                        hitCount = 0
                                        currentState = "Copper_forward"
                                        break;
                                    }
                                case ("медь справа от Вас"):
                                    {
                                        log.e("Copper on the right, turned and start")
                                        CheckKeyDown({
                                                keyCode: 39
                                            }) //TurnRight
                                        removeFromPossibleLists(getLeftForwardAndRight[2], "copper")
                                        clickStartDig();
                                        hitCount = 0
                                        currentState = "Copper_forward"
                                        break;
                                    }
                                case ("железо прямо перед Вами"):
                                    {
                                        log.e("Iron forward")
                                        removeFromPossibleLists(currentStoneId, "iron")
                                        clickStartDig();
                                        hitCount = 0
                                        currentState = "Iron_forward"
                                        break;
                                    }
                                case ("железо слева от Вас"):
                                    {
                                        log.e("Iron on the left, turned and start")
                                        CheckKeyDown({
                                                keyCode: 37
                                            }) //TurnLeft
                                        removeFromPossibleLists(getLeftForwardAndRight[0], "iron")
                                        clickStartDig();
                                        hitCount = 0
                                        currentState = "Iron_forward"
                                        break;
                                    }
                                case ("железо справа от Вас"):
                                    {
                                        log.e("Iron on the right, turned and start")
                                        CheckKeyDown({
                                                keyCode: 39
                                            }) //TurnLeft
                                        removeFromPossibleLists(getLeftForwardAndRight[2], "iron")
                                        clickStartDig();
                                        hitCount = 0
                                        currentState = "Iron_forward"
                                        break;
                                    }
                                case ("золото прямо перед Вами"):
                                    {
                                        log.e("Gold forward")
                                        removeFromPossibleLists(currentStoneId, "gold")
                                        clickStartDig();
                                        hitCount = 0
                                        currentState = "Gold_forward"
                                        break;
                                    }
                                case ("золото слева от Вас"):
                                    {
                                        log.e("Gold on the left, turned and start")
                                        CheckKeyDown({
                                                keyCode: 37
                                            }) //TurnLeft
                                        removeFromPossibleLists(getLeftForwardAndRight[0], "gold")
                                        clickStartDig();
                                        hitCount = 0
                                        currentState = "Gold_forward"
                                        break;
                                    }
                                case ("золото справа от Вас"):
                                    {
                                        log.e("Gold on the right, turned and start")
                                        CheckKeyDown({
                                                keyCode: 39
                                            }) //TurnLeft
                                        removeFromPossibleLists(getLeftForwardAndRight[2], "gold")
                                        clickStartDig();
                                        hitCount = 0
                                        currentState = "Gold_forward"
                                        break;
                                    }
                                default:
                                    {
                                        log.e("UNEXPECTED BEHAVIOR")
                                        stopLoop()
                                    }
                            }
                        }
                }
            }
        }
    } else { // Timer is on
        stopLoop();
        if (Number.isInteger(timerCountDown)) {
            //Checks also for Вы неожиданно быстро управились
            timeoutIds.push(setTimeout(startLoop, (timerCountDown > 150 ? (timerCountDown - 150) : timerCountDown) * 1000 + getRandom(700, 1100)));
        }
    }
    log.v("FINISH #" + count)
    count++;
}

function numberOfSearches() {
    var probability = 0;
    switch (getLeftForwardAndRight()[1].type) {
        case "gold":
        case "iron":
            probability = searchGold ? goldProb.forward : ironProb.forward;
            break;
        case "copper":
            probability = copperProb.forward;
            break;
    }
    if (probability == 0) probability = 20;
    log.v("probability = " + Math.ceil(100 / probability))
    return Math.ceil(100 / probability);
}

function whatShouldISearch() {
    if (!searchGold && !searchIron && searchCopper) return "copper";
    if (!searchGold && searchIron && !searchCopper) return "iron";
    if (searchGold && !searchIron && !searchCopper) return "gold";
    //TODO ADD for several
    return "undefined";
}

function isThere5Possible() {
    return possibleGoldIdList.length > 0 || possibleIronIdList.length > 0 || possibleCopperIdList.length > 0;
}

function increaseCurrentRadiusStones() {
    var leftForwardRight = getLeftForwardAndRight();

    if (searchCopper) {
        var copperAround = getAllItemsInRadius(5, "copper");
        for (var i = 0; i < copperAround.length; i++) {
            var ignoredItem = getIgnoredItemById(copperAround[i])
            switch (copperAround[i]) {
                case leftForwardRight[0].id:
                    if (leftForwardRight[0].type == "copper") {
                        ignoredItem.perc += copperProb.side;
                    }
                    break;
                case leftForwardRight[2].id:
                    if (leftForwardRight[2].type == "copper") {
                        ignoredItem.perc += copperProb.side;
                    }
                    break;
                case leftForwardRight[1].id:
                    if (leftForwardRight[1].type == "copper") {
                        ignoredItem.perc += copperProb.forward;
                    }
                    break;
                default:
                    ignoredItem.perc += copperProb.radius;
            }
            addOrReplaceIgnoredItem(ignoredItem)
        }
    }
    if (searchIron) {
        var ironAround = getAllItemsInRadius(5, "iron");
        for (var i = 0; i < ironAround.length; i++) {
            var ignoredItem = getIgnoredItemById(ironAround[i])
            switch (ironAround[i]) {
                case leftForwardRight[0].id:
                    if (leftForwardRight[0].type == "iron") {
                        ignoredItem.perc += ironProb.side;
                    }
                    break;
                case leftForwardRight[2].id:
                    if (leftForwardRight[2].type == "iron") {
                        ignoredItem.perc += ironProb.side;
                    }
                    break;
                case leftForwardRight[1].id:
                    if (leftForwardRight[1].type == "iron") {
                        ignoredItem.perc += ironProb.forward;
                    }
                    break;
                default:
                    ignoredItem.perc += ironProb.radius;
            }
            addOrReplaceIgnoredItem(ignoredItem)
        }
    }

    if (searchGold) {
        var goldAround = getAllItemsInRadius(5, "gold");
        for (var i = 0; i < goldAround.length; i++) {
            var ignoredItem = getIgnoredItemById(goldAround[i])
            switch (goldAround[i]) {
                case leftForwardRight[0].id:
                    if (leftForwardRight[0].type == "iron") {
                        ignoredItem.percGold += goldProb.side;
                    }
                    break;
                case leftForwardRight[2].id:
                    if (leftForwardRight[2].type == "iron") {
                        ignoredItem.percGold += goldProb.side;
                    }
                    break;
                case leftForwardRight[1].id:
                    if (leftForwardRight[1].type == "iron") {
                        ignoredItem.percGold += goldProb.forward;
                    }
                    break;
                default:
                    ignoredItem.percGold += goldProb.radius;
            }
            addOrReplaceIgnoredItem(ignoredItem)
        }
    }
}

function fixDirection(currentStoneId) {
    var items = getAllItemsInRadius(1, "undefined");
    var lfr = getLeftForwardAndRight();
    switch (currentStoneId) {
        case lfr[0].id:
            if (lfr[0].type == "iron" || lfr[0].type == "copper") return "turn_left";
            break;
        case lfr[1].id:
            if (lfr[1].type == "iron" || lfr[1].type == "copper") return "good";
            break;
        case lfr[2].id:
            if (lfr[2].type == "iron" || lfr[2].type == "copper") return "turn_right";
            break;
    }
    if (getAllItemsInRadius(1, "undefined").indexOf(currentStoneId) == -1) return "need_to_go";
    return "try_to_turn";
}

function getMyPositionAndDirection() {
    return {
        x: forest_frame.global_data.my_group.posx,
        y: forest_frame.global_data.my_group.posy,
        direction: forest_frame.global_data.my_group.napr
    };
}

function isInIgnoredItemsByObj(item) {
    if (item != null && item.hasOwnProperty("id")) {
        return ignoredItems.find(item = > item.id == id) !== undefined
    }
}

function getIgnoredItemById(_id) {
    var item = isInIgnoredItemById(_id) ? ignoredItems.find(item = > item.id == _id) : {
        id: _id,
        perc: 0,
        percGold: 0
    }
    if (!item.hasOwnProperty("percGold")) item.percGold = 0;
    return item;
}

function isInIgnoredItemById(id) {
    return ignoredItems.find(item = > item.id == id) !== undefined
}

function addOrReplaceIgnoredItem(item) {
    if (item != null && item.hasOwnProperty("id") && item.hasOwnProperty("perc") && item.hasOwnProperty("percGold")) {
        var tempIndex = ignoredItems.findIndex(it = > it.id == item.id);
        if (tempIndex != -1) {
            ignoredItems[tempIndex] = {
                id: item.id,
                perc: item.perc,
                percGold: item.percGold
            }
        } else {
            ignoredItems.push({
                    id: item.id,
                    perc: item.perc,
                    percGold: item.percGold
                })
        }
    }
}

function getLeftForwardAndRight() {
    var myPos = getMyPositionAndDirection();
    var absY = myPos.y;
    var absX = myPos.x;
    var tempDirection = parseInt(myPos.direction);

    var f = function(napr) {
        switch (napr) {
            case 1:
                tempY--;
                break;
            case 2:
                tempY--;
                tempX++;
                break;
            case 3:
                tempX++;
                break;
            case 4:
                tempY++;
                tempX++;
                break;
            case 5:
                tempY++;
                break;
            case 6:
                tempY++;
                tempX--;
                break;
            case 7:
                tempX--;
                break;
            case 8:
                tempY--;
                tempX--;
                break;
        }
    }
    var tempY = absY;
    var tempX = absX;
    f(tempDirection);
    var forwardId = (tempY - 1) * 6000 + tempX;

    tempY = absY;
    tempX = absX;
    f(tempDirection - 1 == 0 ? 8 : tempDirection - 1);
    var leftId = (tempY - 1) * 6000 + tempX;

    tempY = absY;
    tempX = absX;
    f(tempDirection + 1 == 9 ? 1 : tempDirection + 1);
    var rightId = (tempY - 1) * 6000 + tempX;

    return [{
        id: leftId,
        type: getStoneTypeById(leftId)
    }, {
        id: forwardId,
        type: getStoneTypeById(forwardId)
    }, {
        id: rightId,
        type: getStoneTypeById(rightId)
    }];
}

function getAllItemsInRadius(radius, stoneType) {
    var allItemsOnTheScreen = forest_frame.global_data.abs_poses
    var itemsInRadius = [];

    var currentPosition = {};
    currentPosition.x = forest_frame.global_data.my_group.posx
    currentPosition.y = forest_frame.global_data.my_group.posy

    for (var index = 0; index < allItemsOnTheScreen.length; index++) {
        var item = allItemsOnTheScreen[index];
        if (item != null && item.hasOwnProperty("type") &&
            item.hasOwnProperty("id") && item.id != 0 &&
            item.hasOwnProperty("posx") && Math.abs(currentPosition.x - item.posx) <= radius &&
            item.hasOwnProperty("posy") && Math.abs(currentPosition.y - item.posy) <= radius) {

            switch (stoneType) {
                case "copper":
                    if (item.type >= 74 && item.type <= 75 || item.type >= 104 && item.type <= 106) {
                        itemsInRadius.push(parseInt(item.id));
                    }
                    break;
                case "iron":
                case "gold":
                    if (item.type >= 70 && item.type <= 73 || item.type >= 107 && item.type <= 113) {
                        itemsInRadius.push(parseInt(item.id));
                    }
                    break;
                case "undefined":
                    if (item.type >= 70 && item.type <= 75 || item.type >= 104 && item.type <= 113) {
                        itemsInRadius.push(parseInt(item.id));
                    }
                    break;
            }
        }
    }

    return itemsInRadius;
}

function getStoneTypeById(id) {
    var typeNum = 0;
    forest_frame.global_data.abs_poses.forEach(item = > {
            if (item !== undefined && item.id == id) {
                typeNum = parseInt(item.type)
            }
        });
    if (typeNum >= 74 && typeNum <= 75 || typeNum >= 104 && typeNum <= 106) {
        return "copper";
    }
    if (typeNum >= 70 && typeNum <= 73 || typeNum >= 107 && typeNum <= 113) {
        return "iron";
    }
    return "undefined";
}

function clickSearch() {
    hitCount++;
    top.frames["d_act"].Client.send('actNewMaps-StartSearch=1')
}

function isInPossibleListItems(id, stoneType) {
    if (id != 0) {
        switch (stoneType) {
            case "copper":
                return possibleCopperIdList.forEach(item = > {
                        if (item.indexOf(id) != -1) return true
                    })
                return false;
                break;
            case "iron":
                return possibleIronIdList.forEach(item = > {
                        if (item.indexOf(id) != -1) return true
                    })
                return false;
                break;
            case "gold":
                return possibleGoldIdList.forEach(item = > {
                        if (item.indexOf(id) != -1) return true
                    })
                return false;
                break;
            case "undefined":
                return isInPossibleListItems(id, "copper") ||
                    isInPossibleListItems(id, "iron") ||
                    isInPossibleListItems(id, "gold")
                break;
        }
    }
}

function removeFromPossibleLists(obj, stoneType) {
    var id = 0;
    if (obj != null && obj.hasOwnProperty("id")) {
        id = obj.id;
    } else {
        id = obj;
    }
    if (id != 0) {
        switch (stoneType) {
            case "copper":
                possibleCopperIdList = possibleCopperIdList.filter(item = > {
                        item.indexOf(id) == -1
                    })
                break;
            case "iron":
                possibleIronIdList = possibleIronIdList.filter(item = > {
                        item.indexOf(id) == -1
                    })
                break;
            case "gold":
                possibleGoldIdList = possibleGoldIdList.filter(item = > {
                        item.indexOf(id) == -1
                    })
                break;
            case "undefined":
                removeFromPossibleLists(id, "copper");
                removeFromPossibleLists(id, "iron");
                removeFromPossibleLists(id, "gold");
                break;
        }
    }
}

function possibleListItemsMostType() {
    if (possibleGoldIdList.length > 0) return "gold";
    if (possibleIronIdList.length > 0) return "iron";
    if (possibleCopperIdList.length > 0) return "copper";
    return whatShouldISearch();
}

function addToPossibleListItems(id, stoneType) {
    var stoneIds = getAllItemsInRadius(5, stoneType).filter(item = > item != id);
    if (id != 0) {
        switch (stoneType) {
            case "copper":
                var copy = true;
                for (var ind = 0; ind < possibleCopperIdList.length; ind++) {
                    if (possibleCopperIdList[ind].join(",").localeCompare(stoneIds.join(",")) == 0) {
                        copy = false
                    }
                }
                if (copy) {
                    possibleCopperIdList.push(stoneIds)
                }
                break;
            case "iron":
                var copy = true;
                for (var ind = 0; ind < possibleIronIdList.length; ind++) {
                    if (possibleIronIdList[ind].join(",").localeCompare(stoneIds.join(",")) == 0) {
                        copy = false
                    }
                }
                if (copy) {
                    possibleIronIdList.push(stoneIds)
                }
                break;
            case "gold":
                var copy = true;
                for (var ind = 0; ind < possibleGoldIdList.length; ind++) {
                    if (possibleGoldIdList[ind].join(",").localeCompare(stoneIds.join(",")) == 0) {
                        copy = false
                    }
                }
                if (copy) {
                    possibleGoldIdList.push(stoneIds)
                }
                break;
        }
    }
}

function getAllPossibleItemsByType(stoneType) {
    switch (stoneType) {
        case "copper":
            return possibleCopperIdList;
        case "iron":
            return possibleIronIdList;
        case "gold":
            return possibleGoldIdList;
    }
}

function goToTheNearestStone(stoneType, goTo5Possible) {
    if (goTo5Possible) {
        var itemsArr = getAllPossibleItemsByType(stoneType);
        var resultArr = [];
        itemsArr.forEach(item = > {
                item.forEach(id = > {
                        if (getDistanceToId(id) <= 13) {
                            resultArr.push(id)
                        }
                    })
            })
        var leastProb = Number.MAX_VALUE;
        var leastProbId = 0;
        resultArr.forEach(id = > {
                var tempIgnoredItem = getIgnoredItemById(id);
                if (stoneType == "gold") {
                    if (tempIgnoredItem.percGold < leastProb) {
                        leastProb = tempIgnoredItem.percGold;
                        leastProbId = tempIgnoredItem.id
                    }
                } else {
                    if (tempIgnoredItem.perc < leastProb) {
                        leastProb = tempIgnoredItem.perc;
                        leastProbId = tempIgnoredItem.id
                    }
                }
            })
        goToPosition(leastProbId);
        currentStoneId = parseInt(leastProbId)
        return getDistanceToId(currentStoneId)

    } else {
        currentPosition = {
            x: forest_frame.global_data.my_group.posx,
            y: forest_frame.global_data.my_group.posy
        }

        var allItemsOnTheScreen = forest_frame.global_data.abs_poses
        var stoneItems = [];

        var typedStoneIds = getAllItemsInRadius(13, stoneType)

        for (var index = 0; index < allItemsOnTheScreen.length; index++) {
            var item = allItemsOnTheScreen[index];
            if (item !== undefined && item.hasOwnProperty("id")) {
                for (var idsInd = 0; idsInd < typedStoneIds.length; idsInd++) {
                    if (typedStoneIds[idsInd] == item.id) {
                        stoneItems.push(item)
                    }
                }
            }
        }
        var stoneItemsRadius = [
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            []
        ]
        for (var radius = 1; radius <= 13; radius++) {
            for (var index = 0; index < stoneItems.length; index++) {
                var dx = Math.abs(stoneItems[index].posx - currentPosition.x);
                var dy = Math.abs(stoneItems[index].posy - currentPosition.y);
                if ((dx == radius && dy <= radius) || (dx <= radius && dy == radius)) {
                    stoneItemsRadius[radius - 1].push(stoneItems[index])
                }
            }
        }

        for (var index = 0; index < stoneItemsRadius.length; index++) {
            if (stoneItemsRadius[index].length > 0) {
                var leastProb = Number.MAX_VALUE;
                var leastProbId = 0;
                stoneItemsRadius[index].forEach(item = > {
                        var tempIgnoredItem = getIgnoredItemById(item.id);
                        if (stoneType == "gold") {
                            if (tempIgnoredItem.percGold < leastProb) {
                                leastProb = tempIgnoredItem.percGold;
                                leastProbId = tempIgnoredItem.id
                            }
                        } else {
                            if (tempIgnoredItem.perc < leastProb) {
                                leastProb = tempIgnoredItem.perc;
                                leastProbId = tempIgnoredItem.id
                            }
                        }

                    })
                if (leastProb < 100) {
                    currentStoneId = parseInt(leastProbId);
                    goToPosition(currentStoneId)
                    return getDistanceToId(currentStoneId);
                }
            }
        }
        //TODO ADD IF NOTHING WHERE FOUND
    }
}

function getDistanceToId(id) {
    var num = Number(id)
    if (!isNaN(num)) {
        var result = {}
        result.x = num % 6000
        result.y = Math.floor(num / 6000) + 1
        var myPos = getMyPositionAndDirection()
        return Math.max(Math.abs(result.x - myPos.x), Math.abs(result.y - myPos.y));
    } else {
        return "isNan"
    }
}

function goToPosition(id) {
    var tempId = parseInt(id);
    if (Number.isInteger(tempId) && tempId != 0) {
        log.i("trying to go to " + tempId)
        top.frames["d_act"].Client.send('actNewMaps-GotoKletka=' + tempId)
        return tempId;
    } else {
        log.e("cannot go to" + tempId)
    }
}

function createNewButton(targetframe, id, style, onclick, inner, parstyle) {
    var navbutton = createMyElement(pers_f, "b", "parent-" + id, "button", parstyle, "", "");
    var innernavbutton = createMyElement(pers_f, "b", "", "", "width: 100%;", "", "");
    navbutton.appendChild(innernavbutton);
    var end_button = createMyElement(targetframe, "button", id, "", style + "outline: none;", onclick, inner);
    innernavbutton.appendChild(end_button);
    return navbutton;
}

function createMyElement(targetframe, elname, elid, elclass, elstyle, elonclick, innertext) {
    var NewElem = targetframe.createElement(elname);
    NewElem.setAttribute("id", elid);
    NewElem.setAttribute("style", elstyle);
    NewElem.setAttribute("class", elclass);
    NewElem.setAttribute("onclick", elonclick);
    NewElem.innerHTML = innertext;
    return NewElem;
}

function createControls() {
    if (top.frames["d_pers"].document.getElementsByTagName('body')[0] != null) {
        pers_f = top.frames["d_pers"].document;
        var bod = pers_f.getElementsByTagName('body')[0];
        var controlsdiv = createMyElement(pers_f, "div", "controlsdiv", "", "padding:0px 5px 0px 5px;", "", "<p style='text-align:center; font-weight:bold; margin: 5px 0px 0px 0px;'>Сontrol</p>");
        var startScript = createNewButton(pers_f, "framecontrolstart", "width:100%!important;", "top.frames[\"d_act\"].startScript()", "Start", "width:49%;");
        controlsdiv.appendChild(startScript);
        var stopScript = createNewButton(pers_f, "framecontrolstop", "width:100%!important;", "top.frames[\"d_act\"].stopScript()", "Stop", "width:49%;");
        controlsdiv.appendChild(stopScript);
        bod.appendChild(controlsdiv);
        createNavSelector();
        startShowCoordinates();
    } else {
        setTimeout(createControls, 800);
    }
}

top.frames["d_act"].startScript = function startScript() {
    if (!alreadyStarted) {
        alreadyStarted = true;
        setTimeout(startBtnClicked, 1000);
        reloadId = setTimeout(function() {
            localStorage.setItem("Start_script", "true");
            stopBtnClicked()
            top.location.reload()
        }, 60 * 60 * 1000)
    }
}

top.frames["d_act"].stopScript = function stopScript() {
    localStorage.setItem("Start_script", "false");
    setTimeout(stopBtnClicked, 1000);
    clearTimeout(reloadId);
    alreadyStarted = false;
}

//------------------------------------------------------------------NAV CONTROL

function byIdFr(dframe, did) {
    return top.frames[dframe].document.getElementById(did);
}

function createNavSelector() {
    if (top.frames["d_pers"].document.getElementsByTagName('body')[0] != null) {
        pers_f = top.frames["d_pers"].document;
        var bod = pers_f.getElementsByTagName('body')[0];
        var selectdiv = createMyElement(pers_f, "div", "navdiv", "", "padding:0px 5px 0px 5px;", "", "");
        var titlediv = createMyElement(pers_f, "div", "navtitle", "", "", "", "<b>Навигация:</b> ");
        selectdiv.appendChild(titlediv);
        var perscords = createMyElement(pers_f, "span", "perscords", "", "", "", "");
        titlediv.appendChild(perscords);
        var standartobjects = createMyElement(pers_f, "div", "standartobjects", "", "", "", "Объекты ");
        selectdiv.appendChild(standartobjects);
        var navkords = createMyElement(pers_f, "div", "navkords", "", "", "", "");
        selectdiv.appendChild(navkords);
        var nbutt = createNewButton(pers_f, "navcontrol", "width:100%!important;", "top.frames[\"d_act\"].startNavigation()", "Запустить навигатор", "width:100%;"); //TODO
        var nbutt2 = createNewButton(pers_f, "nav2control", "width:100%!important;", "top.frames[\"d_act\"].stopNavigation()", "Остановить навигатор", "width:100%;"); //TODO
        navkords.innerHTML = "<label id='navxcord' style='line-height: 25px;float: left;display: block;max-width: 50%;' for='xnavcord'>X - <input type='text' name='xnavcord' id='xnavcord' value='' style='width: 75%;' placeholder='координата'/></label><label id='navycord' style='line-height: 25px;float: left;display: block;max-width: 50%;' for='ynavcord'>Y - <input type='text' name='ynavcord' id='ynavcord' value='' style='width: 75%;' placeholder='координата'/></label><br />";
        navkords.appendChild(nbutt);
        navkords.appendChild(nbutt2);
        var selecttag = createMyElement(pers_f, "select", "NavSelect", "", "width:72%;", "", "");
        selecttag.setAttribute("name", "NavSelect");
        selecttag.setAttribute("onchange", "top.frames['d_act'].changeNavTarget(this.value)"); //TODO
        for (var i = 0; i < NavObjects.length; i++) {
            var navoption = pers_f.createElement("option");
            navoption.setAttribute("value", i);
            navoption.innerHTML = NavObjects[i].name;
            selecttag.appendChild(navoption);
        }
        standartobjects.appendChild(selecttag);
        bod.appendChild(selectdiv);
    }
}

top.frames["d_act"].startNavigation = function startNavigation() {
    var xval = parseInt(byIdFr("d_pers", "xnavcord").value);
    var yval = parseInt(byIdFr("d_pers", "ynavcord").value);

    if (xval !== undefined && yval !== undefined && Number.isInteger(xval) && Number.isInteger(yval) && xval != 0 && yval != 0) {
        start(xval, yval);
    }
}

top.frames["d_act"].stopNavigation = function stopNavigation() {
    stop()
}

var NavObjects = [{
        name: "Не выбрано",
        latname: "тщту",
        cordx: "",
        cordy: "",
        ofsetx: 0,
        ofsety: 0,
        obglocation: ""
    }, {
        name: "Альпийский Одуванчик",
        latname: "Fort",
        cordx: 795,
        cordy: 2771,
        ofsetx: 6,
        ofsety: 6,
        obglocation: "Альпийские луга"
    }, {
        name: "Заначка Аутлавс",
        latname: "Fort",
        cordx: 2041,
        cordy: 3689,
        ofsetx: 6,
        ofsety: 6,
        obglocation: "Заводь среднеморская"
    }, {
        name: "Среднеморье",
        latname: "Smorye",
        cordx: 3755,
        cordy: 2965,
        ofsetx: 6,
        ofsety: 6,
        obglocation: "Окрестности Сморья"
    }, {
        name: "Утес дракона",
        latname: "Utes",
        cordx: 749,
        cordy: 1129,
        ofsetx: 6,
        ofsety: 6,
        obglocation: "Окрестности Утеса"
    }, {
        name: "Ковчег",
        latname: "Kovcheg",
        cordx: 3755,
        cordy: 1128,
        ofsetx: 6,
        ofsety: 6,
        obglocation: "Окрестности Ковчега"
    }
];

top.frames["d_act"].changeNavTarget = function changeNavTarget(val) {
    byIdFr("d_pers", "xnavcord").value = NavObjects[val].cordx;
    byIdFr("d_pers", "ynavcord").value = NavObjects[val].cordy;
}

function startShowCoordinates() {
    setInterval(function() {
        byIdFr("d_pers", "perscords").innerHTML = "x-" + top.frames["d_act"].global_data.my_group.posx + " y-" + top.frames["d_act"].global_data.my_group.posy;
    }, 1000)
}
//------------------------------------------------------------------NAV CONTROL END

//------------------------------------------------------------------NAVIGATION

function goTo(item) {
    log.i("trying to go to " + item)
    if (item != null && item.hasOwnProperty("id") && item.id != 0) {
        if (getApprovanceById(item.id)) {
            log.i(item.id)
            Client.send('actNewMaps-GotoKletka=' + item.id)
            return getAbs(getMyCurrentCellId(), item.id)
        }
        return 0;
    }
}

function getMyCurrentCellId() {
    var x = global_data.my_group.posx
    var y = global_data.my_group.posy
    if (!isNaN(x) && !isNaN(y)) {
        return (y - 1) * 6000 + x;
    }
}

function getApprovanceById(id) {
    var x = global_data.my_group.posx
    var y = global_data.my_group.posy
    if (!isNaN(x) && !isNaN(y)) {
        if (!isNaN(id)) {
            var result = getCoordinates(id);
            if (Math.abs(result.x - x) < 13 && Math.abs(result.y - y) < 13) {
                return true;
            }
        }
    }
    return false;
}

function getCoordinates(e) {
    var result = {}
    var num = Number(e)
    if (!isNaN(num)) {
        result.x = num % 6000
        result.y = Math.floor(num / 6000) + 1
        return result;
    } else {
        result = "isNan"
    }
};

function getId(x, y) {
    if (isNaN(x) || isNaN(y)) return "0"

    return (y - 1) * 6000 + x;
};

function getAbs(id1, id2) {
    if (isNaN(id1) || isNaN(id2)) return "0";
    var res1 = {}
    res1.x = Math.abs((id1 % 6000) - (id2 % 6000))
    res1.y = Math.abs((Math.floor(id1 / 6000) + 1) - (Math.floor(id2 / 6000) + 1))

    if (res1.x > res1.y) return Math.round(res1.x * 2 / 3)
    else {
        return Math.round(res1.y * 2 / 3)
    }
}

function chooseDirection(x, y) {
    result = {}
    result.x = -1;
    result.y = -1;
    var x_my = global_data.my_group.posx
    var y_my = global_data.my_group.posy

    var dx = x_my - x
    var dy = y_my - y

    if (Math.abs(dx) < 13 && Math.abs(dy) < 13) {
        result.x = x;
        result.y = y;
        result.visible = true;
        return result;
    }

    if (dx < 0) {
        if (dy < 0) { //Done
            if (Math.abs(dx)) {
                result.x = 12 + x_my;
                result.y = 12 + y_my;
            } else {
                if (Math.abs(dx) > Math.abs(dy)) {
                    result.x = 12 + x_my
                    result.y = (((y - y_my) * 12) / (x - x_my)) + y_my
                }
                if (Math.abs(dy) > Math.abs(dx)) {
                    result.y = 12 + y_my
                    result.x = (((x - x_my) * 12) / (y - y_my)) + x_my
                }
            }
        }
        if (dy > 0) {
            if (Math.abs(dx) == Math.abs(dy)) {
                result.x = 12 + x_my;
                result.y = -12 + y_my
            } else {
                if (Math.abs(dx) > Math.abs(dy)) {
                    result.x = 12 + x_my
                    result.y = (((y - y_my) * 12) / (x - x_my)) + y_my
                }
                if (Math.abs(dy) > Math.abs(dx)) {
                    result.y = -12 + y_my
                    result.x = -((x - x_my) * 12) / (y - y_my) + x_my
                }
            }
        }
        if (dy == 0) {
            result.y = y_my;
            result.x = 12 + x_my;
        }
    }
    if (dx > 0) {
        if (dy < 0) { //Done
            if (Math.abs(dx) == Math.abs(dy)) {
                result.x = -12 + x_my;
                result.y = 12 + y_my;
            } else {
                if (Math.abs(dx) > Math.abs(dy)) {
                    result.x = -12 + x_my
                    result.y = -(((y - y_my) * 12) / (x - x_my)) + y_my
                }
                if (Math.abs(dy) > Math.abs(dx)) {
                    result.y = 12 + y_my
                    result.x = (((x - x_my) * 12) / (y - y_my)) + x_my
                }
            }
        }
        if (dy > 0) { //Done
            if (Math.abs(dx) == Math.abs(dy)) {
                result.x = -12 + x_my;
                result.y = -12 + y_my
            } else {
                if (Math.abs(dx) > Math.abs(dy)) {
                    result.x = -12 + x_my
                    result.y = -(((y - y_my) * 12) / (x - x_my)) + y_my
                }
                if (Math.abs(dy) > Math.abs(dx)) {
                    result.y = -12 + y_my
                    result.x = -((x - x_my) * 12) / (y - y_my) + x_my
                }
            }
        }
        if (dy == 0) {
            result.y = y_my;
            result.x = -12 + x_my;
        }
    }
    if (dx == 0) {
        result.x = x_my;
        if (dy < 0) {
            result.y = 12 + y_my
        }
        if (dy > 0) {
            result.y = -12 + y_my
        }
        if (dy == 0) {
            result.y = y_my;
        }
    }

    result.x = Math.round(result.x)
    result.y = Math.round(result.y)
    return result
}

var interval = 1000;
var timeoutId;

function goToGlobalCoordinates(x, y) {
    if (isNaN(x) || isNaN(y)) return;

    var result = chooseDirection(x, y)
    var id = 0
    if (result != null && result.hasOwnProperty("x") && result.x != -1 &&
        result.hasOwnProperty("y") && result.y != -1) {
        if (result.hasOwnProperty("visible") && result.visible == true) {
            id = 0;
            goTo({
                    "id": getId(result.x, result.y)
                });
        } else {
            id = getId(result.x, result.y)
        }

    }

    if (id != 0) {
        interval = goTo({
                "id": id
            }) * 1000;
        log.i("interval = " + interval)
        timeoutId = setTimeout(function() {
            start(x, y);
        }, interval)
    }
}

function start(x, y) {
    goToGlobalCoordinates(x, y)
}

function getCoordinatesAndStart(e) {
    var result = {}
    var num = Number(e)
    if (!isNaN(num)) {
        result.x = num % 6000
        result.y = Math.floor(num / 6000) + 1
        start(result.x, result.y)
        return result;
    } else {
        result = "isNan"
    }
}

function stop() {
    clearTimeout(timeoutId);
}

//------------------------------------------------------------------NAVIGATION END

//-------------------Helper functions

function log2(prefix, str) {
    var d = new Date();
    console.log(prefix + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() + "  -->" + str)
}

function clickStartDig() {
    top.frames["d_act"].Client.send('actNewMaps-StartDobycha=1')
}

var log = {
    e: function(str) {
        log2("_________  ", str)
    },
    i: function(str) {
        log2("______  ", str)
    },
    v: function(str) {
        log2("___  ", str)
    }
}

//Returns random number in range of @min and @max

    function getRandom(min, max) {
        return Math.random() * (max - min) + min;
    }

    // Возвращает случайное целое число между min (включительно) и max (не включая max)
    // Использование метода Math.round() даст вам неравномерное распределение!

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    //Returns timer value

    function getSecondsLeft() {
        var secondsLeft = parseInt(forest_frame.global_data.wait_time) -
        (parseInt(forest_frame.global_data.timestamp) + parseInt(Math.floor(new Date().getTime() / 1000)) - parseInt(forest_frame.Realtime))

        if (secondsLeft >= 0) {
            return secondsLeft
        } else {
            return "-1";
        }
    }

    //Returns text of overlayed window otherwise "Not overlayed"

    function getResponseIfExists() {
        if (isOverlayOn()) {
            return jQuery('#modal_form').text().slice()
        } else {
            return "Not overlayed"
        }
    }

    //Returns true or false

    function isOverlayOn() {
        return jQuery('#overlay').css("display") == "block"
    }

    //Clicks the overlay to hide

    function setOverlayOff() {
        if (isOverlayOn()) {
            jQuery('#overlay').click()
        }
    }

var forest_f = top.frames["d_act"].document;

var dotsArr = [];

function createDot(id, text) {
    var startCellId = forest_frame.global_data.my_group.id - 72012;
    var dx = (id - startCellId) % 6000;
    var dy = Math.abs(Math.floor((id - startCellId) / 6000));
    var rrr = createMyElement(forest_f, "div", "dot-" + id, "", "display:block;position: absolute; z-index:2; width:35px; height:35px; top:0%;left:0%;margin-top:" + (dy * 35) + "px; margin-left:" + (dx * 35) + "px;background-color: #ffffff45;color: red;", "", text);
    byIdFr("d_act", "canvas").parentNode.appendChild(rrr);
    dotsArr.push(rrr)
}

function clearDots() {
    dotsArr.forEach(function(item, i, arr) {
        item.remove();
    })
    dotsArr = [];
}

function byIdFr(dframe, did) {
    return top.frames[dframe].document.getElementById(did);
}

function createMyElement(targetframe, elname, elid, elclass, elstyle, elonclick, innertext) {
    var NewElem = targetframe.createElement(elname);
    NewElem.setAttribute("id", elid);
    NewElem.setAttribute("style", elstyle);
    NewElem.setAttribute("class", elclass);
    NewElem.setAttribute("onclick", elonclick);
    NewElem.innerHTML = innertext;
    return NewElem;
}

function startCanv() {
    var copperArr = [];
    var ironArr = [];
    if (searchCopper) copperArr = getAllItemsInRadius(12, "copper");
    if (searchIron || searchGold) ironArr = getAllItemsInRadius(12, "iron");

    byIdFr("d_act", "canvas").parentNode.style.overflow = "hidden";

    copperArr.forEach(id = > createDot(id, getIgnoredItemById(id).perc + ""))
    ironArr.forEach(id = > {
            if (searchGold) {
                createDot(id, getIgnoredItemById(id).perc + "<br />" + getIgnoredItemById(id).percGold)
            } else {
                createDot(id, getIgnoredItemById(id).perc + "")
            }
        })
}

function rewriteLocalStorage() {
    localStorage.setItem("last_state",
        JSON.stringify({
                "currentState": currentState,
                "hitCount": hitCount,
                "currentStoneId": currentStoneId
            }))
    localStorage.setItem("possibleLists",
        JSON.stringify({
                "possibleCopperIdList": possibleCopperIdList,
                "possibleIronIdList": possibleIronIdList,
                "possibleGoldIdList": possibleGoldIdList
            }))
    localStorage.setItem("ignoredItems",
        JSON.stringify({
                "ignoredItems": ignoredItems
            }))
}

function loadLocalStorage() {
    var lastState = JSON.parse(localStorage.getItem("last_state"))
    if (lastState != null) {
        if (lastState.hasOwnProperty("currentState")) currentState = lastState.currentState;
        if (lastState.hasOwnProperty("hitCount")) hitCount = lastState.hitCount;
        if (lastState.hasOwnProperty("currentStoneId")) currentStoneId = parseInt(lastState.currentStoneId);
    }
    var possibleLists = JSON.parse(localStorage.getItem("possibleLists"))
    if (possibleLists != null) {
        if (possibleLists.hasOwnProperty("possibleCopperIdList")) possibleCopperIdList = possibleLists.possibleCopperIdList;
        if (possibleLists.hasOwnProperty("possibleIronIdList")) possibleIronIdList = possibleLists.possibleIronIdList;
        if (possibleLists.hasOwnProperty("possibleGoldIdList")) possibleGoldIdList = possibleLists.possibleGoldIdList;
    }
    var _ignoredItems = JSON.parse(localStorage.getItem("ignoredItems"))
    if (_ignoredItems != null) {
        if (_ignoredItems.hasOwnProperty("ignoredItems")) ignoredItems = _ignoredItems.ignoredItems;
    }
}

forest_frame.OpenCapcha = function OpenCapcha(data) {

    fetch("http://newforest.apeha.ru/interface/codeimage.fpl/" + data.ci).then(data1 = > data1.blob()).then(res = > {
            Tesseract.recognize(res)
                .then(function(result) {
                    lang: "equ" // Язык текста
                })
                .then(function(result) {
                    var r = result.text.replace(/\D/g, '')
                    if (r.length == 4) {
                        setTimeout(function() {
                            forest_frame.Client.send('actNewMaps-StartDobycha=' + data.ci + '.' + r)
                        }, getRandom(500, 700));
                        log.i("sent = " + r);
                    } else {
                        log.i("NOT sent = " + r);
                    }
                })
        })
}