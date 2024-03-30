var GlobalBoards = {};
var GlobalBoardTabs = {};
var GlobalMyPosts = new Array();
var GlobalXPosts = new Array();
var GlobalCurTrib = '';
var GlobalPinni = null;
var GlobalProcessing = false;
var GlobalWindowFocus = true;
var GlobalFilters = new Array();
var GlobalOnTouch = false;

var norloge_exp = new RegExp("((?:1[0-2]|0[1-9])/(?:3[0-1]|[1-2][0-9]|0[1-9])#|[0-9]{4}-[0-9][0-9]-[0-9][0-9]T)?((?:2[0-3]|[0-1][0-9])):([0-5][0-9])(:[0-5][0-9])?([¹²³]|[:\^][1-9]|[:\^][1-9][0-9])?(@[A-Za-z0-9_]+)?", "");

window.notified = function (notif) {
    if (GlobalWindowFocus) return;
    var titre = document.title.substr(0,1);
    switch (notif) {
        case NOTIF_NEW_POST:
            if (titre != "#" && titre != "@" && titre != "<") {
                favicon.change("img/ico_new.png", "* " + settings.value('window_title'));
            }
            break;
        case NOTIF_ANSWER:
            favicon.change("img/ico_reply.png", "# " + settings.value('window_title'));
            //if (settings.value('sound_enabled')) {
                // alert("coin");
            //    sound_play("../sound/"+settings.value('sound_reply'));
            //}
            break;
        case NOTIF_BIGORNO_ALL:
            if (titre != "@") {
                favicon.change("img/ico_bigoall.png", "< " + settings.value('window_title'));
            }
            //if (settings.value('sound_enabled')) {
                // alert("meuh");
            //    sound_play("../sound/"+settings.value('sound_bigorno'));
            //}
            break;
        case NOTIF_BIGORNO:
            favicon.change("img/ico_bigorno.png", "@< " + settings.value('window_title'));
            //if (settings.value('sound_enabled')) {
                // alert("meuh");
            //    sound_play("../sound/"+settings.value('sound_bigorno'));
            //}
            break;
    }
}

function onBlur(event) {
    var target = event.target || event.srcElement;
    if (target == window || target == document) {
        GlobalWindowFocus = false;
    }
}
addEvent(window, 'blur', onBlur, false);

function pointsToMyPost(ref) {
    for (var i=GlobalMyPosts.length; i--;) {
        if (pointsTo(GlobalMyPosts[i], ref)) {
            return true;
        }
    }
    return false;
}

function insertToPinni(post, postId, board, clock, login, info, message, realId) {
    var allposts = GlobalPinni.getElementsByTagName("div") || [];
    var curDiv = null;
    var curId = null;
    for (var i=allposts.length; i--;) {
        curDiv = allposts[i];
        curId = curDiv.getAttribute("id");
        if ((curId != "") && (curId < postId)) break;
        curId = null;
    }
    if (curId == null) {
        GlobalPinni.insertBefore(post, GlobalPinni.firstChild); //appendChild(post);
    }
    else {
        var next = curDiv.nextSibling;
        if (next) {
            GlobalPinni.insertBefore(post, next);
        }
        else {
            GlobalPinni.appendChild(post);
        }
    }
    var ind = 0;
    var prevPost = post.previousSibling;
    if (prevPost && (prevPost.nodeName.toLowerCase() == "div")) {
        var prevId = prevPost.getAttribute("id");
        if ((prevId.substr(0,10) == postId.substr(0,10)) &&
            (prevId.substr(13) == postId.substr(13))) {
            ind = parseInt(prevId.substr(10,2),10) + 1;
            if (ind == 1) {
                // L'indice est 1, ce qui signifie qu'un post de même horloge et
                // d'indice 0 existe juste avant, il faut donc mettre l'indice de
                // ce post à 1 et incrémenter à 2 l'indice du post courant
                var newPrevId = prevId.substr(0,10)+"01"+prevId.substr(12);
                prevPost.setAttribute("id", newPrevId);
                ind++;
                if (GlobalMyPosts.contains(prevId)) {
                    GlobalMyPosts.remove(prevId)
                    GlobalMyPosts.push(newPrevId);
                }
            }
        }
    }
    var newId = postId.substr(0,10) + pad0(ind) + postId.substr(12);
    post.setAttribute("id", newId);
    var fmessage = message;
    [writeClocks, writeBigorno, writeTotoz, writeUrl, writeLecon].each(function(f){fmessage = f(fmessage, board, newId, post);});
    fmessage = writePlonk(fmessage, board, post, login, info);
    if (settings.value('balltrap')) {
        fmessage = writeDuck(fmessage, board, post, newId);
    }
    var cclass = "clock";
    if (seemsToBePostedByMe(board, login, info, realId)) {
        cclass += " mypost";
        GlobalMyPosts.push(newId);
        addClass(post, "mypost");
    }
    post.innerHTML = '\n<div class="post"><span class="'+cclass+'" title="'+realId+' ['+board.name+']">' + clock + '</span> '
        + formatLogin(login, info) + ' <span class="message">' + fmessage + '</span></div>\n';
    if (GlobalFilters.length > 0) {
        var pclass = post.className; // getAttribute('class');
        post.style.display = 'none';
        for (var i=GlobalFilters.length; i--;) {
            if (pclass.indexOf(GlobalFilters[i]) != -1) {
                post.style.display = '';
                break;
            }
        }
    }
    // Toujours ouvrir les urls dans un autre onglet
    var urls = post.getElementsByTagName('a');
    for (i=0; i<urls.length;i++) {
        urls[i].setAttribute('target','_blank');
    }
    board.notify(NOTIF_NEW_POST, postId, post);
    // Effacement des posts en cas de dépassement de la taille maxi du pinnipède
    if (allposts.length > (2 * settings.value('pinni_size'))) {
        var i=0;
        if (settings.value('pinni_keep')) {
            // On n'efface pas les posts importants pour l'user
            while (i<allposts.length && allposts[i].className.match(/(mypost|answer|bigorno)/)) i += 2;
        }
        GlobalPinni.removeChild(allposts[i]);
    }
}

