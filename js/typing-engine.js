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
      id: "pride", language: "en", title: "Pride and Prejudice", author: "Jane Austen",
      sourceUrl: "https://www.gutenberg.org/files/1342/1342-h/1342-h.htm",
      text: "It is a truth universally acknowledged, that a single man in possession of a good fortune must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters.",
    },
    {
      id: "alice", language: "en", title: "Alice's Adventures in Wonderland", author: "Lewis Carroll",
      sourceUrl: "https://www.gutenberg.org/files/11/11-h/11-h.htm",
      text: "So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.",
    },
    {
      id: "two-cities", language: "en", title: "A Tale of Two Cities", author: "Charles Dickens",
      sourceUrl: "https://www.gutenberg.org/files/98/98-h/98-h.htm",
      text: "The faintness of the voice was pitiable and dreadful. It was not the faintness of physical weakness, though confinement and hard fare no doubt had their part in it. Its deplorable peculiarity was, that it was the faintness of solitude and disuse. It was like the last feeble echo of a sound made long and long ago.",
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
