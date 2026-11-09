/* 打字练习：公版文学作品节选与纯统计函数。 */
(function () {
  "use strict";
  const BZX = window.BZX = window.BZX || {};

  const passages = [
    {
      id: "yueyang", language: "zh", title: "岳阳楼记", author: "范仲淹",
      sourceUrl: "https://zh.wikisource.org/wiki/%E5%B2%B3%E9%99%BD%E6%A8%93%E8%A8%98",
      text: "予观夫巴陵胜状，在洞庭一湖。衔远山，吞长江，浩浩汤汤，横无际涯；朝晖夕阴，气象万千；此则岳阳楼之大观也，前人之述备矣。然则北通巫峡，南极潇湘，迁客骚人，多会于此，览物之情，得无异乎？",
    },
    {
      id: "loushi", language: "zh", title: "陋室铭", author: "刘禹锡",
      sourceUrl: "https://zh.wikisource.org/wiki/%E9%99%8B%E5%AE%A4%E9%8A%98",
      text: "山不在高，有仙则名。水不在深，有龙则灵。斯是陋室，惟吾德馨。苔痕上阶绿，草色入帘青。谈笑有鸿儒，往来无白丁。可以调素琴，阅金经。无丝竹之乱耳，无案牍之劳形。南阳诸葛庐，西蜀子云亭。孔子云：何陋之有？",
    },
    {
      id: "peach-blossom", language: "zh", title: "桃花源记", author: "陶渊明",
      sourceUrl: "https://zh.wikisource.org/wiki/%E6%A1%83%E8%8A%B1%E6%BA%90%E8%A8%98",
      text: "晋太元中，武陵人捕鱼为业。缘溪行，忘路之远近。忽逢桃花林，夹岸数百步，中无杂树，芳草鲜美，落英缤纷。渔人甚异之。复前行，欲穷其林。林尽水源，便得一山，山有小口，仿佛若有光。便舍船，从口入，初极狭，才通人。复行数十步，豁然开朗。",
    },
    {
      id: "tengwang", language: "zh", title: "滕王阁序", author: "王勃",
      sourceUrl: "https://zh.wikisource.org/zh-hans/%E6%BB%95%E7%8E%8B%E9%98%81%E5%BA%8F",
      text: "时维九月，序属三秋。潦水尽而寒潭清，烟光凝而暮山紫。俨骖騑于上路，访风景于崇阿。临帝子之长洲，得天人之旧馆。层台耸翠，上出重霄；飞阁流丹，下临无地。鹤汀凫渚，穷岛屿之萦回；桂殿兰宫，即冈峦之体势。披绣闼，俯雕甍。山原旷其盈视，川泽纡其骇瞩。闾阎扑地，钟鸣鼎食之家；舸舰弥津，青雀黄龙之舳。云销雨霁，彩彻区明。落霞与孤鹜齐飞，秋水共长天一色。渔舟唱晚，响穷彭蠡之滨；雁阵惊寒，声断衡阳之浦。",
    },
    {
      id: "changhen", language: "zh", title: "长恨歌", author: "白居易", scope: "全篇",
      sourceUrl: "https://zh.wikisource.org/zh-hans/%E9%95%BF%E6%81%A8%E6%AD%8C",
      text: "汉皇重色思倾国，御宇多年求不得。杨家有女初长成，养在深闺人未识。天生丽质难自弃，一朝选在君王侧。回眸一笑百媚生，六宫粉黛无颜色。春寒赐浴华清池，温泉水滑洗凝脂。侍儿扶起娇无力，始是新承恩泽时。云鬓花颜金步摇，芙蓉帐暖度春宵。春宵苦短日高起，从此君王不早朝。承欢侍宴无闲暇，春从春游夜专夜。后宫佳丽三千人，三千宠爱在一身。金屋妆成娇侍夜，玉楼宴罢醉和春。姊妹弟兄皆列土，可怜光彩生门户。遂令天下父母心，不重生男重生女。骊宫高处入青云，仙乐风飘处处闻。缓歌慢舞凝丝竹，尽日君王看不足。渔阳鼙鼓动地来，惊破霓裳羽衣曲。九重城阙烟尘生，千乘万骑西南行。翠华摇摇行复止，西出都门百余里。六军不发无奈何，宛转蛾眉马前死。花钿委地无人收，翠翘金雀玉搔头。君王掩面救不得，回看血泪相和流。黄埃散漫风萧索，云栈萦纡登剑阁。峨嵋山下少人行，旌旗无光日色薄。蜀江水碧蜀山青，圣主朝朝暮暮情。行宫见月伤心色，夜雨闻铃肠断声。天旋日转回龙驭，到此踌躇不能去。马嵬坡下泥土中，不见玉颜空死处。君臣相顾尽沾衣，东望都门信马归。归来池苑皆依旧，太液芙蓉未央柳。芙蓉如面柳如眉，对此如何不泪垂。春风桃李花开夜，秋雨梧桐叶落时。西宫南苑多秋草，落叶满阶红不扫。梨园弟子白发新，椒房阿监青娥老。夕殿萤飞思悄然，孤灯挑尽未成眠。迟迟钟鼓初长夜，耿耿星河欲曙天。鸳鸯瓦冷霜华重，翡翠衾寒谁与共。悠悠生死别经年，魂魄不曾来入梦。临邛道士鸿都客，能以精诚致魂魄。为感君王辗转思，遂教方士殷勤觅。排空驭气奔如电，升天入地求之遍。上穷碧落下黄泉，两处茫茫皆不见。忽闻海上有仙山，山在虚无缥缈间。楼阁玲珑五云起，其中绰约多仙子。中有一人字太真，雪肤花貌参差是。金阙西厢叩玉扃，转教小玉报双成。闻道汉家天子使，九华帐里梦魂惊。揽衣推枕起徘徊，珠箔银屏迤逦开。云鬓半偏新睡觉，花冠不整下堂来。风吹仙袂飘飘举，犹似霓裳羽衣舞。玉容寂寞泪阑干，梨花一枝春带雨。含情凝睇谢君王，一别音容两渺茫。昭阳殿里恩爱绝，蓬莱宫中日月长。回头下望人寰处，不见长安见尘雾。唯将旧物表深情，钿合金钗寄将去。钗留一股合一扇，钗擘黄金合分钿。但令心似金钿坚，天上人间会相见。临别殷勤重寄词，词中有誓两心知。七月七日长生殿，夜半无人私语时。在天愿作比翼鸟，在地愿为连理枝。天长地久有时尽，此恨绵绵无绝期。",
    },
    {
      id: "pipa", language: "zh", title: "琵琶行", author: "白居易", scope: "全篇·并序",
      sourceUrl: "https://zh.wikisource.org/zh-hans/%E7%90%B5%E7%90%B6%E5%BC%95",
      text: "元和十年，予左迁九江郡司马。明年秋，送客湓浦口，闻舟中夜弹琵琶者，听其音，铮铮然有京都声。问其人，本是长安倡女，尝学琵琶于穆、曹二善才，年长色衰，委身为贾人妇。遂命酒，使快弹数曲，曲罢悯然，自叙少小时欢乐事，今漂沦憔悴，转徙于江湖间。予出官二年，恬然自安。感斯人言，是夕始觉有迁谪意。因为长句，歌以赠之，凡六百一十六言，命曰《琵琶行》。浔阳江头夜送客，枫叶荻花秋瑟瑟。主人下马客在船，举酒欲饮无管弦。醉不成欢惨将别，别时茫茫江浸月。忽闻水上琵琶声，主人忘归客不发。寻声暗问弹者谁，琵琶声停欲语迟。移船相近邀相见，添酒回灯重开宴。千呼万唤始出来，犹抱琵琶半遮面。转轴拨弦三两声，未成曲调先有情。弦弦掩抑声声思，似诉平生不得志。低眉信手续续弹，说尽心中无限事。轻拢慢捻抹复挑，初为霓裳后六幺。大弦嘈嘈如急雨，小弦切切如私语。嘈嘈切切错杂弹，大珠小珠落玉盘。间关莺语花底滑，幽咽泉流冰下难。冰泉冷涩弦凝绝，凝绝不通声暂歇。别有幽愁暗恨生，此时无声胜有声。银瓶乍破水浆迸，铁骑突出刀枪鸣。曲终收拨当心画，四弦一声如裂帛。东船西舫悄无言，唯见江心秋月白。沉吟放拨插弦中，整顿衣裳起敛容。自言本是京城女，家在虾蟆陵下住。十三学得琵琶成，名属教坊第一部。曲罢曾教善才服，妆成每被秋娘妒。五陵年少争缠头，一曲红绡不知数。钿头云篦击节碎，血色罗裙翻酒污。今年欢笑复明年，秋月春风等闲度。弟走从军阿姨死，暮去朝来颜色故。门前冷落鞍马稀，老大嫁作商人妇。商人重利轻别离，前月浮梁买茶去。去来江口守空船，绕船月明江水寒。夜深忽梦少年事，梦啼妆泪红阑干。我闻琵琶已叹息，又闻此语重唧唧。同是天涯沦落人，相逢何必曾相识。我从去年辞帝京，谪居卧病浔阳城。浔阳地僻无音乐，终岁不闻丝竹声。住近湓江地低湿，黄芦苦竹绕宅生。其间旦暮闻何物，杜鹃啼血猿哀鸣。春江花朝秋月夜，往往取酒还独倾。岂无山歌与村笛，呕哑嘲哳难为听。今夜闻君琵琶语，如听仙乐耳暂明。莫辞更坐弹一曲，为君翻作琵琶行。感我此言良久立，却坐促弦弦转急。凄凄不似向前声，满座重闻皆掩泣。座中泣下谁最多，江州司马青衫湿。",
    },
    {
      id: "chibi", language: "zh", title: "赤壁赋", author: "苏轼",
      sourceUrl: "https://zh.wikisource.org/zh-hans/%E8%B5%A4%E5%A3%81%E8%B3%A6",
      text: "壬戌之秋，七月既望，苏子与客泛舟游于赤壁之下。清风徐来，水波不兴。举酒属客，诵明月之诗，歌窈窕之章。少焉，月出于东山之上，徘徊于斗牛之间。白露横江，水光接天。纵一苇之所如，凌万顷之茫然。浩浩乎如冯虚御风，而不知其所止；飘飘乎如遗世独立，羽化而登仙。",
    },
    {
      id: "pride", language: "en", title: "Pride and Prejudice", author: "Jane Austen",
      sourceUrl: "https://www.gutenberg.org/files/1342/1342-h/1342-h.htm",
      text: "It is a truth universally acknowledged, that a single man in possession of a good fortune must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters.",
      translation: "有一条举世公认的真理：一位拥有可观财产的单身男子，一定需要一位妻子。这样一位男子初到一个地方，他的心意或想法即使鲜为人知，这条真理也早已深深扎根于周围人家的心中，以至于大家都把他看作自己某个女儿理所当然的归宿。",
    },
    {
      id: "alice", language: "en", title: "Alice's Adventures in Wonderland", author: "Lewis Carroll",
      sourceUrl: "https://www.gutenberg.org/files/11/11-h/11-h.htm",
      text: "So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.",
      translation: "于是她在心里琢磨着：编一条雏菊花环的乐趣，是否值得她费力起身去采花。她只能尽力想一想，因为天气炎热，让她又困又懒。就在这时，一只长着粉红眼睛的白兔突然从她身边跑过。",
    },
    {
      id: "two-cities", language: "en", title: "A Tale of Two Cities", author: "Charles Dickens",
      sourceUrl: "https://www.gutenberg.org/files/98/98-h/98-h.htm",
      text: "The faintness of the voice was pitiable and dreadful. It was not the faintness of physical weakness, though confinement and hard fare no doubt had their part in it. Its deplorable peculiarity was, that it was the faintness of solitude and disuse. It was like the last feeble echo of a sound made long and long ago.",
      translation: "那微弱的声音令人怜悯，也令人心惊。它的微弱并非出于体力衰竭，尽管囚禁和粗劣的饮食无疑也有影响。它令人悲伤的特别之处在于，这微弱来自孤独和长久不曾说话。它仿佛是很久很久以前发出的声音，最后一丝无力的回响。",
    },
  ];

  // Compare Unicode code points position by position. Accuracy reflects the
  // current text (including corrections), not the user's past keystrokes.
  function getStats(passage, input, elapsedMs) {
    const target = Array.from(passage.text);
    const entered = Array.from(input);
    let correct = 0;
    for (let i = 0; i < entered.length && i < target.length; i++) {
      if (entered[i] === target[i]) correct++;
    }
    const minutes = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs / 60000 : 0;
    const english = passage.language === "en";
    return {
      typed: entered.length,
      total: target.length,
      correct,
      accuracy: entered.length ? Math.round(correct / entered.length * 100) : 100,
      progress: target.length ? Math.min(100, Math.floor(entered.length / target.length * 100)) : 0,
      speed: minutes ? Math.round(correct / (english ? 5 : 1) / minutes) : 0,
      unit: english ? "WPM" : "字符/分",
      complete: target.length > 0 && entered.length >= target.length,
    };
  }

  BZX.TypingEngine = { passages, getStats };
})();