function getBoardFromAlias(alias) {
    var name = null;
    for (name in GlobalBoards) {
        if (alias.toLowerCase() == name) return name;
        if (GlobalBoards[name].alias.split(",").contains(alias.toLowerCase())) return name;
    }
    return null;
}

function onChangeTrib() {
    if($("#tribune li.selected").length == 0) {
        //aucune tribune sélectionnée -> on sélectionne la première dans la liste
        $("#tribune li:first").addClass('selected');
        $("#tribune li:first a span").removeClass('glyphicon-none').addClass('glyphicon-check');
    }
    var trib = $("#tribune li.selected").data('name');
    var palmi = $('#message')[0];
    palmi.style.background = GlobalBoards[trib].color;
    // update des @tribune des horloges dans le palmi
    var message = palmi.value;
    var offset = 0;
    var indexes = new Array();
    // On recherche les indices des horloges
    var h = norloge_exp.exec(message);
    while(h && h.length > 0) {
        offset += h.index + h[0].length;
        if (h[6]) {
            var refboard = getBoardFromAlias(h[6].substr(1));
            if (refboard == trib) {
                indexes.push([offset, h[6].length]);
            }
        }
        else {
            if (trib != GlobalCurTrib) {
                indexes.push([offset, "@"+GlobalCurTrib]);
            }
        }
        // Recherche de la prochaine occurrence de norloge
        h = norloge_exp.exec(message.substr(offset));
    }
    // MAJ des references @tribune
    for (var i=indexes.length-1; i>=0; i--) {
        var pos_str = indexes[i];
        if (typeof(pos_str[1]) == 'number') {
            // effacement d'un @tribune devenu inutile
            message = message.substr(0, pos_str[0]-pos_str[1])+message.substr(pos_str[0]);
        }
        else {
            // ajout d'un @tribune
            message = message.substr(0, pos_str[0])+pos_str[1]+message.substr(pos_str[0]);
        }
    }
    palmi.value = message;
    // Mémorisation de la tribune courante
    GlobalCurTrib = trib;
}

function toPinniBottom() {
    var test1 = GlobalPinni.scrollHeight;
    if (test1 > 0) {
        GlobalPinni.scrollTop = GlobalPinni.scrollHeight;
    }
    else {
        GlobalPinni.scrollTop = GlobalPinni.offsetHeight;
    }
}

function addTabToPinni(name) {
    var board = GlobalBoards[name];
    if (!board.getUrl) {
        //alert("board "+name+" n'a pas d'url définie");
        return;
    }
    var tab = new BoardTab(board);
    GlobalBoardTabs[board.name] = tab;
    tab.addTab();
    (board.initstate == STATE_STOP) ? board.stop() : board.refresh();
    return board;
}

function refreshAll() {
    for (var name in GlobalBoards) {
        var board = GlobalBoards[name];
        board.refresh();
    }
}

function stopAll() {
    for (var name in GlobalBoards) {
        var board = GlobalBoards[name];
        board.stop();
    }
}

function sendPost() {
    var dest = $("#tribune li.selected").data('name');
    var palmi = document.getElementById('message');
    GlobalBoards[dest].post(palmi.value);
}

