/* Sougetsu Akira FX - pixel companions.
 * Hand-placed 24x32 pixel sprites in one shared chibi style (same head template, 1px dark outline, 2-3 tone shading,
 * no anti-aliasing), colours sampled from the reference art. Idle animation is built from the sprite itself:
 *   breathe  upper body rises 1px and settles (12-frame loop, ~1.5 s)
 *   sway     hair/cloth tips drift 1px
 *   blink    occasional, 2 frames
 *   gesture  occasional character beat (staff glint, hat tug, finger raise, kunai glint, yawn, thumb to lip)
 * Rendered nearest-neighbour onto a canvas at integer scale. API: AkiraPixel.mount(el, opts) / frame(id, f, o). */
(function (root) {
    'use strict';
    var OUT = '#17121c';

    var C = {
        frieren: {
            name: 'Frieren', waist: 20, eyes: [11, 12],
            pal: { O: OUT, H: '#f4f1f4', h: '#cbc4d2', L: '#ffffff', S: '#fbe6d9', s: '#ebc4b2', E: '#3f9a6c', W: '#ffffff', M: '#c98476',
                C: '#f7f4ee', c: '#d6cdc0', G: '#c9a24a', g: '#9c7a30', K: '#2b2a33', k: '#46444f', B: '#8a5a3a', b: '#5f3d2a', R: '#d63a3a', T: '#8c2f2a' },
            rows: [
                '........................',
                '.........OOOOOO.........',
                '.......OOHHHHHHOO.......',
                '...OO.OHHHLLHHHHHO.OO...',
                '..OHHOHHHHHHHHHHHHOHHO..',
                '..OHhOHHHHHHHHHHHHOhHO..',
                '..OHhOHhHHHHHHHHhHOhHO..',
                '..OhHOhHHhHHHHhHHhOHhO..',
                'OOOhHOhSShSSSShSShOHhOOO',
                'OSSSSOSSSSSSSSSSSSOSSSSO',
                '.OOSSOSOOSSSSSSOOSOSSOO.',
                '..OOHOSEWSSSSSSEWSOHOO..',
                '..OhHOSEESSSSSSEESOHhO..',
                '..OHhOsSSSSSMSSSSsOhHO..',
                '..OhHOOsSSSSSSSSsOOHhO..',
                '..OHhO.OOsSSSSsOO.OhHO..',
                '..OhHOOCCCCKKCCCCOOHhO..',
                '..OHOCCCCCKkkKCCCCCOHO..',
                '..OHOCCCCCKKKKCCCCCOHO..',
                '..OhOGGGGGGGGGGGGGGOhO..',
                '..OOSOCCCKKKKKKCCCOSOO..',
                '...OSOCCCCCCCCCCCCOSO...',
                '....OOCCCCCCCCCCCCOO....',
                '.....OCCCCCCCCCCCCO.....',
                '.....OCCCCCCCCCCCCO.....',
                '.....OGGGGGGGGGGGGO.....',
                '......OKKKKOOKKKKO......',
                '......OkKKKOOKKKkO......',
                '......OBBBBOOBBBBO......',
                '......OBbBBOOBBbBO......',
                '.....OBBBBBOOBBBBBO.....',
                '.....OOOOOOOOOOOOOO.....'
            ],
            staff: true,
            sway: [{ r: [15, 25], c: [2, 5] }, { r: [15, 25], c: [18, 22] }]
        },
        gojo: {
            name: 'Gojo', waist: 22, eyes: null,
            pal: { O: OUT, H: '#f3f1f6', h: '#c4bed0', L: '#ffffff', K: '#0f0d14', k: '#2a2633', S: '#f6e1d3', s: '#e0bda9', M: '#b7786a',
                U: '#1d1a26', u: '#2c2738', P: '#6d48b4', N: '#0b0a0f' },
            rows: [
                '........................',
                '.......O...OO...O.......',
                '......OHO.OHHO.OHO......',
                '.....OHHHOHLHHOHHHO.....',
                '....OHHLHHHHHHHHHLHHO...',
                '...OHHHHHHHHHHHHHHHHO...',
                '..OHhHHHHHHHHHHHHHHhHO..',
                '..OhHHhHHhHHHHhHHhHHhO..',
                '..OHKKKKKKKKKKKKKKKKHO..',
                '..OhKKkKKKKKKKKKKkKKhO..',
                '..OhKKKKKKKKKKKKKKKKhO..',
                '...OSSSSSSSSSSSSSSSSO...',
                '...OSSSSSSSSSSSSSSSSO...',
                '....OsSSSSSMMSSSSSsO....',
                '.....OOsSSSSSSSSsOO.....',
                '.......OOUUUUUUOO.......',
                '......OUUUUUUUUUUO......',
                '.....OUUUUuUUuUUUUO.....',
                '....OUUPUUUUUUUUPUUO....',
                '....OUUPUUuUUuUUPUUO....',
                '....OUUUUUUUUUUUUUUO....',
                '....OuUUUUUUUUUUUUuO....',
                '....OUUUUUUUUUUUUUUO....',
                '.....OUUUUUUUUUUUUO.....',
                '.....OUUUUUOOUUUUUO.....',
                '.....OUUUUUOOUUUUUO.....',
                '.....OUUPUUOOUUPUUO.....',
                '.....OUUUUUOOUUUUUO.....',
                '.....OuUUUUOOUUUUuO.....',
                '.....ONNNNNOONNNNNO.....',
                '....ONNNNNNOONNNNNNO....',
                '....OOOOOOOOOOOOOOOO....'
            ],
            sway: [{ r: [1, 4], c: [5, 19] }]
        },
        luffy: {
            name: 'Luffy', waist: 21, eyes: [10, 11],
            pal: { O: OUT, Y: '#dcbb7c', y: '#b48f58', R: '#c0343f', r: '#8e2430', H: '#1b1a20', S: '#f0c5a4', s: '#d39b78', W: '#ffffff', E: '#1b1a20',
                M: '#7a2a2a', X: '#d98e86', A: '#e8c53a', a: '#c39b1f', J: '#536aab', j: '#3f5190', Q: '#ecebe6', Z: '#8a6a4a' },
            rows: [
                '........................',
                '........OOOOOOOO........',
                '.......OYYYYYYYYO.......',
                '......OYYyYYYYyYYO......',
                '......ORRRRRRRRRRO......',
                '..OOOOOYYYYYYYYYYOOOOO..',
                '.OYYYYYYYYYYYYYYYYYYYYO.',
                '..OOOOHHHHHHHHHHHHOOOO..',
                '....OHHHSHHHHHHSHHHO....',
                '....OHSSSSSSSSSSSSHO....',
                '....OSOOSSSSSSSSOOSO....',
                '....OSWESSSSSSSSWESO....',
                '....OSSSSSSSSSSXSSSO....',
                '....OsSSMMMMMMMMSSsO....',
                '.....OsSSMMMMMMSSsO.....',
                '......OOsSSSSSSsOO......',
                '.....ORRRSSSSSSRRRO.....',
                '....ORRRRSXSSXSRRRRO....',
                '...ORRRRRSSXXSSRRRRRO...',
                '...ORRORRSXSSXSRRORRO...',
                '...OSSORRSSSSSSRROSSO...',
                '...OSSOAAAAAAAAAAOSSO...',
                '....OOOAAAAAAAAaAOO.....',
                '......OJJJJJJJJaAO......',
                '......OJJJJJJJJaaO......',
                '......OJJJJOOJJJaO......',
                '......OJjJJOOJJjJO......',
                '......OQQQQOOQQQQO......',
                '.......OSSOOOOSSO.......',
                '.......OSSO..OSSO.......',
                '......OZZZO..OZZZO......',
                '......OOOOO..OOOOO......'
            ],
            sway: [{ r: [21, 26], c: [15, 18] }]
        },
        itachi: {
            name: 'Itachi', waist: 21, eyes: [11, 12],
            pal: { O: OUT, H: '#1d1f29', h: '#2e3548', L: '#4a557a', P: '#c9cad2', p: '#8f909e', Z: '#5a5b68', B: '#2c4a8a', S: '#f1ded6', s: '#d0bab2', E: '#1a1a1e', W: '#ffffff',
                M: '#b88a80', U: '#414a6b', u: '#2e3548', D: '#e7e7e1', d: '#b7aca8', K: '#5c5a5a', k: '#9a98a0', N: '#262a3a' },
            rows: [
                '........................',
                '.........OOOOOO.........',
                '.......OOHHHHHHOO.......',
                '......OHHHHLLHHHHO......',
                '.....OHHHHHHHHHHHHO.....',
                '....OHHHHHHHHHHHHHHO....',
                '....OBBPPPPPPPPPPBBO....',
                '...OOBPPPPPZZPPPPPBOO...',
                '...OHHPpPPPPPPPPpPHHO...',
                '...OHHhHHHHHHHHHHhHHO...',
                '...OHhSHhSSSSSShHSHhO...',
                '...OHhSOOSSSSSSOOShHO...',
                '...OHhSWESSSSSSWEShHO...',
                '...OHhSSSSSSSSSSSShHO...',
                '...OHhOsSSSSMSSSsOhHO...',
                '....OHHOOsSSSSsOOHHO....',
                '.....OOOUUUUUUUUOOO.....',
                '....OUUUUUUUUUUUUUUO....',
                '...OUUUUUUuUUuUUUUUUO...',
                '...ODDOUUUUUUUUUUODDO...',
                '...ODdOUUUUUUUUUUOdDO...',
                '...ODDOUUUUUUUUUUODDO...',
                '...OSSONNNNNNNNNNOSSO...',
                '..OkKOONNNNNNNNNNOOSSO..',
                '..OKO..ONNNNNNNNO..OO...',
                '..OO...ONNNOONNNO.......',
                '.......ONNNOONNNO.......',
                '.......ODDDOODDDO.......',
                '.......OdDDOODDdO.......',
                '.......OSSSOOSSSO.......',
                '......ONNNNOONNNNO......',
                '......OOOOOOOOOOOO......'
            ],
            sway: [{ r: [8, 15], c: [3, 5] }, { r: [8, 15], c: [18, 20] }]
        },
        nagi: {
            name: 'Nagi', waist: 21, eyes: [11, 12],
            pal: { O: OUT, H: '#ebe8f0', h: '#bdb7c9', L: '#ffffff', S: '#f6e2d6', s: '#dfbdaa', E: '#8c919e', W: '#ffffff', M: '#b07a70',
                U: '#16171e', u: '#262834', A: '#2f7ae0', a: '#6fb0ff', Q: '#f2f2f2', q: '#c8c8d0', N: '#1d4fa8' },
            rows: [
                '........................',
                '........O.OOOO.O........',
                '.......OHOHHHHOHO.......',
                '.....OOHHHHLHHHHHOO.....',
                '....OHHHHHHHHHHHHHHO....',
                '...OHHHHHHHHHHHHHHHHO...',
                '..OHHHhHHHHHHHHHHhHHHO..',
                '..OHhHHhHHHhHHHhHHhHO...',
                '...OHhSHhSSHSSShSShHO...',
                '...OHhSSSSSSSSSSSSShO...',
                '...OhSSSSSSSSSSSSSSHO...',
                '....OSOOOSSSSSSOOOSO....',
                '....OSsEWSSSSSSsEWSO....',
                '....OsSSSSSSSSSSSSsO....',
                '.....OsSSSSMMSSSSsO.....',
                '......OOsSSSSSSsOO......',
                '.......OOUUAAUUOO.......',
                '.....OOUUUUAAUUUUOO.....',
                '....OUUUUUUAAUUUUUUO....',
                '....OUAUUUUAAUUUUAUO....',
                '....OUAUUUUAAUUUUAUO....',
                '....OSOUUUUAAUUUUOSO....',
                '....OSOUUUUUUUUUUOSO....',
                '.....OOUUUUUUUUUUOO.....',
                '......OUUUUOOUUUUO......',
                '......OUUAUOOUAUUO......',
                '......OSSSSOOSSSSO......',
                '......OQQQQOOQQQQO......',
                '......OQqQQOOQQqQO......',
                '......OQQQQOOQQQQO......',
                '.....OANNNNOONNNNAO.....',
                '.....OOOOOOOOOOOOOO.....'
            ],
            sway: [{ r: [1, 4], c: [6, 18] }]
        },
        l: {
            name: 'L', waist: 18, eyes: [10, 11],
            pal: { O: OUT, H: '#121216', h: '#26262e', L: '#3c3c48', S: '#f4e8e2', s: '#dccbc4', V: '#b8a6b6', E: '#0e0e12', W: '#ffffff', M: '#a8858a',
                T: '#f2f2f4', t: '#c9c9d4', J: '#4a69a6', j: '#36508a' },
            rows: [
                '........................',
                '......O.O.OOOO.O.O......',
                '.....OHOHOHHHHOHOHO.....',
                '....OHHHHHHHLHHHHHHO....',
                '...OHHHHHHHHHHHHHHHHO...',
                '..OHHHHHHHHHHHHHHHHHHO..',
                '..OHhHHHhHHHHHhHHHhHHO..',
                '.OHHhHShHhSSShHShHhHHHO.',
                '.OHhHSSSSSSSSSSSSSShHO..',
                '..OHhSOOOSSSSSSOOOShHO..',
                '..OhSSOWEOSSSSOWEOSShO..',
                '..OHSSOEEOSSSSOEEOSSHO..',
                '...OSSVVVSSSSSSVVVSSO...',
                '...OsSSSSSSSSSSSSSSsO...',
                '....OsSSSSSMMSSSSSsO....',
                '.....OOsSSSSSSSSsOO.....',
                '......OOTTTTTTTTOO......',
                '....OOTTTTTTTTTTTTOO....',
                '...OTTTTTTTTTTTTTTTTO...',
                '..OTTTTOOOOTTOOOOTTTTO..',
                '..OTTTOSSSSOOSSSSOTTTO..',
                '..OTTOSSsSSOOSSsSSOTTO..',
                '..OTTOJJJJJOOJJJJJOTTO..',
                '..OTTOJJjJJOOJJjJJOTTO..',
                '..OTTOJJJJJOOJJJJJOTTO..',
                '..OtTOJJJJJOOJJJJJOTtO..',
                '...OOOJJJJJOOJJJJJOOO...',
                '....OJJJJJjOOjJJJJJO....',
                '...OJJJJJJJOOJJJJJJJO...',
                '...OSSSSSSOOOOSSSSSSO...',
                '...OSsSsSSO..OSSsSsSO...',
                '...OOOOOOOO..OOOOOOOO...'
            ],
            sway: [{ r: [1, 3], c: [5, 19] }]
        }
    };
    // Pixel sprites converted from the supplied pixel-art references (background removed, 64px tall, per-sprite palette).
    var BMP = {"itachi":{"name":"Itachi","waist":30,"blink":[[9,11,"L"],[10,11,"L"],[13,11,"L"],[14,11,"L"]],"sway":[],"gesture":{"shift":[[0,5,2,20,0,-1]]},"w":23,"h":64,"pal":{"A":"#fdfefe","B":"#f0f9fb","C":"#eff7fa","D":"#f1f6fb","E":"#eef6f9","F":"#ecf7f9","G":"#ebedf0","H":"#fac5b2","I":"#fcc2af","J":"#caafb0","K":"#9999aa","L":"#c38882","M":"#8a8a9d","N":"#6a606d","O":"#3e4155","P":"#2d324d","Q":"#1c366f","R":"#132f70","S":"#123070","T":"#12306e","U":"#122e6f","V":"#122e6d","W":"#112f6f","X":"#12245a","Y":"#0a0f2d","Z":"#020205"},"rows":[".......B.........F.....",".......FF..PP..JHF.....","......ZJJFPPPPZMHZ.....",".....IIHHPPPPPPPHII....","....IHIKPPPPPPPPPIHI...","....HILPPPPPPPPPPZII...","...ZLILNPPYYYYPPNLLLH..","...BMMZNNPBKKKPNPPMLF..","..ZFMAAPPPKKKKPPPPKFB..","..FBFAPPPZKKKNZPPPMBBZ.","..NBMAPPPHLIILLPPAMBFF.",".ZBFKAAPZZZHHZZYPAAFBB.",".FBBMAAPIHIHHHIYYAAMBF.",".BFBKAAPYIIHHHHYZAABFB.","ZBBFAAAAZIHIHIHYZAAKFBZ","BBFBAAAAZKIHHHZZAAAMBBF","ZFFBMQVVVWQQQQVVYAVKBFB","IHHLLVQUVWQWWUWVVQVLIHH","HHIILUWWVYUUWYYVVULLHHH","HIHILWWVVVUUUUWVUULIIHI",".IHILSWYQYUURSWVWULLHHZ","..MMMVYYWQUSSWUVYUMMMH.","...MVYYYWVXURUUVVYYMM..","...MYYYYUUWRURUQVYYM...","......YURRRSRRQRUYY....","......YRTRRSSSQRSVV....","......VSTSSSSSRTSRZ....","......VRTSSSSQSSVR.....","......VRTTSSRSSSURV....","......VVRSSSSSSSSYX....",".....HYUTTSSSSSSSYU....",".....ZYSTTTSSSSSYWR....",".....VUYYUTSSSSWUUS....",".....KVVVVXUURWUUUZ....","......KKKKKKKKKKKKZ....",".....HKEECEJECEEEEK....",".....ZEEEEEECEEEEEF....",".....DEEEEEJEEEEEEF....","....PZEEEEKNEEEEEEE....","....POFEEEEKKEEEEEE....","....OZNENNNJKKEEEEE....","....OZPPOPPP.KEEEEE....","....PZNNJJKP.KEEEEE....","....PKNDNNKN.KEEEEEK...","....ZKEEEEKK.KKEEEEK...",".....KEEEKK..KKEEEEK...","......LLLLK...KLELL....","......IILL....LLIII....","......IIIL.....IHHL....",".....YHIHZ....ZIIII....",".....RRRXX....XXXTR....",".....HBKK......KKBN....","......NNK......KNFF....","......FDK......KNNY....","......NNK......ZKNF....","......BHZ.......KFN....","......VZX.......XRR....",".....ZRZX......XXZR....",".....ZTRX.......XRT....",".....RRZZ.......XXR....","....ZRRTX......XTRRZ...","...ZHVVXX......ZXRVVLZ.","..ZOHIXX........ZXLHOZ.","...ZVZX...........XZVZ."],"bmp":true},"luffy":{"name":"Luffy","waist":32,"blink":[[12,11,"H"],[16,11,"H"],[17,11,"H"],[11,12,"X"],[12,12,"X"],[13,12,"X"],[16,12,"X"],[17,12,"X"],[18,12,"X"]],"sway":[{"r":[34,52],"c":[19,29]}],"gesture":{"shift":[[0,11,0,29,1,0]]},"w":30,"h":64,"pal":{"A":"#f5f9fb","B":"#f7d137","C":"#ecbb9b","D":"#f6be4b","E":"#feb787","F":"#feb684","G":"#d1b68f","H":"#fdb582","I":"#f5ad75","J":"#be7a2e","K":"#c6785e","L":"#9c897f","M":"#4672bd","N":"#b76c55","O":"#d6262e","P":"#d8252e","Q":"#d8242d","R":"#d2252e","S":"#50476a","T":"#203578","U":"#81112b","V":"#531124","W":"#09031e","X":"#04021e","Y":"#010525","Z":"#01021a"},"rows":["............VDYDXY............","..........ZDDDDDDDZ...........",".........YDDDDDDDDDY..........",".........JDDDDDDDDJDJ.........","........YJJDRRRRRRJDJY........","........JJUDDDDDDDUUJX........","........XDJJJJJJJJJJDX........","......ZDJJJYXKXXXXXJJJD.......",".....ZJJJYXYYHXXNKXXJJJH......",".....DJJJXXNKHHXNYXXXJJJY.....","....XJJJXXXNHHHHHHKXXYJJJ.....","....YJJJXXXEAHHESAEYXJJJJ.....",".....JJJJVEAAAEHAAAKXJJJJ.....","......JJJNEHAEHEAAHNSJJW......",".......ZJVYHEHEEHVEWJJZ.......","..........YHEAAAAEX...........","...........ZEFKEHYZ...........","............YNNNNY............","..........YUKEKNEHXV..........","........YQRKFFEEFFKUQY........","......YRQQREEHFEHEKUQPRY......",".....ZQQQQQQHEHHFHQPQOQP......",".....XRUQQQOKEHEEWPQQOPRZ.....",".....QRUQOOQEKNKIEPQOQRRQ.....",".....OQUQOOQHEIIHEPOOQUQQ.....","....ZOOUUOURNNKIINOOOUUOOS....","....OOOUYOOOKIEEIKOOOYUOOY....","...YPOUAYRRRKEEEFVOOOYUUOO....","...RPOUAUUOOEEHHEEOOUYAUPOY...","...ORUAAUUOOEEEEEEWOUYAUUOQ...","..RPRUAAUUUKEEEEEEWOUUAAUPOY..",".YPRPUAAUROHEEEFEEKORUAAURUQZ.","YRURUUAAUUKEEFEEEEKKVUAAUUPUQ.","YURUUUAUUUYYEFFEHYBYUUUAUURUUY",".YKKYWYUUUBBBBBBBBJBUUUAUXKKY.",".ZENY.UUJJBBBBBBJJJBJWUU.YKHY.",".YEE.YUUJJBBBBBBBJJBBJUUW.HFY.",".EFY..UUYTYMTTTTTTTBBJUU..YFE.","XFFE...YTMMMMMTYMMMBBJY..YEFF.","YFFFH..YMMMMMMMMMMMTBBJ..IFFF.","XHEHEY.YMMMMTTTTTMMMBBJZWEHEH.","ZEHEN..TMMMMMTYTMMMMBBBJYKEEE.",".ZNKY..MMMMMMTYYTTMMBBBJKZYZY.","......YMMMMMMT.ZTMMMBBBBBY....","......ZMMMMMTT..TTMMTBBJBBZ...","......TMMMMMTX..TTMMTBBBBNB...","......MMMMMMTY..YTMMMTBBJB....",".....YMMMMMTT....TMMMTTTJB....",".....GAMMTTTT....TTMMMTGG.....","....YAAAAAAGG....GGAAAAAG.....",".....GGGAAGGG....GGAAAGGG.....","......YNGGGGY....YYGGNNY......","......ZNNN.........XNNHW......","......HHHN..........HHHZ......","......HHHZ..........ZHHC......","......HHF...........YHHZ......","......FFN............FHZ......",".....ZFEZ............NHE......",".....ZFFW............XFHZ.....","....YHHE.............YFHE.....","...XXCHN.............NHCYY....","..YIIEWNY............NNEEIIY..",".ZKVKNKNX............ZYNINVW..",".YLYYXNY..............YXLYLLY."],"bmp":true},"gojo":{"name":"Gojo","waist":30,"blink":null,"sway":[{"r":[0,6],"c":[5,15]}],"gesture":{"shift":[[7,16,0,6,0,-1]]},"w":21,"h":64,"pal":{"A":"#eddffb","B":"#f5c0ac","C":"#b59fca","D":"#705db1","E":"#6b58b5","F":"#6b58a5","G":"#514178","H":"#2f2651","I":"#302550","J":"#2e2554","K":"#2e2550","L":"#2d254e","M":"#2c254e","N":"#2c254a","O":"#2e2452","P":"#2d244f","Q":"#2c244d","R":"#2b234b","S":"#231b3b","T":"#191031","U":"#151027","V":"#150e30","W":"#170d30","X":"#160c30","Y":"#10081f","Z":"#010005"},"rows":[".....................","........CCAA.........",".......AAAAAA........","......CAAAAAAA.......","......CAAAAAAA.......","......AAAAACAC.......","......ACCCCCC........","........CGCUS........","........SSSUUB.......",".F......BBBBB........",".F......BBBBBU.......",".BBBB..UZZBBZJ.......",".BBB....DZDZGZ.......",".BBF...EUTZZJZE......",".BBF.DDEJUDZUXJEED...",".BBFDDELJJPJPJEFDED..","EDBBZEELJPEZPKDDEKZ..",".LJNZKEDPPDZDEPKKKZE.",".FJZKKKEEEEZKKPKKKTE.","RJPZUKKKKEEZKKKKKZWK.","GQKZZPKKKKDZKKKKPZLK.","EPPZXKKKKKPZKKKKPZKK.","EJLUWIKGKKPPKKKPPZKPU","ELPZXHPPJKPPKKPPPZJGQ","EKQT.QPKKRPPKPPPZZQKP",".EU..SPKKKETPPGQZZEQP",".....LPKKKKXPPXPZZTUE",".....LJKKKPPKPGPZZDGQ",".....RSEKKLLPPPQZZEPN",".....RPPJUPQPPPXZZEEJ",".....LLSPPPUPPPDRZTRS",".....ULQPPLUQLLGZEEP.",".....QLLLULULLLPZQQP.",".....LLLPNEEPPPLBFQ..",".....LLKKRLNLLLLZBS..",".....LKEEELULLKKLB...",".....LLKLLLQLLLPTU...",".....ULLKUPUXRZRU....",".....XXWXW..XWXWR....",".....QLMWX..WXDLL....",".....LLMTX..QSMLP....",".....KKDI...LPEP.....",".....KKKK...LLPK.....",".....LKGP...LLLL.....",".....LQDP...LPLQ.....",".....KEG....PPK......",".....QDE....LLM......","....EQDG....LLL......","....EDEJ....LPE......","....GEER....LLE......",".....ERV...JRLE......",".....WVV...RDP.......",".....WWW...KSF.......","......WW...KVT.......","......WV...LMR.......","......VVV..LK........",".......WW..KL........",".......WX..LL........",".......WW..KQ........",".......WV..LKE.......","...........VK........","..........HKU........","...........LE........","...........RE........"],"bmp":true},"frieren":{"name":"Frieren","waist":30,"blink":[[21,8,"J"],[27,7,"J"]],"sway":[{"r":[9,32],"c":[0,15]},{"r":[9,32],"c":[37,49]}],"gesture":{"px":[[45,4,"A"],[46,5,"A"],[44,5,"A"]]},"w":50,"h":64,"pal":{"A":"#fdfef9","B":"#fcfcf6","C":"#fbfcf8","D":"#fdfbfb","E":"#fcfbf7","F":"#f4eef2","G":"#ede5f1","H":"#fce4da","I":"#ebe4ef","J":"#dac7c1","K":"#dab26b","L":"#c8b190","M":"#b4adbd","N":"#b7aab0","O":"#b1abbc","P":"#a59eb4","Q":"#867e92","R":"#98724a","S":"#866249","T":"#715a5a","U":"#56403d","V":"#8b3132","W":"#454654","X":"#2b2c39","Y":"#282d39","Z":"#381024"},"rows":[".............................................KK...","..............................................SKKR",".......................GGGGG................K..KK.","....................IQGGGGGGGQFI..........KVVKS.KS","...................GIPGGIQGFGIGGGM.....K..VVZVK.KK",".................PGIQDIIHHJIGGQQGGGI...K..VVZVK.KR","................PGGPPIGHHHHHQGQPPGGGG..KK.KVVKR.KS","...............GGGPPQGGHHHHXJGHHHPPGGG.KKR..R.SKR.","..............GGGPHHLTGHHHHHHJLH.PPPGGGKRKV..VKKS.",".............GGGPP..HLQHHHHHJZ.....QPGKSRSVVVVS...","............GGGPP.....ZHHHHH.Z......VSRGGPZZ......","...........GGGPP......Z.HHHU......JHZZPGGGV.......","..........GGGPP.........LVBKZLLL.HHHUK.QGVVM......",".........GGIQ........RBOURKECCCBVHHLSK..QVGGI.....","........GGFQ........MCCBKKKCCBBVZLLLKBK..VGGGG....","........GGI......ZQCCEBMKWKBBVVZMSLKKKK.Z..GGG....",".......GGF......DSKKBBMKKMKBVZCBKKKKAKK..Z..GGG...",".......GPQ.....AUQQKKBMKKWKVZKKKRKKCKKOP.Z..QGGP..","......PIQ.....KSSSSOKRMKWVZKKKQKRRKKKMECE.V..PGI..","......GQ.........SMMQQSKVZKKQMQQQOMKOMABT.V...GM..","......GQ........DMAQOQZVZWQWWDQQSSMQEAAEQ.....QGQ.","......G.......RKKKKMMVZZPWQWWYSSSSZEEAAE.......P..","......I......KKKKKKZVZDAMMMMMQ......CAEE.......G..","......I.....KKUKKKVZZCEDMMMMMMM......CB.......QP..","............KUUHHVZ.EAEMMMMMMMMM.............QP...","............KUHHHZZDAEAMMMMEMMMMQ.................",".............ZHHJJ.AEEEMMMEEEMMMM.................",".............ZZJL.DEEEMMOEEEEMMMME................","...........VZ.....CEEMMMEEEEECMMMOY...............","..........VZ.....QEEEMMMEEEEEEMMMME...............","........VZZ.....OEEEMMOEEEEEEEEMOOMM..............",".......VZ......BEEMEMMOEEEEEEEEOMOME..............","......VZ.......EEEMMMOOEEEEEEBEMMMOCD.............","....VZZ.......KKQEOOOOEECMECBBCOOOMMB.............","...KZ.........KKKKMOOOKKKRRKCCCCOOMOKK............",".KKR..........TKKRRROOKKKRRKKKKOOORRKK............","KKR............UKRRRRRKUXRRKKKKKRRRRKK............",".R................URRRRUXXXXKKKRRRRR..............",".....................ZXXXXYXXX.RRR................","......................XXXXXXXX....................","......................WWWWXXXX....................","......................WWWWXXX.....................","......................WWWWXXX.....................","......................WXXXXXX.....................",".....................WWXX.XXXW....................",".....................WWXXZXXXX....................",".....................WWWWUXXXU....................",".....................WWWWUUXUU....................",".....................WWWWUUUUU....................",".....................UWWWUUUU.....................",".....................SSWUZUUU.....................",".....................SSSS.UUU.....................",".....................USSU.UUU.....................","......................SSS.UUU.....................","......................SSS.UU......................","......................SSSUUU......................","......................USUUUU......................","......................USUUUU......................","......................USSUSU......................","......................SSSUU.......................","......................SSSU........................","......................SSSU........................","......................SSRU........................",".......................SS........................."],"bmp":true}};
    for (var bk in BMP) { if (BMP.hasOwnProperty(bk)) { C[bk] = BMP[bk]; } }
    var IDS = ['itachi', 'frieren', 'luffy', 'gojo', 'nagi', 'l'];

    // per-character idle personality: breathing curve (px, 12 frames), drift (px), gesture
    var BREATH = {
        calm: [0, 0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0],
        lively: [0, 0, -1, -1, -1, 0, 0, 0, -1, -1, -1, 0],
        lazy: [0, 0, 0, 0, 0, -1, -1, -1, -1, 0, 0, 0]
    };
    var STYLE = {
        itachi: { breath: 'calm', drift: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], sway: [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0], fps: 7 },
        frieren: { breath: 'calm', drift: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], sway: [0, 0, 0, 1, 1, 1, 0, 0, 0, -1, -1, 0], fps: 7 },
        luffy: { breath: 'lively', drift: [0, 0, 1, 1, 1, 0, 0, 0, -1, -1, -1, 0], sway: [0, 1, 1, 0, 0, -1, -1, 0, 1, 1, 0, 0], fps: 9 },
        gojo: { breath: 'calm', drift: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], sway: [0, 0, 0, 1, 1, 0, 0, 0, -1, -1, 0, 0], fps: 8 },
        nagi: { breath: 'lazy', drift: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], sway: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0], fps: 6 },
        l: { breath: 'calm', drift: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], sway: [0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0], fps: 8 }
    };

    function hex(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    function grid(id) { return C[id].rows.map(function (r) { return r.split(''); }); }
    function shiftRows(g, from, to, dy) {           // move rows [from,to) by dy (-1 = up); the vacated row repeats its neighbour
        if (!dy) { return; }
        var copy = g.map(function (r) { return r.slice(); }), y;
        for (y = from; y < to; y++) { var src = y - dy; if (src >= from && src < to) { g[y] = copy[src].slice(); } else { g[y] = copy[Math.min(to - 1, Math.max(from, y))].slice(); } }
    }
    function shiftRegion(g, r0, r1, c0, c1, dx) {   // drift a silhouette tip sideways by dx
        if (!dx) { return; }
        var y, x;
        for (y = r0; y < r1 && y < g.length; y++) {
            var row = g[y], seg = row.slice(c0, c1 + 1), out = seg.map(function () { return '.'; });
            for (x = 0; x < seg.length; x++) { var nx = x + dx; if (nx >= 0 && nx < seg.length && seg[x] !== '.') { out[nx] = seg[x]; } }
            for (x = 0; x < seg.length; x++) { if (out[x] === '.' && seg[x] !== '.' && (x === 0 || x === seg.length - 1)) { out[x] = seg[x]; } }
            for (x = 0; x < seg.length; x++) { row[c0 + x] = out[x]; }
        }
    }
    function shiftBlock(g, r0, r1, c0, c1, dy) {   // move a rectangle up/down by dy (vacated pixels become transparent)
        var y, x, copy = g.map(function (r) { return r.slice(); });
        for (y = r0; y < r1; y++) { for (x = c0; x <= c1; x++) { if (g[y] && g[y][x] !== undefined) { g[y][x] = '.'; } } }
        for (y = r0; y < r1; y++) { for (x = c0; x <= c1; x++) { var ny = y + dy; if (g[ny] && copy[y] && copy[y][x] && copy[y][x] !== '.') { g[ny][x] = copy[y][x]; } } }
    }
    function put(g, x, y, ch) { if (g[y] && x >= 0 && x < g[y].length) { g[y][x] = ch; } }

    // character beats, p = 0..1 through the gesture
    var GESTURE = {
        frieren: function (g, p) { var on = p > 0.2 && p < 0.8; if (on) { put(g, 1, 9, 'L'); put(g, 0, 8, p < 0.5 ? 'L' : 'O'); } },
        gojo: function (g, p) {
            if (p < 0.15 || p > 0.85) { return; }
            // raises his left hand: two fingers up beside the face
            put(g, 20, 12, 'O'); put(g, 21, 12, 'O'); put(g, 20, 13, 'S'); put(g, 21, 13, 'S'); put(g, 22, 13, 'O');
            put(g, 19, 14, 'O'); put(g, 20, 14, 'S'); put(g, 21, 14, 'S'); put(g, 22, 14, 'O'); put(g, 19, 15, 'O'); put(g, 20, 15, 'U'); put(g, 21, 15, 'O');
            put(g, 20, 11, 'S'); put(g, 21, 11, 'S'); put(g, 20, 10, 'O'); put(g, 21, 10, 'O');
        },
        luffy: function (g, p) { if (p > 0.2 && p < 0.8) { var r = g[4].slice(); shiftRegion(g, 1, 7, 0, 23, 1); g[4] = g[4]; } },
        itachi: function (g, p) { if (p > 0.3 && p < 0.7) { put(g, 2, 23, 'W'); put(g, 3, 22, p < 0.5 ? 'W' : 'k'); } },
        nagi: function (g, p) { if (p > 0.15 && p < 0.85) { put(g, 11, 14, 'O'); put(g, 12, 14, 'O'); put(g, 11, 13, 'M'); put(g, 12, 13, 'M'); put(g, 7, 12, 'O'); put(g, 8, 12, 'O'); put(g, 16, 12, 'O'); put(g, 17, 12, 'O'); } },
        l: function (g, p) {
            if (p < 0.15 || p > 0.85) { return; }
            // thumb to lip
            put(g, 13, 13, 'O'); put(g, 13, 14, 'S'); put(g, 14, 14, 'O'); put(g, 12, 15, 'O'); put(g, 13, 15, 'S'); put(g, 14, 15, 'S'); put(g, 15, 15, 'O');
            put(g, 13, 16, 'S'); put(g, 14, 16, 'S'); put(g, 13, 17, 'T'); put(g, 14, 17, 'T');
        }
    };

    function frame(id, f, o) {
        o = o || {};
        var c = C[id], st = STYLE[id], g = grid(id), i = ((f % 12) + 12) % 12, y, x;
        // blink: the iris row(s) close to a lash line
        if (o.blink && c.eyes) {
            for (y = c.eyes[0]; y <= c.eyes[1]; y++) { for (x = 0; x < 24; x++) { if (g[y][x] === 'E' || g[y][x] === 'W') { g[y][x] = (y === c.eyes[1] ? 'O' : 's'); } } }
            for (x = 0; x < 24; x++) { if (g[c.eyes[0] - 1][x] === 'O' && (g[c.eyes[0]][x] === 's' || g[c.eyes[0]][x] === 'O')) { g[c.eyes[0] - 1][x] = c.pal.s ? 's' : 'S'; } }
        }
        if (o.blink && c.blink) { c.blink.forEach(function (b) { put(g, b[0], b[1], b[2]); }); }
        if (o.gesture !== undefined) {
            if (c.bmp && c.gesture) {
                var on = o.gesture > 0.2 && o.gesture < 0.8;
                if (on) {
                    (c.gesture.shift || []).forEach(function (m) { if (m[4]) { shiftRegion(g, m[0], m[1], m[2], m[3], m[4]); } if (m[5]) { shiftBlock(g, m[0], m[1], m[2], m[3], m[5]); } });
                    if (c.gesture.px && Math.floor(o.gesture * 10) % 2 === 0) { c.gesture.px.forEach(function (q) { put(g, q[0], q[1], q[2]); }); }
                }
            } else if (GESTURE[id]) { GESTURE[id](g, o.gesture); }
        }
        (c.sway || []).forEach(function (s) { shiftRegion(g, s.r[0], s.r[1], s.c[0], s.c[1], st.sway[i]); });
        shiftRows(g, 0, c.waist, BREATH[st.breath][i]);
        if (c.staff) { staff(g, BREATH[st.breath][i]); }
        var dx = st.drift[i], out = [], W = c.w || 24, Hh = c.h || 32;
        for (y = 0; y < Hh; y++) {
            var row = [];
            for (x = 0; x < W; x++) { var ch = g[y][x - dx] || '.'; row.push(ch === '.' ? null : hex(c.pal[ch] || OUT)); }
            out.push(row);
        }
        return out;
    }
    // Frieren's staff, held at her side (drawn after breathing so the hand and staff move together)
    function staff(g, dy) {
        var top = 3 + dy, y;
        for (y = top + 3; y < 31; y++) { if (g[y][22] === '.') { put(g, 22, y, 'T'); } if (g[y][23] === '.') { put(g, 23, y, 'O'); } if (g[y][21] === '.') { put(g, 21, y, 'O'); } }
        put(g, 21, top - 1, 'O'); put(g, 22, top - 1, 'G'); put(g, 23, top - 1, 'O');
        put(g, 21, top, 'G'); put(g, 22, top, 'R'); put(g, 23, top, 'G');
        put(g, 21, top + 1, 'O'); put(g, 22, top + 1, 'G'); put(g, 23, top + 1, 'O');
        put(g, 22, top + 2, 'G');
        put(g, 22, 31, 'G');
    }

    // ---------- canvas widget ----------
    function mount(el, opts) {
        opts = opts || {};
        var cv = document.createElement('canvas'), x = cv.getContext('2d'), id = opts.id || 'itachi', size = opts.size || 64, speed = opts.speed || 1, anim = opts.animate !== false;
        function dims() { var c = C[id]; return [c.w || 24, c.h || 32]; }
        cv.width = dims()[0]; cv.height = dims()[1]; cv.className = 'akpx';
        cv.style.cssText = 'image-rendering:pixelated;image-rendering:crisp-edges;display:block;';
        el.appendChild(cv);
        var img = x.createImageData(cv.width, cv.height), f = 0, t0 = 0, nextBlink = 0, blinkUntil = 0, gStart = -1, nextGesture = 0, raf = 0, last = 0, dead = false;
        function layout() {
            var d = dims();
            if (cv.width !== d[0] || cv.height !== d[1]) { cv.width = d[0]; cv.height = d[1]; img = x.createImageData(d[0], d[1]); }
            cv.style.width = Math.round(d[0] * size / d[1]) + 'px'; cv.style.height = size + 'px';
        }
        function draw(fr) {
            var d = img.data, yy, xx, k = 0;
            for (yy = 0; yy < fr.length; yy++) { for (xx = 0; xx < fr[yy].length; xx++, k += 4) { var c = fr[yy][xx]; if (c) { d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255; } else { d[k + 3] = 0; } } }
            x.putImageData(img, 0, 0);
        }
        function sched(now) { nextBlink = now + 2500 + Math.random() * 3500; }
        function tick(now) {
            raf = 0; if (dead) { return; }
            var st = STYLE[id], step = 1000 / (st.fps * speed);
            if (!t0) { t0 = now; sched(now); nextGesture = now + 6000 + Math.random() * 8000; }
            if (now - last >= step) {
                last = now; f = (f + 1) % 12;
                var o = {};
                if (now > nextBlink) { blinkUntil = now + 160; sched(now); }
                if (now < blinkUntil) { o.blink = 1; }
                if (opts.random !== false && gStart < 0 && now > nextGesture) { gStart = now; }
                if (gStart >= 0) { var p = (now - gStart) / 1600; if (p >= 1) { gStart = -1; nextGesture = now + 8000 + Math.random() * 12000; } else { o.gesture = p; } }
                draw(frame(id, f, o));
            }
            if (anim && !document.hidden) { raf = requestAnimationFrame(tick); } else { setTimeout(function () { if (!raf && !dead) { raf = requestAnimationFrame(tick); } }, 500); }
        }
        layout(); draw(frame(id, 0, {}));
        raf = requestAnimationFrame(tick);
        return {
            canvas: cv,
            set: function (o) { if (o.id && C[o.id] && o.id !== id) { id = o.id; layout(); } if (o.size) { size = o.size; layout(); } if (o.speed) { speed = o.speed; } if (o.animate !== undefined) { anim = o.animate; } if (o.random !== undefined) { opts.random = o.random; } draw(frame(id, f, {})); if (anim && !raf) { raf = requestAnimationFrame(tick); } },
            poke: function () { gStart = performance.now(); },
            destroy: function () { dead = true; if (raf) { cancelAnimationFrame(raf); } if (cv.parentNode) { cv.parentNode.removeChild(cv); } }
        };
    }

    root.AkiraPixel = { ids: IDS, chars: C, frame: frame, mount: mount, dims: function (id) { var c = C[id]; return c ? [c.w || 24, c.h || 32] : [24, 32]; }, name: function (id) { return C[id] ? C[id].name : id; } };
})(window);
