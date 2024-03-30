/************************************************************
 * OnlineCoinCoin, by Chrisix (chrisix@gmail.com)
 * Définition des tribunes préconfigurées
 ************************************************************/

var batavie = new Board('batavie', false);
batavie.getUrl = 'http://batavie.leguyader.eu/remote.xml';
batavie.postUrl = 'http://batavie.leguyader.eu/index.php/add';
batavie.color = '#ffccaa';
batavie.alias = "llg";
batavie.slip = SLIP_TAGS_RAW;
GlobalBoards['batavie'] = batavie;

var lo = new Board('comptoir', false);
lo.getUrl = 'http://lordoric.free.fr/daBoard/remote.xml';
lo.postUrl = 'http://lordoric.free.fr/daBoard/add.php';
lo.color = '#dedede';
lo.alias = "lo,lordoric";
lo.slip = SLIP_TAGS_RAW; // Protection temporaire
GlobalBoards['comptoir'] = lo;

var dlfp = new Board('dlfp', false);
dlfp.getUrl = 'https://linuxfr.org/board/index.xml';
dlfp.postUrl = 'https://linuxfr.org/board';
dlfp.postData = "board[message]=%m";
dlfp.alias = "linuxfr,beyrouth,passite,dapassite";
dlfp.cookie = 'linuxfr.org_session=';
GlobalBoards['dlfp'] = dlfp;

var devnewton = new Board('devnewton', false);
devnewton.getUrl = 'https://b3.bci.im/legacy/xml';
devnewton.postUrl = 'https://b3.bci.im/legacy/post';
devnewton.color = '#F5D6CC';
GlobalBoards['devnewton'] = devnewton;

var euro = new Board('euromussels', false);
euro.getUrl = 'http://faab.euromussels.eu:80//data/backend.xml';
euro.postUrl = 'http://faab.euromussels.eu:80//add.php';
euro.slip = SLIP_TAGS_RAW;
euro.color = '#d0d0ff';
euro.alias = "euro,euroxers";
GlobalBoards['euromussels'] = euro;

var gabu = new Board('gabuzomeu', false);
gabu.getUrl = 'http://gabuzomeu.fr/tribune.xml';
gabu.postUrl = 'http://gabuzomeu.fr/tribune/post';
gabu.color = '#aaffbb';
gabu.slip = SLIP_TAGS_RAW;
GlobalBoards['gabuzomeu'] = gabu;

var moules = new Board('moules', false);
moules.getUrl = 'https://moules.org/board/backend/xml';
moules.postUrl = 'https://moules.org/board/add.php';
moules.color = '#ffe3c9';
moules.slip = SLIP_TAGS_RAW;
GlobalBoards['moules'] = moules;

var olo = new Board('olo', false);
olo.getUrl = 'http://board.olivierl.org/remote.xml';
olo.postUrl = 'http://board.olivierl.org/add.php';
olo.color = '#80dafc';
olo.alias = "olivierl";
olo.slip = SLIP_TAGS_RAW;
GlobalBoards['olo'] = olo;

var shoop = new Board('sveetch', false);
shoop.getUrl = 'http://sveetch.net/tribune/remote/xml/';
shoop.postUrl = 'http://sveetch.net/tribune/post/xml/';
shoop.postData = "content=%m";
shoop.slip = SLIP_TAGS_RAW;
shoop.alias = "shoop,dax";
shoop.color = '#EDEDDB';
GlobalBoards['sveetch'] = shoop;

var taab = new Board('taab', false);
taab.getUrl = 'https://taab.bci.im/get.php';
taab.postUrl = 'https://taab.bci.im/post.php';
taab.postData = "message=%m";
taab.slip = SLIP_TAGS_RAW;
taab.alias = "taab";
taab.color = '#CCCCCC';
GlobalBoards['taab'] = taab;