function pointsTo(postid, ref) {
    if (postid.substr(13) != ref.substr(16)) return false;
    if (postid.substr(0,8) != ref.substr(3,8)) return false;
    var postsec = postid.substr(8,2);
    var refsec = ref.substr(11,2);
    if (refsec == "--") return true;
    if (postsec != refsec) return false;
    var posti = postid.substr(10,2);
    var refi = ref.substr(13,2);
    if (refi == "--" || (refi == "01" && posti == "00")) return true;
    if (posti != refi) return false;
    return true;
}

function dispAll() {
    for (var name in GlobalBoardTabs) {
        var boardTab = GlobalBoardTabs[name];
        if (boardTab.board.state != STATE_LOADED) {
            boardTab.display();
        }
    }
    toPinniBottom();
}

function onMouseOver(event) {
    unhilightall();
    $("#popup").empty().hide();

    var target = event.target || event.srcElement;
    // var name = target.nodeName.toLowerCase();
    var targetClass = target.className; // getAttribute('class');
    var targetId = target.getAttribute('id');
    if (!targetClass) return;
    if (targetClass.indexOf('clockref') != -1) {
        hilightRef(targetId, target.parentNode.parentNode);
    } else if (targetClass.indexOf('clock') != -1) {
        hilightPost(target.parentNode.parentNode.getAttribute('id'), target.parentNode.parentNode);
    } else if (targetClass.indexOf('totoz') != -1) {
        if (settings.value('totoz_mode') != TOTOZ_INLINE) {
            var totoz = getTotoz(targetId.substr(6));
            showTotoz(totoz, event.clientX, event.clientY);
        }
    } else if (targetClass.indexOf('urlpreview') != -1) {
        if(settings.value('urlpreview') && !GlobalOnTouch) {
            $(target).popover({
                html: true,
                placement: 'auto',
                container: "#pinnipede",
                title: "Loading url...",
                content: '<div class="loadingwide"></div>'
            }).popover('show');
            var urlPopover = $(target).data('bs.popover');
            $.getJSON('linkpreview.php?url=' + target.getAttribute('href'), function (data) {
                var response = '<div class="pull-left">';
                response += '<img class="img-preview" src="' + data.cover + '">';
                response += "</div>";
                response += data.description;
                urlPopover.options.title = data.title;
                urlPopover.options.content = response;
                $(target).popover('show');
            }).fail(function (jqxhr, textStatus, error) {
                urlPopover.options.content = error;
            });
        }
    }
}

function onMouseOut(event) {
    var target = event.target || event.srcElement;
    var targetClass = target.className; // getAttribute('class');
    var targetId = target.getAttribute('id');
    if (!targetClass) return;
    if (targetClass.indexOf('totoz') != -1) {
        document.getElementById('totozImg[' + targetId.substr(6) + ']').style.display = 'none';
    } else if (targetClass.indexOf('urlpreview') != -1) {
        if(settings.value('urlpreview')) {
            $(target).popover('destroy');
        }
    }
}

function removeNotif() {
    // Enlève la marque de notification
    GlobalWindowFocus = true;
    favicon.change(settings.value('favicon'), settings.value('window_title'));

    // Enlève le style newpost sur les DIVs
    var allDivs = evalexp("//div[contains(@class,'newpost')]");

    for (var i=getLength(allDivs); i--;) {
        var curdiv = getItem(allDivs, i);
        var dclass = getStyleClass('pinni-'+curdiv.getAttribute('id').split("@")[1]);
        if (curdiv.style.display != 'none' && (dclass && dclass.style.display != 'none')) {
            removeClass(curdiv, 'newpost');
        }
    }
}

function onClick(event) {
    var target = event.target || event.srcElement;
    var nodeClass = target.className;

    removeNotif();

    // Click sur un canard
    if (nodeClass.indexOf('canard') != -1) {
        var root = target.parentNode;
        while (root && root.nodeName.toLowerCase() != 'div') root = root.parentNode;
        // alert(root.getAttribute('id') + "\n" + root.parentNode.getAttribute('id'));
        // alert(settings.value('balltrap_mode'));
        switch (settings.value('balltrap_mode')) {
            case BALLTRAP_ONCLICK:
                // alert(root.parentNode.getAttribute('id'));
                launchDuck(root.parentNode.getAttribute('id'), (nodeClass.indexOf('table') != -1));
                break;
            case BALLTRAP_KILL:
                balltrap_kill(root.parentNode.getAttribute('id'));
                break;
        }
    }

    // Click sur un login
    else if (nodeClass.indexOf('login') != -1 || nodeClass.indexOf('ua') != -1) {
        var nodeId = target.parentNode.parentNode.getAttribute('id');
        setPalmiTrib(nodeId.substr(13));
        insertInPalmi(target.innerHTML.strip()+"< ");
    }

    // Click sur une norloge-référence
    else if (nodeClass.indexOf('clockref') != -1) {
        var ref = target.getAttribute('id');

        var query = "//div[contains(@class,'pinni-"+ref.substr(16)+"') and starts-with(@id,'"+ref.substr(3,8)+"')]";
        var allposts = evalexp(query);

        var curDiv = null;
        var curId = null;
        for (var i=getLength(allposts); i--;) {
            curDiv = getItem(allposts, i);
            curId = curDiv.getAttribute("id");
            if (pointsTo(curId, ref)) {
                GlobalPinni.scrollTop = document.getElementById(curId).offsetTop-event.clientY+GlobalPinni.offsetTop+6;
                //flash(document.getElementById(curId));
                break;
            }
        }
    }

    // Click sur la norloge d'un post
    else if (nodeClass.indexOf('clock') != -1) {
        var nodeId = target.parentNode.parentNode.getAttribute('id');
        setPalmiTrib(nodeId.substr(13));
        insertInPalmi(getCtxtClock($('#tribune li.selected').data('name'), nodeId)+' ');
    }
}

function setPalmiTrib(trib) {
    var list = $('#tribune');
    var select = list.find('li.selected').data('name');
    if (trib == select) return;
    list.find('li').each(function(index, item){
        if($(this).data('name') == trib) {
            $(this).addClass('selected');
            $(this).find('span.glyphicon').addClass('glyphicon-check').removeClass('glyphicon-none');
            onChangeTrib();
        } else {
            $(this).find('span.glyphicon').removeClass('glyphicon-check').addClass('glyphicon-none');
            $(this).removeClass('selected');
        }
    });
}

function insertInPalmi(text, pos) {
    var palmi = document.getElementById('message');
    if (pos) {
        insertTextAtCursor(palmi, text, pos);
    }
    else {
        insertTextAtCursor(palmi, text, text.length);
    }
}

function insertTextAtCursor(element, text, pos) {
    if (!pos) {
        pos = text.length;
    }
    var selectionEnd = element.selectionStart + pos;
    element.value = element.value.substring(0, element.selectionStart) + text +
        element.value.substr(element.selectionEnd);
    element.focus();
    element.setSelectionRange(selectionEnd, selectionEnd);
}


var highlightMode = false;
function onKeyDown(event) {
    var target = event.target || event.srcElement ;
    if (event.keyCode == 27) {
        bossMode();
    } else if (target.id == 'message') {
        if (event.altKey) {
            var keychar = String.fromCharCode(event.keyCode).toLowerCase();
            switch(keychar) {
                case 'o':
                    insertInPalmi('_o/* <b>BLAM</b>! ');
                    break;
                case 'm':
                    insertInPalmi('====> <b>Moment ' + getSelectedText() +'</b> <====', 16);
                    break;
                case 'f':
                    insertInPalmi('#fortune ');
                    break;
                case 'b':
                    insertInPalmi('<b>' + getSelectedText()+'</b>', 3);
                    break;
                case 'i':
                    insertInPalmi('<i>' + getSelectedText()+'</i>', 3);
                    break;
                case 'u':
                    insertInPalmi('<u>' + getSelectedText()+'</u>', 3);
                    break;
                case 's':
                    insertInPalmi('<s>' + getSelectedText()+'</s>', 3);
                    break;
                case 't':
                    insertInPalmi('<tt>' + getSelectedText()+'</tt>', 4);
                    break;
                case 'p':
                    insertInPalmi('_o/* <b>paf!</b> ');
                    break;
//              case 'c':
//                insertInPalmi('\\o/ chauvounet \\o/');
//                break;
                case 'n':
                    insertInPalmi('ounet');
                    break;
                case 'g':
                    insertInPalmi('Ta gueule pwet');
                    break;
                case 'z':
                    insertInPalmi('Daubian is dying');
                    break;
            }
            switch(keychar) {
                case 'o':
                case 'm':
                case 'f':
                case 'b':
                case 'i':
                case 'u':
                case 's':
                case 't':
                case 'p':
//              case 'c':
                case 'n':
                case 'g':
                case 'z':
                    event.stopPropagation();
                    event.preventDefault();
            }
        }
    } else {
        if (event.altKey) {
            var keychar = String.fromCharCode(event.keyCode).toLowerCase();
            if(keychar == 'p'){
                $("#message").focus();
            }
        } /*else if(event.ctrlKey) {
            var keychar = String.fromCharCode(event.keyCode).toLowerCase();
            if(keychar == 'h'){
                event.preventDefault();
                highlightMode = true;
            }
        }
        if(highlightMode == true) {
            if(event.keyCode == 38) { //up
                event.preventDefault();
                unhilightall();
                var highlight = $("#pinnipede .highlightBrowse").removeClass('highlightBrowse');
                if(highlight.length == 0) {
                    //no highlight, get the last clock
                    var last = $(".post-container").last();
                    highlightLastClockInPost(last);
                } else {
                    var post = highlight.closest('.post-container');

                    if(highlight.hasClass('clock')) {
                        var previousPost = post.prev();
                        highlightLastClockInPost(previousPost);
                    } else {
                        var previousClock = highlight.prev('.clockref');
                        if(previousClock.length == 0) {
                            highlightLastClockInPost(post.prev());
                        } else {
                            previousClock.addClass('highlightBrowse');
                            hilightRef(previousClock.attr('id'), previousClock[0].parentNode.parentNode);
                        }
                    }
                }
            } else if(event.keyCode == 40) { //down
                var highlight = $("#pinnipede .highlightBrowse");
                if(highlight.length == 0) {

                } else {

                }
            } else if(event.keyCode == 13) { //enter
                event.preventDefault();
                var highlight = $("#pinnipede .highlightBrowse");
                if(highlight.length > 0 && highlight.hasClass('clock')) {
                    var nodeId = highlight.closest('.post-container').attr('id');
                    setPalmiTrib(nodeId.substr(13));
                    insertInPalmi(getCtxtClock($('#tribune li.selected').data('name'), nodeId)+' ');
                    exitHighlightMode();
                }
            }
        }*/
    }
}

function highlightLastClockInPost(post) {
    var clockrefs = post.find('.message .clockref');
    if(clockrefs.length == 0) {
        //highlight clock
        post.find('.clock').addClass('highlightBrowse');
        var clock = post.find('.clock')[0].parentNode.parentNode;
        hilightPost(clock.getAttribute('id'), clock);
    } else {
        //highlight last clockref
        var lastClockref = clockrefs.last();
        lastClockref.addClass('highlightBrowse');
        hilightRef(lastClockref.attr('id'), lastClockref[0].parentNode.parentNode);
    }
}

function exitHighlightMode() {
    highlightMode = false;
    $("#pinnipede .highlightBrowse").removeClass('highlightBrowse');
}

function clickBoard(boardName, event) {
    if (event.ctrlKey) {
        event.preventDefault();
        GlobalBoardTabs[boardName].toggle();
    }
    else {
        for (var name in GlobalBoards) {
            var board = GlobalBoards[name];
            if (board.state != STATE_LOADED) {
                if (name == boardName) {
                    GlobalBoardTabs[name].display();
                    setPalmiTrib(name);
                }
                else {
                    GlobalBoardTabs[name].hide();
                }
            }
        }
    }
    toPinniBottom();
}

function toggleFilter(filter) {
    resetFilter();
    var fil = filter.attr('id').substr(7);
    if (GlobalFilters.contains(fil)) {
        filter.find('span.glyphicon').removeClass('glyphicon-check').addClass('glyphicon-remove');
        GlobalFilters.remove(fil);
    }
    else {
        filter.find('span.glyphicon').addClass('glyphicon-check').removeClass('glyphicon-remove');
        GlobalFilters.push(fil);
    }
    filterPosts(GlobalFilters);
}

function filterPosts(classes) {
    var condition = classes.map(function(i){return "not(contains(@class, '"+i+"'))"}).join(" and ");
    var allposts = evalexp("//div[contains(@class, 'pinni-') and "+condition+"]");

    for (var i=getLength(allposts); i--;) {
        getItem(allposts, i).style.display = 'none';
    }
    toPinniBottom();
}

function resetFilter() {
    var allposts = GlobalPinni.getElementsByTagName("div") || [];
    for (var i=allposts.length; i--;) {
        allposts[i].style.display = '';
    }
}

function searchTotoz() {
    $("#form-totoz input").popover('destroy');
    var totoz = document.getElementById('totoz-search').value;
    if (!totoz) { return; }
    //document.getElementById('totoz-status').src = "img/wait.gif";
    var url = settings.value('totoz_server') + "search.xml{question}terms=" + encodeURI(escape(totoz)); // + "{amp}xml=true";
    $.get('backend.php?url='+url, function(data, status, xhr){
        displayTotoz(xhr.responseText);
    }, "xml")
        .fail(function(xhr, status, error){
            $("#form-totoz input").popover({
                html: true,
                placement: "top",
                content: error
            }).popover('show');
        });
}

function displayTotoz(res) {

        var totozfound = loadXML(res);
        var totozNodes = totozfound.getElementsByTagName("name") || [];
        totozwrap = $('<table class="table"></table>');//document.createElement('table');
        totozbody = $('<tbody></tbody>');
        totozwrap.append(totozbody);
        var server = settings.value('totoz_server');
        for (var i=0; i<totozNodes.length; ++i) {
            var curtotoz = getNodeText(totozNodes[i]);
            var totoz = "[:"+curtotoz+"]";
            var tr = $('<tr data-totoz="'+totoz+' " class="totoz-result"></tr>');

            var td = $('<td class="maxwidth90"><img class="img-responsive img-rounded" src="'+server+'/img/'+curtotoz+'" alt="'+totoz+'" /></td>');//document.createElement('td');

            tr.append(td);
            var td2 = $('<td class="maxwidth210"><span class="totoz">'+totoz+'</span></td>');

            tr.append(td2);
            totozbody.append(tr);
        }
        if(totozNodes.length == 0) {
            totozwrap = $("<div>Aucun résultat</div>");
        }
        $("#form-totoz input").popover({
            html: true,
            placement: "top",
            content: totozwrap
        }).popover('show');
}

$(document).ready(function(){

    $(document)
        .ajaxSend(function(event, jqxhr, settings) {
            if(settings.url.indexOf('search.xml') > -1) {
                $("#totoz-search").addClass('loading');
            }
            if(settings.url.indexOf('post.php') > -1) {
                $("#message").addClass('loading');
            }
        })
        .ajaxComplete(function(event, jqxhr, settings) {
            if(settings.url.indexOf('search.xml') > -1) {
                $("#totoz-search").removeClass('loading');
            }
            if(settings.url.indexOf('post.php') > -1) {
                $("#message").removeClass('loading');
                jqxhr
                    .success(function(){
                        $("#message").val('');
                        if(GlobalOnTouch) {
                            closeKeyboard($("#message"));
                        }
                    })
                    .fail(function(){
                        if(jqxhr.status == 302) {
                            $("#message").val('');
                            if(GlobalOnTouch) {
                                closeKeyboard($("#message"));
                            }
                        }
                    });
            }
        });

    $(".pick-a-color").pickAColor();

    for (var name in GlobalBoards) {
        $("#preconfTribune").append('<option value="'+name+'">'+name+'</option>');
    }

    $("#addTribune").on('click', function(e){
        $("#preconfTribune").closest('.form-group').show();
    });

    $("#preconfTribune").on("change", function(){
        var name = $(this).val();
        var board = GlobalBoards[name];
        $("#backendTribune").val(board.getUrl);
        $("#colorTribune").val(board.color.substr(1)).trigger('blur');
        $("#aliasTribune").val(board.alias);
        $("#nameTribune").val(board.name);
        $("#postTribune").val(board.postUrl);
        if(board.slip == SLIP_TAGS_RAW) {
            $("#slipTribune option[value=1]").prop('selected', true);
        } else {
            $("#slipTribune option[value=2]").prop('selected', true);
        }
        $("#datapostTribune").val(board.postData);

    });

    $("#forceRefresh").on('click', function(e) {
        refreshAll();
    });

    $("#stopTribunes").on('click', function(e){
        stopAll();
    });

    $("#bossMode").on('click', function(e){
        bossMode();
    });

    $("#confTribune").on('submit', function(e){
        e.preventDefault();
        saveBoardConfig($("#nameTribune").val());
        $("#confTribuneModal").modal('hide');
    });

    $("#config-form").on('submit', function(e){
        e.preventDefault();
        saveConfig();
        $(this).closest('.modal').modal('hide');
    });

    $("#confModal").on('show.bs.modal', function(e){
        loadConfig();
    });

    $("#confTribuneModal").on('hidden.bs.modal', function(e){
        if($("#confModal").is(':visible')) {
            $('body').addClass('modal-open');
        }
    });

    $("#attach-form").on('submit', function(e){
        e.preventDefault();
        var action = $(this).attr('action');
        var fd = new FormData($("#attach-form").get(0));
        $.ajax({
            url: action,
            type: 'POST',
            data: fd,
            dataType: 'json',
            success:function(data){
                insertInPalmi(" " + data.file_url + " ");
                $("#fileModal").modal('hide');
            },
            cache: false,
            contentType: false,
            processData: false
        });

    });

    $("#form-totoz").on('submit', function(e) {
       e.preventDefault();
        searchTotoz();
    });

    $('#form-totoz').on('click', '.totoz-result', function(e){
        e.preventDefault();
        insertInPalmi($(this).data('totoz'));
    });

    $("#form-totoz .input-group-addon").on('click', function(e){
        $("#form-message .form-group").addClass('unfocus').removeClass('focusin');
        $("#form-totoz .form-group").addClass('focusin').removeClass('unfocus');
        $("#form-totoz input").focus();
    });

    $("#form-message").on("focusin click", function(e){
        if($("#form-totoz .popover").length == 0 || e.type == "click") {
            $("#form-message .form-group").addClass('focusin').removeClass('unfocus');
            $("#form-totoz .form-group").addClass('unfocus').removeClass('focusin');
        }
    });
	
    //close popover when click outside
    $(document).on('click', function (e) {
        $('[data-toggle="popover"],[data-original-title]').each(function () {
            //the 'is' for buttons that trigger popups
            //the 'has' for icons within a button that triggers a popup
            if (!$(this).is(e.target) && $(this).has(e.target).length === 0 && $('.popover').has(e.target).length === 0) {
                $(this).popover('destroy');
            }

        });
    });

    getSoundList();
    settings.setDefault();
    settings.load();

    if(settings.value('speedaccess') == true) {
        $("#tabs-boards").addClass('speedaccess');
		//ios fix... 
		$("#menu-toggle").on('click', function(e) {
			if($("#wrapper").hasClass('toggled')){
				$("#tabs-boards").detach().appendTo('#pinnipede');
			} else {
				$("#tabs-boards").detach().appendTo('#sidebar-tribunes');
			}
		});
    }
	
    // close sidebar by default if smartphone
    if($(window).width() <=768) {
        $("#menu-toggle").trigger('click');
    }
	
    if(settings.value('autocomplete') == false) {
        $("#message").attr('autocomplete', 'off');
    }

    // Numéro de version
    //document.getElementById('version').innerHTML = VERSION;
    GlobalPinni = document.getElementById("pinnipede");
    var boards = settings.value('active_boards');

    for (var i=boards.length; i--;) {
        var name = boards[i];
        if (!GlobalBoards[name]) {
            var board = new Board(name, true);
            board.loadConfig();
            GlobalBoards[name] = board;
        }
        addTabToPinni(name);
    }
    dispAll();

    if (boards.length > 0) {
        onChangeTrib();
    }

    favicon.change(settings.value('favicon'), settings.value('window_title'));

    addEvent(GlobalPinni, 'mouseover', onMouseOver, false);
    addEvent(GlobalPinni, 'mouseout', onMouseOut, false);
    addEvent(GlobalPinni, 'click', onClick, false);
    addEvent(document, 'keydown', onKeyDown, false);

    $("#tribune a").on("click", function(e){
        var trib = $(this).closest('li').data('name');
        setPalmiTrib(trib);
    });

    $("#form-message").on('submit', function(e){
        e.preventDefault();
        sendPost();
    });

    $("#filters a").on('click', function(e){
        e.preventDefault();
        if($(this).attr('id') == 'filter-reset') {
            GlobalFilters = [];
            resetFilter();
            $('#filters a span.glyphicon').addClass('glyphicon-remove').removeClass('glyphicon-check');
            toPinniBottom();
        } else {
            toggleFilter($(this));
        }
    });

    if(settings.value("balltrap") == true) {
        balltrap_init();
        addEvent(window, 'resize', balltrap_init, false);
    }

    //Populate config
    $("#confModal").on('shown.bs.modal', function(e){
        $("#config-tribunes_list").empty();
        for (name in GlobalBoards) {
            var board = GlobalBoards[name];
            if (board.state != STATE_LOADED) {
                addConfigLine(board, $("#config-tribunes_list")[0]);
            }
        }
    });

    /* ********************* */
    /* Interactions tactiles */
    /* ********************* */

	//detect keyboard appearing/closing
	var _originalSize = $(window).width() + $(window).height()
	$(window).resize(function(){
		if($(window).width() + $(window).height() < _originalSize - 50){
			//console.log("keyboard show up");  
			if($("#form-totoz .popover").length > 0) {
                $("#form-totoz input").popover('show');
			}
		}else{
			//console.log("keyboard closed");
			if($("#form-totoz .popover").length > 0) {
				$("#form-totoz input").popover('show');
			}
		}
	});
	
    //allow text selection
    delete Hammer.defaults.cssProps.userSelect;
	//touch events on palmi : only to detect device's type
	var mcPalmi = new Hammer.Manager(document.getElementById('message'));
	mcPalmi.add(new Hammer.Tap({ event: 'tap'}));
	mcPalmi.on('tap', function(ev){
        if(ev.pointerType == 'touch') {
            GlobalOnTouch = true;
        }
	});
	//touch events on Pinni
    PreventGhostClick(GlobalPinni);
    var mc = new Hammer.Manager(GlobalPinni);

    // Tap recognizer with minimal 2 taps
    mc.add( new Hammer.Tap({ event: 'doubletap', taps: 2 }) );
    // Single tap recognizer
    mc.add( new Hammer.Tap({ event: 'singletap' }) );

    mc.add( new Hammer.Swipe({event: 'swipe', direction: Hammer.DIRECTION_HORIZONTAL}));

    // we want to recognize this simulatenous, so a quadrupletap will be detected even while a tap has been recognized.
    mc.get('doubletap').recognizeWith('singletap');
    // we only want to trigger a tap, when we don't have detected a doubletap
    mc.get('singletap').requireFailure('doubletap');

    mc.on('doubletap', function(ev) {
        if(ev.pointerType == 'touch') {
            $(ev.target).closest('.post-container').find('.clock').trigger('click');
			
			var target = $(ev.target);
            if (target.closest('li').hasClass('tab')) {
                var boardName = target.closest('li').attr('id').substr(4);
                for (var name in GlobalBoards) {
                    var board = GlobalBoards[name];
                    if (board.state != STATE_LOADED) {
                        if (name == boardName) {
                            GlobalBoardTabs[name].display();
                            setPalmiTrib(name);
                        }
                        else {
                            GlobalBoardTabs[name].hide();
                        }
                    }
                }
				toPinniBottom();
            }
            
        }
    });

    mc.on('singletap', function(ev) {
        if(ev.pointerType == 'touch') {
            GlobalOnTouch = true;
            var target = $(ev.target);
            if (target.is('a') 
                || target.hasClass('clock')
                || target.hasClass('clockref')
                || target.hasClass('ua')
                || target.hasClass('login')
                || target.hasClass('tab')) {
				if (target.closest('li').hasClass('tab')) {
					var boardName = target.closest('li').attr('id').substr(4);
					GlobalBoardTabs[boardName].toggle();
					toPinniBottom();
				} else {
					target[0].click();
				}
            } else if (!target.hasClass('clockref')) {//évite la double sélection
                var parent = target.closest('.post-container');
                hilightPost(parent.attr('id'), parent[0]);
            }
            removeNotif();
            $("#form-totoz input").popover('destroy');
        }
    });

    mc.on('swipe', function(ev) {
        GlobalOnTouch = true;
        if(ev.direction == Hammer.DIRECTION_LEFT && !$("#wrapper").hasClass("toggled")) {
            $("#menu-toggle").trigger('click');
        } else if(ev.direction == Hammer.DIRECTION_RIGHT && $("#wrapper").hasClass("toggled")) {
            $("#menu-toggle").trigger('click');
        }
    });

    var mc2 = new Hammer.Manager(document.getElementById("sidebar-wrapper"));
    // Tap recognizer with minimal 2 taps

    mc2.add( new Hammer.Swipe({event: 'swipe', direction: Hammer.DIRECTION_HORIZONTAL}));
    mc2.on('swipe', function(ev) {
        GlobalOnTouch = true;
        if(ev.direction == Hammer.DIRECTION_LEFT && !$("#wrapper").hasClass("toggled")) {
            $("#menu-toggle").trigger('click');
        } else if(ev.direction == Hammer.DIRECTION_RIGHT && $("#wrapper").hasClass("toggled")) {
            $("#menu-toggle").trigger('click');
        }
    });
    PreventGhostClick($("#tabs-boards")[0]);


    mc2.add( new Hammer.Tap({ event: 'doubletap', taps: 2 }) );
    mc2.add(new Hammer.Tap({event: 'tap'}));
    mc2.get('doubletap').recognizeWith('tap');
    mc2.get('tap').requireFailure('doubletap');

    mc2.on('doubletap', function(ev){
        if(ev.pointerType == 'touch') {
            var target = $(ev.target);
            if (target.closest('li').hasClass('tab')) {
                var boardName = target.closest('li').attr('id').substr(4);
                for (var name in GlobalBoards) {
                    var board = GlobalBoards[name];
                    if (board.state != STATE_LOADED) {
                        if (name == boardName) {
                            GlobalBoardTabs[name].display();
                            setPalmiTrib(name);
                        }
                        else {
                            GlobalBoardTabs[name].hide();
                        }
                    }
                }
            }
            toPinniBottom();
        }
    });

    mc2.on('tap', function(ev){
        if(ev.pointerType == 'touch') {
            GlobalOnTouch = true;
            var target = $(ev.target);
            if (target.closest('li').hasClass('tab')) {
                var boardName = target.closest('li').attr('id').substr(4);
                GlobalBoardTabs[boardName].toggle();
                toPinniBottom();
            }
        }
    });
});
