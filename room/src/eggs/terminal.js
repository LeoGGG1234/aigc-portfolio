// terminal: a hidden amber CRT for curious visitors ("studio@attic: ~").
//
// Opens with the backtick key (or ~), a click on the PC tower or the desk keyboard, or ctx.eggs.terminal.open(). A small shell
// with history, Tab completion and a few dozen commands that drive the room and the other easter eggs.
//
// Integration notes (for main.js / index.html):
// - Link styles/eggs-terminal.css. The window is appended to <body> (z-index 25) when the module is created.
// - actions.pc opens it (it replaces main's GPU toast for the PC); tips.pc is the hover label. actions.keyboard /
//   tips.keyboard do the same for the desk keyboard's hit box (`hit_keyboard`), which is in frame in the desk view.
// - keys['`'] / keys['~'] open it when focus is not in a text field; '`' closes it again (inside the prompt
//   only while the line is empty). keys.Escape returns true only when it closed the terminal.
//   The module also listens on window (capture) itself, so it still opens if keys are not routed. Every key
//   event it acts on is marked (preventDefault() + e.__terminal = true); keys.* return true for a marked event
//   without acting twice.
// - While open, keystrokes inside the terminal stop propagating at its root, so ui.js shortcuts (t w s l m,
//   arrows, Esc) never see them. Keys typed while focus is elsewhere (e.g. after clicking the canvas) are
//   redirected into the prompt; other modules' text fields keep their keys.
// - Optional sibling APIs, all guarded: music.{tracks(), play(i?), pause()|stop(), skip()|next(), current()};
//   library.{open(i)}; diary.{open(), count()|entries()}; moments.{polaroid(), party()};
//   details.{openMoodboard(), catPets()}. Fallbacks: the built-in lo-fi loop, book notes printed here,
//   site/diary.json (read once), an amber print of the frame, fx.fairyChase + fx.lampColor for a party.
// - Frames for `look` / `photo` come from ctx.captureCanvas({ size, square: false }) at the size the grid needs;
//   without it (or if it fails) from ctx.capture()'s JPEG, decoded into an Image.
// - Reads lights mode from ctx.on('state'); re-renders its labels on ctx.on('lang'). Emits
//   ctx.emit('overlay', 'terminal') when it opens and closes itself (without pulling focus back) when another
//   module emits 'overlay', when another module's dialog ([role=dialog] / [aria-modal=true], or a wrapper of one)
//   gets data-open="true", or when focus moves into such a dialog. Keys whose target or document.activeElement
//   is inside another open dialog are never taken (Esc, Tab traps and typing stay with that dialog).
// - Found while testing (ui.js, not changed here): after the loader is removed, ui.renderStatic() throws on
//   $('loader-name') (null), so H.lang() stops before i18n.apply() / emit('lang') on every switch after entering.
//   Suggested fix in ui.js: `const ln = $('loader-name'); if (ln) ln.textContent = s.name;`. Until then the
//   `lang` command finishes the switch itself (i18n.apply() + emit('lang')) only when H.lang() throws, and the
//   terminal's own labels follow i18n.lang from update() / open() even when 'lang' is never emitted.
// - api: open(), close(), toggle(), isOpen(), run(line, { silent }) -> Promise<boolean>.
import * as THREE from '../three.js';
import { studioZone } from '../content.js';

const HOST = 'studio@attic:~';
const SKIES = ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog', 'live', 'random'];
const TIMES = ['dawn', 'day', 'dusk', 'night'];
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const LIGHTS = ['auto', 'warm', 'cool', 'off'];
const LANGS = ['en', 'zh'];
const FILES = ['readme.txt', 'contact.txt', '.behind-the-plant'];
const CHIPS = ['help', 'works', 'books', 'music', 'studio', 'weather', 'look', 'fortune', 'cat', 'exit'];

const GROUPS = [
  ['studio', ['about', 'contact', 'works', 'open', 'next', 'prev']],
  ['room', ['weather', 'time', 'season', 'lights', 'look', 'photo', 'party']],
  ['music', ['play', 'pause', 'skip', 'music']],
  ['desk', ['books', 'read', 'diary', 'moodboard', 'render', 'coffee', 'cat']],
  ['misc', ['studio', 'fortune', 'whoami', 'date', 'uptime', 'history', 'echo', 'lang', 'sudo', 'clear', 'help', 'exit']],
];
const VISIBLE = GROUPS.flatMap((g) => g[1]);
// {word} = a placeholder word, translated through terminal.a.<word>; command names and values stay English
const ARGHINT = {
  open: '<n>', read: '<n>', play: '[n]', weather: '<{sky}>', time: '<{when}>', season: '<{season}>', lights: '<{mode}>',
  echo: '<{text}>', lang: '<en|zh>', sudo: '<…>', help: '[{cmd}]', cat: '[{file}]',
};
const USAGE = {
  open: 'open <n | {title}>', read: 'read <n | {book}>', play: 'play [n]',
  weather: `weather <${SKIES.join('|')}>`, time: `time <${TIMES.join('|')}>`,
  season: `season <${SEASONS.join('|')}>`, lights: `lights <${LIGHTS.join('|')}>`,
  lang: 'lang <en|zh>', echo: 'echo <{text}>', sudo: 'sudo <{anything}>', help: 'help [{command}]', cat: 'cat [{file}]',
};
const FILL = new Set(['echo', 'sudo']);          // help entries that need words typed after them
const ALIAS = {
  ls: 'works', dir: 'works', '?': 'help', man: 'help', quit: 'exit', logout: 'exit', cls: 'clear',
  neofetch: 'studio', fastfetch: 'studio', hi: 'hello', hey: 'hello', stop: 'pause', ascii: 'look',
  polaroid: 'photo', snap: 'photo', notebook: 'diary', shelf: 'books', library: 'books', previous: 'prev',
  back: 'prev', tracks: 'music', crate: 'music', board: 'moodboard', disco: 'party', fetch: 'studio',
};

const ATTIC = [
  '          .          ',
  "        .' '.        ",
  "      .'  #  '.      ",
  "    .'_________'.    ",
  '     |  .--.   |     ',
  '     |  |##| o |     ',
  '     |__|##|___|     ',
];
const CAT = String.raw`
           z
     /\_/\  z
    ( -.- )
    /  ^  \___
   (_|___|____)~`.slice(1);
const MUG = String.raw`
      ) )
     ( (
    .-----.
    |     |-.
    |     | |
    |     |-'
    '-----'`.slice(1);
const RAMP = ' .,:;-=+*#%@';
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// ------------------------------------------------------------------ strings (original text, en + zh)
const FORTUNES = {
  en: [
    'The first ninety-nine seeds are rehearsal.',
    'A machine can hand you a thousand images. Choosing one is still your job.',
    'Rain on the skylight keeps better time than any timeline.',
    'If the hands look wrong, step back. If they still look wrong, it is the hands.',
    'Save the prompt. You will not remember it at 3 a.m.',
    'Every render is a letter to whoever wakes up here tomorrow.',
    'The best tool in this attic is the delete key.',
    'Noise is only a picture that has not made up its mind.',
    'Coffee number four is where the good ideas hide. Coffee number five is where they leave.',
    'Finish by hand what the machine started by accident.',
    'A slow render is the attic asking you to stretch.',
    "Keep the failed frames. One of them is next year's style.",
    'The cat has rejected 412 compositions and approved none. Keep going.',
    'Light first, story second, resolution last.',
    'When the GPU fan gets loud, the street outside goes quiet.',
    'Lock the seed, change one word, and watch a whole world shift.',
  ],
  zh: [
    '前九十九个种子都是彩排。',
    '机器能递给你一千张图，挑哪一张还是你的事。',
    '雨打天窗，比任何时间线都更会打拍子。',
    '手看着不对就退后一步；还不对，那就真是手的问题。',
    '把提示词存下来。凌晨三点你不会记得的。',
    '每一次渲染，都是写给明天在这里醒来的人的一封信。',
    '这间阁楼里最好用的工具，是删除键。',
    '噪点只是一张还没拿定主意的画。',
    '第四杯咖啡里藏着好点子，第五杯它们就走了。',
    '机器无意中开了头，就用手认真收尾。',
    '渲染慢，是阁楼在提醒你起来伸个懒腰。',
    '失败的帧留着，其中一张会是明年的风格。',
    '猫已经否决了 412 个构图，一个也没通过。继续吧。',
    '先有光，再有故事，最后才是分辨率。',
    '显卡风扇一响，窗外的街就安静了。',
    '锁住种子，只改一个词，看整个世界挪一步。',
  ],
};

const EN = {
  tip: 'Render box  >_',
  'tip.kb': 'Keyboard  >_',
  label: 'Terminal',
  inputLabel: 'Command',
  close: 'Close terminal',
  run: 'Run command',
  placeholder: 'type a command, try help',
  chips: 'Quick commands',
  motd1: 'ATTIC/OS 1.0 · tty1 · amber phosphor, eighty columns of patience',
  'motd2.first': 'first login. mind the low beam.',
  'motd2.back': 'last login: {when}, from the stairs.',
  motd3: 'type {help} and press enter, or just click it.',
  'help.head': 'what this attic understands (click a name to run it):',
  'help.foot': 'tab completes · ↑ ↓ history · ctrl+l clears · esc closes. a few commands are not listed.',
  'g.studio': 'studio', 'g.room': 'room', 'g.music': 'record player', 'g.desk': 'shelf & desk', 'g.misc': 'odds & ends',
  'd.about': 'who works up here',
  'd.contact': 'ways to reach me',
  'd.works': 'list the work (also ls)',
  'd.open': 'put work n on the projector',
  'd.next': 'next work',
  'd.prev': 'previous work',
  'd.weather': 'change the sky',
  'd.time': 'move the sun',
  'd.season': 'turn the year',
  'd.lights': 'auto, warm, cool or off',
  'd.look': 'the room, in characters',
  'd.photo': 'an instant photo of the room',
  'd.party': 'you will see',
  'd.play': 'put a record on',
  'd.pause': 'lift the needle',
  'd.skip': 'next record',
  'd.music': 'flip through the crate',
  'd.books': 'what is on the shelf',
  'd.read': 'take book n down',
  'd.diary': 'the notebook on the desk',
  'd.moodboard': 'pictures pinned above the desk',
  'd.render': 'queue a render',
  'd.coffee': 'brew a cup',
  'd.cat': 'say hello to {cat}',
  'd.studio': 'system information',
  'd.fortune': 'a line to take home',
  'd.whoami': 'you, probably',
  'd.date': 'studio time',
  'd.uptime': 'how long you have been here',
  'd.history': 'what you typed',
  'd.echo': 'say it back',
  'd.lang': 'english or 中文',
  'd.sudo': 'ask very nicely',
  'd.clear': 'wipe the glass',
  'd.help': 'this list',
  'd.exit': 'close the terminal',
  usage: 'usage: {u}',
  'a.title': 'title', 'a.book': 'title', 'a.sky': 'sky', 'a.when': 'when', 'a.season': 'season', 'a.mode': 'mode',
  'a.text': 'text', 'a.anything': 'anything', 'a.cmd': 'cmd', 'a.command': 'command', 'a.file': 'file',
  'type.image': 'image', 'type.video': 'video', 'type.film': 'film', 'type.animation': 'animation', 'type.series': 'series',
  notfound: 'command not found: {cmd}',
  didyoumean: 'did you mean {s}?',
  tryhelp: 'type help to see what this attic understands.',
  badn: 'nothing at {n}. pick 1–{max}.',
  badarg: '{v}? try one of these:',
  none: 'nothing here yet.',
  missing: 'that corner of the attic is not answering right now.',
  oops: 'something in the attic went bump. try again?',
  'works.head': '{n} works · open <n> puts one on the projector',
  'works.hidden': 'hidden:',
  open: 'projecting {i} · {title}',
  next: 'next slide.',
  prev: 'previous slide.',
  panel: 'opening {what}.',
  now: 'now: {v}',
  pickone: 'pick one:',
  'set.weather': 'sky → {v}',
  'set.time': 'sun → {v}',
  'set.season': 'season → {v}',
  'set.lights': 'lamps → {v}',
  surprise: 'rolling dice for the sky…',
  live: 'asking the real sky over {place}…',
  'music.play': 'needle down.',
  'music.playing': 'now playing: {title}',
  'music.pause': 'needle up.',
  'music.skip': 'next record.',
  'music.next': 'up next: {title} · play starts it.',
  'music.only': 'only the studio tape is loaded right now.',
  'music.one': 'only one record in the crate: {title}.',
  'music.head': 'in the crate:',
  'music.hint': 'play <n> puts one on.',
  'music.tape': 'Studio tape',
  'music.tapeBy': 'the attic, live',
  'books.head': '{n} books on the shelf · read <n> takes one down',
  read: 'taking down {title}…',
  diary: 'opening the notebook…',
  'diary.last': 'latest page · {date} · {title}',
  'diary.empty': 'the notebook is still blank.',
  moodboard: 'unpinning the mood board…',
  photo: 'say cheese. (the cat declines.)',
  'photo.fallback': 'the camera is out of film. a phosphor print instead:',
  'photo.alt': 'an amber print of the room',
  party: 'string lights: on. dignity: optional.',
  'party.no': 'the party is already going. listen.',
  'look.head': 'the room, as this screen sees it:',
  'look.fail': 'too dark to make anything out. try lights warm.',
  'render.queued': 'queued 1 job · seed {seed}',
  'render.done': 'saved frame_{n}.png · it is almost what you pictured.',
  'render.note': '(just theatre. the real work lives under works.)',
  'cat.say': '{cat} opens one eye, decides you are fine, and goes back to sleep.',
  'cat.quiet': '(turn the sound on to hear the purr.)',
  'cat.nofile': 'cat: {f}: no such file. (looking for the cat? just type cat.)',
  'cat.default': 'the cat',
  plant: 'the note is not in here. it is behind the real plant by the window. knock three times.',
  'coffee.brew': 'brewing',
  'coffee.done': 'one cup, black, slightly too hot. it joins the others on the desk.',
  whoami: 'guest · visit #{n}',
  whoami2: 'signed in on the studio account. please wipe your feet.',
  'whoami.first': 'first seen {date}.',
  'date.studio': 'in the studio · {tz}',
  'date.you': 'where you are · {tz}',
  'date.here': 'where you are · local time',
  'date.h0': 'the artist should be asleep. the lamp says otherwise.',
  'date.h1': 'early light on the easel. coffee first.',
  'date.h2': 'good light for checking colour.',
  'date.h3': 'around now the render queue gets long.',
  uptime: 'up {t} · 1 visitor · {n} commands · load average {l}',
  'k.os': 'os', 'k.host': 'host', 'k.role': 'role', 'k.place': 'place', 'k.season': 'season', 'k.weather': 'weather',
  'k.time': 'time', 'k.lights': 'lights', 'k.view': 'view', 'k.works': 'works', 'k.books': 'books', 'k.diary': 'diary',
  'k.music': 'records', 'k.cat': 'cat', 'k.uptime': 'uptime', 'k.shell': 'shell',
  'v.pages': '{n} pages', 'v.pets': '{cat} · petted {n}×',
  'view.home': 'room', 'view.work': 'projector', 'view.desk': 'desk', 'view.window': 'window', 'view.shelf': 'shelf', 'view.enter': 'doorway',
  'fortune.by': '— attic proverb',
  sudo: 'permission denied. the only administrator up here is {cat}, and {cat} is asleep.',
  'sudo.empty': 'sudo what? say please.',
  'sudo.please': 'manners noted. still no.',
  'sudo.rm': 'the cat walked across the keyboard before you could finish. crisis averted.',
  'sudo.sandwich': 'the kitchen is downstairs, and nobody has been down there since spring.',
  'lang.now': 'language: {v}',
  'lang.set': 'switched to English.',
  'history.none': 'no history yet.',
  cd: 'there is only one room up here, and you are in it.',
  hello: 'hello. the kettle is on.',
  xyzzy: 'nothing happens. the floorboards creak, politely.',
  bye: 'logout',
};
const ZH = {
  tip: '渲染主机  >_',
  'tip.kb': '键盘  >_',
  label: '终端',
  inputLabel: '命令',
  close: '关闭终端',
  run: '运行命令',
  placeholder: '输入命令，试试 help',
  chips: '常用命令',
  motd1: 'ATTIC/OS 1.0 · tty1 · 琥珀色荧光屏，八十列的耐心',
  'motd2.first': '首次登录。小心头顶的横梁。',
  'motd2.back': '上次登录：{when}，从楼梯口上来。',
  motd3: '输入 {help} 回车，或者直接点它。',
  'help.head': '这间阁楼听得懂的命令（点名字直接运行）：',
  'help.foot': 'tab 补全 · ↑ ↓ 翻历史 · ctrl+l 清屏 · esc 关闭。还有几个命令没写在这里。',
  'g.studio': '工作室', 'g.room': '房间', 'g.music': '唱机', 'g.desk': '书架与书桌', 'g.misc': '零碎',
  'd.about': '谁在这里工作',
  'd.contact': '联系方式',
  'd.works': '作品列表（也可以用 ls）',
  'd.open': '把第 n 件作品放上投影',
  'd.next': '下一件',
  'd.prev': '上一件',
  'd.weather': '换一片天',
  'd.time': '挪动太阳',
  'd.season': '翻一页季节',
  'd.lights': '自动、暖光、冷光或关灯',
  'd.look': '用字符看看房间',
  'd.photo': '给房间拍一张拍立得',
  'd.party': '试试就知道',
  'd.play': '放一张唱片',
  'd.pause': '抬起唱针',
  'd.skip': '换下一张',
  'd.music': '翻翻唱片箱',
  'd.books': '书架上有什么',
  'd.read': '取下第 n 本书',
  'd.diary': '桌上的笔记本',
  'd.moodboard': '书桌上方钉着的图',
  'd.render': '排一个渲染任务',
  'd.coffee': '煮一杯咖啡',
  'd.cat': '和{cat}打个招呼',
  'd.studio': '系统信息',
  'd.fortune': '抽一句话带走',
  'd.whoami': '大概是你',
  'd.date': '工作室时间',
  'd.uptime': '你来了多久',
  'd.history': '你输入过什么',
  'd.echo': '原样说回来',
  'd.lang': 'English 或中文',
  'd.sudo': '请非常客气地问',
  'd.clear': '擦干净屏幕',
  'd.help': '这份列表',
  'd.exit': '关闭终端',
  usage: '用法：{u}',
  'a.title': '标题', 'a.book': '书名', 'a.sky': '天气', 'a.when': '时段', 'a.season': '季节', 'a.mode': '模式',
  'a.text': '文字', 'a.anything': '任何事', 'a.cmd': '命令', 'a.command': '命令', 'a.file': '文件',
  'type.image': '图像', 'type.video': '视频', 'type.film': '短片', 'type.animation': '动画', 'type.series': '系列',
  notfound: '找不到命令：{cmd}',
  didyoumean: '你是想输入 {s} 吗？',
  tryhelp: '输入 help 看看这间阁楼听得懂什么。',
  badn: '第 {n} 个不存在，请选 1–{max}。',
  badarg: '{v}？试试这些：',
  none: '这里还空着。',
  missing: '阁楼的这一角暂时没有回应。',
  oops: '阁楼里有什么东西撞了一下，再试一次？',
  'works.head': '共 {n} 件作品 · open <n> 把一件放上投影',
  'works.hidden': '隐藏文件：',
  open: '正在投影 {i} · {title}',
  next: '下一张。',
  prev: '上一张。',
  panel: '打开{what}。',
  now: '现在：{v}',
  pickone: '选一个：',
  'set.weather': '天空 → {v}',
  'set.time': '太阳 → {v}',
  'set.season': '季节 → {v}',
  'set.lights': '灯 → {v}',
  surprise: '给天空掷个骰子……',
  live: '正在问{place}真实的天空……',
  'music.play': '唱针落下。',
  'music.playing': '正在播放：{title}',
  'music.pause': '唱针抬起。',
  'music.skip': '换下一张。',
  'music.next': '下一张：{title} · 输入 play 开始播放。',
  'music.only': '现在只装了工作室磁带。',
  'music.one': '唱片箱里只有一张：{title}。',
  'music.head': '唱片箱里有：',
  'music.hint': 'play <n> 放上一张。',
  'music.tape': '工作室磁带',
  'music.tapeBy': '阁楼现场',
  'books.head': '书架上有 {n} 本 · read <n> 取下一本',
  read: '取下《{title}》……',
  diary: '翻开笔记本……',
  'diary.last': '最新一页 · {date} · {title}',
  'diary.empty': '笔记本还是空白的。',
  moodboard: '取下情绪板上的图……',
  photo: '笑一个。（猫拒绝了。）',
  'photo.fallback': '相机没胶卷了，给你一张荧光屏冲印：',
  'photo.alt': '房间的琥珀色冲印',
  party: '串灯：开。矜持：随意。',
  'party.no': '派对已经开始了，听。',
  'look.head': '这块屏幕眼里的房间：',
  'look.fail': '太暗了，什么也看不清。试试 lights warm。',
  'render.queued': '已排队 1 个任务 · 种子 {seed}',
  'render.done': '已保存 frame_{n}.png · 差不多就是你想象的样子。',
  'render.note': '（只是演示。真正的作品在 works 里。）',
  'cat.say': '{cat}睁开一只眼，觉得你还行，又睡了。',
  'cat.quiet': '（打开声音可以听到呼噜。）',
  'cat.nofile': 'cat：没有 {f} 这个文件。（想找猫的话，直接输入 cat。）',
  'cat.default': '猫',
  plant: '纸条不在这里，在窗边那盆真的植物后面。敲三下。',
  'coffee.brew': '冲煮中',
  'coffee.done': '一杯黑咖啡，有点烫。和桌上另外几杯放在一起。',
  whoami: '访客 · 第 {n} 次来访',
  whoami2: '用的是工作室账号。进门请擦脚。',
  'whoami.first': '初次来访：{date}。',
  'date.studio': '工作室 · {tz}',
  'date.you': '你那边 · {tz}',
  'date.here': '你那边 · 本地时间',
  'date.h0': '按理说该睡了，台灯却还亮着。',
  'date.h1': '晨光落在画架上，先喝咖啡。',
  'date.h2': '光线正好，适合校色。',
  'date.h3': '这个点，渲染队列开始排长了。',
  uptime: '已运行 {t} · 1 位访客 · {n} 条命令 · 平均负载 {l}',
  'k.os': '系统', 'k.host': '主人', 'k.role': '身份', 'k.place': '地点', 'k.season': '季节', 'k.weather': '天气',
  'k.time': '时间', 'k.lights': '灯光', 'k.view': '视角', 'k.works': '作品', 'k.books': '藏书', 'k.diary': '日记',
  'k.music': '唱片', 'k.cat': '猫', 'k.uptime': '运行', 'k.shell': '外壳',
  'v.pages': '{n} 页', 'v.pets': '{cat} · 被摸了 {n} 次',
  'view.home': '房间', 'view.work': '投影', 'view.desk': '书桌', 'view.window': '窗边', 'view.shelf': '书架', 'view.enter': '门口',
  'fortune.by': '—— 阁楼格言',
  sudo: '权限不足。这里唯一的管理员是{cat}，而{cat}正在睡觉。',
  'sudo.empty': 'sudo 什么？先说“请”。',
  'sudo.please': '礼貌已收到。还是不行。',
  'sudo.rm': '你还没打完，猫就踩过了键盘。危机解除。',
  'sudo.sandwich': '厨房在楼下，从春天起就没人下去过了。',
  'lang.now': '语言：{v}',
  'lang.set': '已切换到中文。',
  'history.none': '还没有历史记录。',
  cd: '这上面只有一个房间，你已经在里面了。',
  hello: '你好。水壶已经烧上了。',
  xyzzy: '什么也没发生。地板礼貌地嘎吱了一声。',
  bye: '已登出',
};
const prefixed = (dict, fortunes) => {
  const o = {};
  for (const [k, v] of Object.entries(dict)) o[`terminal.${k}`] = v;
  fortunes.forEach((f, i) => { o[`terminal.f.${i}`] = f; });
  return o;
};
const STRINGS = { en: prefixed(EN, FORTUNES.en), zh: prefixed(ZH, FORTUNES.zh) };

// ------------------------------------------------------------------ helpers without ctx
const pad2 = (n) => String(n).padStart(2, '0');
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const isoDay = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fmtDur = (s) => `${Math.floor(s / 3600)}:${pad2(Math.floor((s % 3600) / 60))}:${pad2(Math.floor(s % 60))}`;
function lev(a, b) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
function commonPrefix(list) {
  let p = list[0] || '';
  for (const s of list) while (p && !s.toLowerCase().startsWith(p.toLowerCase())) p = p.slice(0, -1);
  return p;
}
function safeHref(u) {
  try {
    const x = new URL(String(u || ''), location.href);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(x.protocol) ? x.href : '';
  } catch { return ''; }
}
const isTextField = (n) => !!(n && n.closest && n.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'));
const DIALOG = '[role="dialog"], [aria-modal="true"]';
const ROOM_LAYERS = '#panel, #atmo, #sheet, .dial';   // main's overlays: plain sections, no role, no 'overlay' event

export function create(ctx = {}) {
  const doc = typeof document !== 'undefined' ? document : null;
  const W = typeof window !== 'undefined' ? window : null;
  const still = !!ctx.still;
  const i18n = ctx.i18n;
  const C = () => ctx.content || {};
  const lang = () => (i18n && i18n.lang) || 'en';
  const warn = (e) => { try { console.warn('[terminal]', e); } catch { /* no console */ } };
  const safe = (fn, fb) => { try { return fn(); } catch (e) { warn(e); return fb; } };
  const T = (k, v) => { try { return i18n ? i18n.t(k, v) : k; } catch { return k; } };
  const t = (k, v) => T(`terminal.${k}`, v);
  const pick = (v) => {
    try { if (i18n) return String(i18n.pick(v) ?? ''); } catch { /* fall through */ }
    return typeof v === 'string' ? v : (v && (v.en || v.zh)) || '';
  };
  const store = {
    get: (k) => { try { return ctx.store?.get?.(k) ?? null; } catch { return null; } },
    set: (k, v) => { try { ctx.store?.set?.(k, v); } catch { /* private mode */ } },
  };
  const mq = (q) => { try { return !!W?.matchMedia?.(q).matches; } catch { return false; } };
  const narrow = () => mq('(max-width: 720px)');
  const touchy = () => narrow() || mq('(pointer: coarse)');
  const wait = (ms) => new Promise((r) => setTimeout(r, still ? 0 : ms));

  try { i18n?.extend?.(STRINGS); } catch (e) { warn(e); }

  // ---------------------------------------------------------------- state
  const state = { lights: 'auto' };
  let view = 'home';
  let isOpen = false;
  let booted = false;
  let jobId = 0;
  let commands = 0;
  const stamps = [];
  let lastFortune = -1;
  let frameNo = 1205;
  let lofiOn = false;
  let partyT = 0, partyClock = 0, partyColor = null;
  let diaryCache = null;

  // ctx.store may hand back JSON values or plain strings: accept both
  const visits = (parseInt(store.get('terminal.visits'), 10) || 0) + 1;
  store.set('terminal.visits', visits);
  let firstSeen = store.get('terminal.first');
  if (typeof firstSeen !== 'string' || !firstSeen) { firstSeen = isoDay(new Date()); store.set('terminal.first', firstSeen); }
  const lastLogin = typeof store.get('terminal.last') === 'string' ? store.get('terminal.last') : null;
  let hist = [];
  try {
    let h = store.get('terminal.history');
    if (typeof h === 'string') h = JSON.parse(h);
    if (Array.isArray(h)) hist = h.filter((x) => typeof x === 'string').slice(-60);
  } catch { hist = []; }
  let hIdx = hist.length, draft = '';
  let entered = null;            // null until the first frame says otherwise

  try { ctx.on?.('state', (s) => { if (s && typeof s === 'object') Object.assign(state, s); }); } catch (e) { warn(e); }
  try { ctx.on?.('view', (v) => { if (typeof v === 'string') view = v; else if (v?.view) view = v.view; }); } catch (e) { warn(e); }
  try { ctx.on?.('lang', () => renderStatic()); } catch (e) { warn(e); }
  // one overlay at a time: another module's panel opening closes the terminal
  try {
    ctx.on?.('overlay', (d) => {
      const name = typeof d === 'string' ? d : d?.name;
      if (name && name !== 'terminal') close({ restore: false });
    });
  } catch (e) { warn(e); }

  // ---------------------------------------------------------------- DOM
  let root = null, win = null, bar = null, scrollEl = null, out = null, input = null, closeBtn = null, runBtn = null, chipsEl = null;
  let mB = null, mSel = null, mCur = null, mA = null;
  let lastFocus = null, hideT = 0, peekT = 0, typingT = 0, nudgeT = 0, stick = true, lastTick = 0;
  let shownLang = null;          // language the window's labels were last rendered in
  const queue = [];
  let drainT = 0;
  const off = { x: 0, y: 0 };
  let drag = null;

  const el = (tag, cls, text) => {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const icon = (id) => {
    const NS = 'http://www.w3.org/2000/svg';
    const s = doc.createElementNS(NS, 'svg');
    s.setAttribute('class', 'ic');
    s.setAttribute('aria-hidden', 'true');
    const u = doc.createElementNS(NS, 'use');
    u.setAttribute('href', `#${id}`);
    s.append(u);
    return s;
  };

  function addSymbol() {
    const defs = doc.querySelector('svg defs');
    if (!defs || doc.getElementById('i-term-enter')) return;
    const NS = 'http://www.w3.org/2000/svg';
    const sym = doc.createElementNS(NS, 'symbol');
    sym.setAttribute('id', 'i-term-enter');
    sym.setAttribute('viewBox', '0 0 24 24');
    const p = doc.createElementNS(NS, 'path');
    p.setAttribute('d', 'M19 5.5v6a3.5 3.5 0 0 1-3.5 3.5H5.5M9.5 11l-4 4 4 4');
    sym.append(p);
    defs.append(sym);
  }

  function build() {
    if (!doc || root) return;
    safe(addSymbol);
    root = el('div', 'term');
    root.hidden = true;
    root.dataset.state = 'closed';
    win = el('section', 'term-win surface');
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-modal', 'false');
    win.tabIndex = -1;

    bar = el('header', 'term-bar');
    const led = el('i', 'term-led');
    led.setAttribute('aria-hidden', 'true');
    const title = el('span', 'term-title', 'studio@attic: ~');
    closeBtn = el('button', 'term-close');
    closeBtn.type = 'button';
    closeBtn.append(icon('i-close'));
    bar.append(led, title, closeBtn);

    const screen = el('div', 'term-screen');
    scrollEl = el('div', 'term-scroll');
    out = el('div', 'term-out');
    out.setAttribute('role', 'log');
    out.setAttribute('aria-live', 'polite');
    const promptEl = el('div', 'term-prompt');
    chipsEl = el('div', 'term-chips');
    chipsEl.setAttribute('role', 'group');
    for (const c of CHIPS) {
      const b = el('button', 't-chip', c);
      b.type = 'button';
      b.addEventListener('click', (e) => { e.stopPropagation(); void exec(c); });
      chipsEl.append(b);
    }
    const row = el('div', 'term-row');
    const line = el('label', 'term-line');
    const ps1 = el('span', 'term-ps1');
    ps1.append(el('span', 'term-host', HOST), '$ ');
    const mirror = el('span', 'term-mirror');
    mirror.setAttribute('aria-hidden', 'true');
    mB = el('span'); mSel = el('span', 'term-sel'); mCur = el('span', 'term-cur', ' '); mA = el('span');
    mirror.append(mB, mSel, mCur, mA);
    input = el('input', 'term-input');
    input.type = 'text';
    input.maxLength = 240;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('enterkeyhint', 'send');
    line.append(ps1, mirror, input);
    runBtn = el('button', 'term-run');
    runBtn.type = 'button';
    runBtn.append(icon('i-term-enter'));
    row.append(line, runBtn);
    promptEl.append(chipsEl, row);
    scrollEl.append(out, promptEl);
    const roll = el('i', 'term-roll');
    roll.setAttribute('aria-hidden', 'true');
    screen.append(scrollEl, roll);
    win.append(bar, screen);
    root.append(win);
    doc.body.append(root);

    // events
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); close(); });
    runBtn.addEventListener('click', (e) => { e.stopPropagation(); submit(); });
    input.addEventListener('keydown', onKey);
    input.addEventListener('input', () => { syncMirror(); unpeek(); });
    input.addEventListener('focus', () => { root.classList.add('focused'); syncMirror(); });
    input.addEventListener('blur', () => root.classList.remove('focused'));
    input.addEventListener('select', syncMirror);
    doc.addEventListener('selectionchange', () => { if (isOpen && doc.activeElement === input) syncMirror(); });
    // nothing typed in here reaches the room's shortcuts
    win.addEventListener('keydown', (e) => e.stopPropagation());
    win.addEventListener('pointerdown', () => unpeek());
    scrollEl.addEventListener('scroll', () => { stick = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 48; }, { passive: true });
    scrollEl.addEventListener('click', (e) => {
      if (e.target.closest?.('button, a, input')) return;
      if (String(W?.getSelection?.() || '')) return;      // let people copy output
      focusInput();
    });
    wireDrag();
    W?.visualViewport?.addEventListener?.('resize', () => { if (isOpen) fitViewport(); });
    W?.visualViewport?.addEventListener?.('scroll', () => { if (isOpen) fitViewport(); });
    W?.addEventListener?.('resize', () => { if (isOpen) { fitViewport(); clampOff(); } });
    renderStatic();
    syncMirror();
  }

  function renderStatic() {
    if (!root) return;
    shownLang = lang();
    safe(() => {
      win.setAttribute('aria-label', t('label'));
      closeBtn.setAttribute('aria-label', t('close'));
      runBtn.setAttribute('aria-label', t('run'));
      input.setAttribute('aria-label', t('inputLabel'));
      input.placeholder = t('placeholder');
      chipsEl.setAttribute('aria-label', t('chips'));
    });
  }

  // ---------------------------------------------------------------- dragging the window by its title bar
  function wireDrag() {
    bar.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest?.('button') || narrow()) return;
      drag = { x: e.clientX - off.x, y: e.clientY - off.y, id: e.pointerId };
      safe(() => bar.setPointerCapture(e.pointerId));
      win.classList.add('dragging');
      e.preventDefault();
    });
    bar.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      off.x = e.clientX - drag.x;
      off.y = e.clientY - drag.y;
      clampOff();
    });
    const end = () => {
      if (!drag) return;
      drag = null;
      win.classList.remove('dragging');
      focusInput();
    };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
    bar.addEventListener('dblclick', (e) => {
      if (e.target.closest?.('button')) return;
      off.x = 0; off.y = 0;
      clampOff();
    });
  }
  function clampOff() {
    if (!win) return;
    if (narrow()) { off.x = 0; off.y = 0; }
    const w = win.offsetWidth || 0, h = win.offsetHeight || 0;
    const mx = Math.max(0, (innerWidth - w) / 2 - 8), my = Math.max(0, (innerHeight - h) / 2 - 8);
    off.x = clamp(off.x, -mx, mx);
    off.y = clamp(off.y, -my, my);
    win.style.setProperty('--tx', `${Math.round(off.x)}px`);
    win.style.setProperty('--ty', `${Math.round(off.y)}px`);
  }

  // phones: keep the sheet above the on-screen keyboard
  function fitViewport() {
    if (!root) return;
    const vv = W?.visualViewport;
    if (!vv) return;
    const kb = Math.max(0, innerHeight - vv.height - vv.offsetTop);
    root.style.setProperty('--term-kb', `${kb > 60 ? Math.round(kb) : 0}px`);
    root.style.setProperty('--term-vh', `${Math.round(vv.height)}px`);
  }

  // ---------------------------------------------------------------- open / close
  function focusInput(force = false) {
    if (!isOpen || !input) return;
    try {
      if (force || !touchy()) input.focus({ preventScroll: true });
      else if (doc.activeElement !== input) win.focus({ preventScroll: true });   // no surprise keyboard on phones
    } catch { /* ignore */ }
  }

  // viaKey: opened from the keyboard, so the prompt takes focus even on touch screens (a tablet with a
  // hardware keyboard); a tap on the PC tower keeps focus on the window so no on-screen keyboard pops up
  function open({ viaKey = false } = {}) {
    if (!root) safe(build);
    if (!root) return false;
    if (isOpen) { focusInput(viaKey); return true; }
    isOpen = true;
    clearTimeout(hideT);
    lastFocus = doc.activeElement;
    root.hidden = false;
    root.dataset.state = 'closed';
    void root.offsetWidth;                // restart the power-on animation
    root.dataset.state = 'open';
    root.classList.toggle('still', still);
    fitViewport();
    clampOff();
    if (!booted) motd();
    stick = true;
    scrollEl.scrollTop = scrollEl.scrollHeight;
    if (shownLang !== lang()) renderStatic();
    syncMirror();
    focusInput(viaKey);
    store.set('terminal.last', new Date().toISOString());
    try { ctx.emit?.('overlay', 'terminal'); } catch { /* no bus */ }
    blip(68, 0.12, 0.24, 'sine', 0, 36);
    blip(2400, 0.004, 0.2, 'sine', 0.03);
    return true;
  }

  // restore: false when another overlay is taking over (it moves focus itself; do not pull it back)
  function close({ restore = true } = {}) {
    if (!isOpen || !root) return false;
    isOpen = false;
    unpeek();
    flush();
    drag = null;
    win.classList.remove('dragging');
    root.dataset.state = 'closing';
    clearTimeout(hideT);
    hideT = setTimeout(() => { if (!isOpen) { root.hidden = true; root.dataset.state = 'closed'; } }, still ? 0 : 280);
    const back = lastFocus;
    lastFocus = null;
    try {
      if (root.contains(doc.activeElement)) doc.activeElement.blur();
      if (restore && back && back !== doc.body && back.isConnected && !root.contains(back)) back.focus({ preventScroll: true });
    } catch { /* ignore */ }
    blip(300, 0.03, 0.16, 'sine', 0, 60);
    return true;
  }

  // the window steps back for a moment so the visitor sees the room change
  function peek(ms = 1800) {
    if (still || !isOpen || !root) return;
    root.classList.add('peek');
    clearTimeout(peekT);
    peekT = setTimeout(unpeek, ms);
  }
  function unpeek() {
    clearTimeout(peekT);
    root?.classList.remove('peek');
  }
  // commands that move the camera: on phones the terminal gets out of the way, on desktop it fades a while
  function stepAside() {
    if (narrow()) setTimeout(() => close(), still ? 0 : 520);
    else peek(2600);
  }
  // hand the visitor to another module's overlay: close first (focus returns), then let it take focus
  function handoff(fn, ms = 380) {
    setTimeout(() => { close(); safe(fn); }, still ? 0 : ms);
  }

  // ---------------------------------------------------------------- prompt
  function syncMirror() {
    if (!input || !mB) return;
    const v = input.value;
    let s = input.selectionStart ?? v.length, e = input.selectionEnd ?? s;
    if (s > e) [s, e] = [e, s];
    let cw = 1;
    const code = v.charCodeAt(e);
    if (code >= 0xd800 && code <= 0xdbff) cw = 2;
    mB.textContent = v.slice(0, s);
    mSel.textContent = v.slice(s, e);
    mCur.textContent = v.slice(e, e + cw) || ' ';
    mA.textContent = v.slice(e + cw);
    if (stick && scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
  }
  function setInput(v) {
    if (!input) return;
    input.value = v;
    try { input.setSelectionRange(v.length, v.length); } catch { /* ignore */ }
    syncMirror();
  }
  function holdBlink() {
    root?.classList.add('typing');
    clearTimeout(typingT);
    typingT = setTimeout(() => root?.classList.remove('typing'), 520);
  }
  function nudge() {
    root?.classList.add('nudge');
    clearTimeout(nudgeT);
    nudgeT = setTimeout(() => root?.classList.remove('nudge'), 180);
  }

  function onKey(e) {
    unpeek();
    if (e.isComposing || e.keyCode === 229) return;          // IME at work
    const k = e.key;
    const ctrl = e.ctrlKey && !e.metaKey && !e.altKey;
    if (k === 'Enter') { e.preventDefault(); blip(820, 0.01, 0.05, 'triangle'); submit(); return; }
    if (k === 'Escape') { e.preventDefault(); e.__terminal = true; close(); return; }
    if (k === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); complete(); return; }
    if (k === 'ArrowUp') { e.preventDefault(); histStep(-1); return; }
    if (k === 'ArrowDown') { e.preventDefault(); histStep(1); return; }
    if (ctrl && (k === 'l' || k === 'L')) { e.preventDefault(); clearScreen(); return; }
    if (ctrl && (k === 'c' || k === 'C') && input.selectionStart === input.selectionEnd) { e.preventDefault(); cancel(); return; }
    if (ctrl && (k === 'u' || k === 'U')) { e.preventDefault(); setInput(''); return; }
    if (k === '`' && !input.value && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); e.__terminal = true; close(); return; }
    if (k.length === 1 && !e.ctrlKey && !e.metaKey) tick();
    holdBlink();
    setTimeout(syncMirror, 0);                                // caret moves (← → Home End) land after the default action
  }

  function histStep(d) {
    if (!hist.length) { nudge(); return; }
    if (hIdx === hist.length) draft = input.value;
    const n = clamp(hIdx + d, 0, hist.length);
    if (n === hIdx) { nudge(); return; }
    hIdx = n;
    setInput(hIdx === hist.length ? draft : hist[hIdx]);
  }
  function pushHist(s) {
    if (hist[hist.length - 1] !== s) hist.push(s);
    if (hist.length > 60) hist = hist.slice(-60);
    hIdx = hist.length;
    draft = '';
    store.set('terminal.history', hist);
  }

  function submit() {
    if (!input) return;
    const v = input.value;
    setInput('');
    stick = true;
    void exec(v);
    focusInput();
  }

  function cancel() {
    jobId++;
    queue.length = 0;
    clearTimeout(drainT); drainT = 0;
    echoLine(`${input.value}^C`);
    setInput('');
  }

  // ---------------------------------------------------------------- tab completion
  function argPool(cmd, n) {
    if (n !== 1 && cmd !== 'echo') return null;
    const c = cmd === 'ls' ? 'ls' : (ALIAS[cmd] || cmd);
    const count = (k) => Array.from({ length: k }, (_, i) => String(i + 1));
    switch (c) {
      case 'open': return count(works().length).concat(['about', 'contact', 'list']);
      case 'read': return count(books().length);
      case 'play': return count(tracks().length);
      case 'weather': return SKIES;
      case 'time': return TIMES;
      case 'season': return SEASONS;
      case 'lights': return LIGHTS;
      case 'lang': return LANGS;
      case 'help': return VISIBLE;
      case 'sudo': return VISIBLE;
      case 'cat': return FILES;
      case 'ls': return ['-a'];
      default: return null;
    }
  }
  function complete() {
    const v = input.value;
    if ((input.selectionEnd ?? v.length) !== v.length) return;
    const body = v.replace(/^\s+/, '');
    const parts = body.split(/\s+/);
    const cur = parts[parts.length - 1] || '';
    const pool = parts.length <= 1 ? VISIBLE.concat(['ls']) : argPool(parts[0].toLowerCase(), parts.length - 1);
    if (!pool || !pool.length) { nudge(); return; }
    const low = cur.toLowerCase();
    const hits = [...new Set(pool.filter((c) => c.toLowerCase().startsWith(low)))];
    if (!hits.length) { nudge(); return; }
    const head = v.slice(0, v.length - cur.length);
    if (hits.length === 1) { setInput(`${head}${hits[0]} `); return; }
    const common = commonPrefix(hits);
    if (common.length > cur.length) { setInput(head + common); return; }
    flush();
    appendNow(el('div', 'ln dim', hits.join('   ')));
  }

  // ---------------------------------------------------------------- output
  function emit(node, anim = 'type') {
    if (!out || !node) return node;
    if (still || !isOpen) { appendNow(node); return node; }
    node.__anim = anim;
    queue.push(node);
    if (!drainT) drainT = setTimeout(drain, 0);
    return node;
  }
  function drain() {
    drainT = 0;
    const node = queue.shift();
    if (!node) return;
    appendNow(node, node.__anim);
    if (queue.length) drainT = setTimeout(drain, queue.length > 24 ? 5 : 22);
  }
  function appendNow(node, anim) {
    if (!out) return;
    out.append(node);
    if (anim && !still) {
      // measured after insertion; the class lands before the next paint, so nothing flashes
      const scan = anim === 'scan';
      const len = scan ? Math.round((node.offsetHeight || 20) / 12) : node.textContent.length;
      const n = clamp(len, 1, scan ? 40 : 36);
      node.style.setProperty('--n', String(n));
      node.style.setProperty('--d', `${scan ? Math.min(420, 140 + n * 7) : Math.min(220, 40 + n * 5)}ms`);
      node.classList.add(scan ? 'in-scan' : 'in');
      node.addEventListener('animationend', (e) => { if (e.target === node) node.classList.remove('in', 'in-scan'); });
    }
    while (out.childElementCount > 500) out.firstElementChild.remove();
    if (stick && scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
  }
  function flush() {
    clearTimeout(drainT);
    drainT = 0;
    while (queue.length) appendNow(queue.shift());
  }
  function clearScreen() {
    queue.length = 0;
    clearTimeout(drainT); drainT = 0;
    out?.replaceChildren();
  }
  const say = (text, cls = '') => emit(el('div', `ln${cls ? ` ${cls}` : ''}`, String(text ?? '')));
  const lineOf = (cls, ...parts) => {
    const d = el('div', `ln${cls ? ` ${cls}` : ''}`);
    for (const p of parts) if (p != null && p !== '') d.append(p);
    return d;
  };
  const span = (cls, text) => el('span', cls, text);
  // a translated line with live nodes at its {placeholders}
  function tLine(key, nodes = {}, vars = {}, cls = '') {
    const marks = {};
    for (const k of Object.keys(nodes)) marks[k] = `\u0001${k}\u0001`;
    const s = t(key, { ...vars, ...marks });
    const d = el('div', `ln${cls ? ` ${cls}` : ''}`);
    s.split('\u0001').forEach((part, i) => { if (i % 2) d.append(nodes[part] || ''); else if (part) d.append(part); });
    return d;
  }
  function cmdBtn(label, command, fill = false) {
    const b = el('button', 't-cmd', label);
    b.type = 'button';
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (fill) { setInput(`${command} `); focusInput(true); return; }
      void exec(command);
      focusInput();
    });
    return b;
  }
  function echoLine(text) {
    const ps1 = el('span', 'term-ps1');
    ps1.append(el('span', 'term-host', HOST), '$ ');
    flush();
    appendNow(lineOf('echo', ps1, String(text)));
  }
  function options(cmd, opts, current) {
    const d = el('div', 'ln t-opts');
    opts.forEach((o) => {
      const b = cmdBtn(o, `${cmd} ${o}`);
      if (o === current) b.classList.add('on');
      d.append(b, ' ');
    });
    return d;
  }
  // usage / argument hints: placeholder words in the current language, command names untouched
  const argText = (s) => String(s || '').replace(/\{(\w+)\}/g, (_, k) => t(`a.${k}`));
  const usageOf = (cmd) => argText(USAGE[cmd] || cmd);
  function usageLine(cmd) { return say(t('usage', { u: usageOf(cmd) }), 'dim'); }
  // a work's type ("image", "video", or {en, zh}) as a word in the current language; unknown types as given
  function typeLabel(v) {
    const raw = pick(v).trim();
    if (!raw) return '';
    const key = `terminal.type.${raw.toLowerCase()}`;
    const s = T(key);
    return s && s !== key ? s : raw;
  }

  // ---------------------------------------------------------------- data access (everything optional)
  // works keep their content.json positions (H.showWork(i) and the projector index the raw list), so a junk
  // entry is blanked rather than dropped; books are filtered exactly like library.js, so `read n` → lib.open(n-1)
  const isObj = (x) => !!x && typeof x === 'object';
  const works = () => (Array.isArray(C().works) ? C().works.map((w) => (isObj(w) ? w : {})) : []);
  const books = () => (Array.isArray(C().books) ? C().books.filter(isObj) : []);
  const music = () => ctx.eggs?.music;
  const catName = () => pick(C().site?.catName) || t('cat.default');
  function tracks() {
    const m = music();
    const v = safe(() => (typeof m?.tracks === 'function' ? m.tracks() : m?.tracks), null);
    if (Array.isArray(v) && v.length) return v;
    const mc = C().music || {};
    const list = Array.isArray(mc.tracks) ? mc.tracks.filter(Boolean) : [];
    const tape = mc.includeStudioTape === false ? [] : [{ title: t('music.tape'), artist: t('music.tapeBy'), tape: true }];
    return tape.concat(list);
  }
  const trackTitle = (tr) => {
    if (!tr || typeof tr !== 'object') return '';
    const title = pick(tr.title) || (tr.tape || tr.live || tr.kind === 'tape' ? t('music.tape') : '');
    const artist = pick(tr.artist);
    return artist ? `${title} — ${artist}` : title;
  };
  function nowState() {
    const cl = ctx.climate || {};
    return {
      season: cl.season || state.season || 'autumn',
      time: cl.time || state.time || 'night',
      weather: cl.weather || state.weather || 'clear',
      live: cl.live ?? state.live ?? false,
      lights: state.lights || 'auto',
    };
  }
  const label = {
    weather: (n) => (n.live ? `${T('wx.live')} · ` : '') + T(`wx.${n.weather}`),
    time: (n) => T(`time.${n.time}`),
    season: (n) => T(`season.${n.season}`),
    lights: (n) => T(`lights.${n.lights}`),
  };
  const soundLive = () => { try { return !!((ctx.soundOn ? ctx.soundOn() : ctx.sound?.enabled) && ctx.sound?.ctx); } catch { return false; } };
  function blip(f, peak, d, type = 'square', when = 0, glide = null) {
    if (!soundLive()) return;
    try { ctx.sound.tone(f, peak, 0.003, d, type, when, undefined, glide); } catch { /* quiet */ }
  }
  function tick() {
    const n = performance.now();
    if (n - lastTick < 30) return;
    lastTick = n;
    blip(1650 + Math.random() * 500, 0.005, 0.016, 'square');
  }
  async function diaryEntries() {
    const d = ctx.eggs?.diary;
    try {
      const e = typeof d?.entries === 'function' ? await d.entries() : d?.entries;
      if (Array.isArray(e)) return e;
    } catch { /* fall back to the file */ }
    if (!diaryCache) {
      diaryCache = fetch('diary.json', { cache: 'no-cache' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => (Array.isArray(j?.entries) ? j.entries : []))
        .catch(() => []);
    }
    return diaryCache;
  }
  async function diaryCount() {
    const d = ctx.eggs?.diary;
    try {
      const c = typeof d?.count === 'function' ? await d.count() : d?.count;
      if (Number.isFinite(c)) return c;
    } catch { /* fall back */ }
    return (await diaryEntries()).length;
  }
  // pixel size of an Image or canvas (0 × 0 when it has none)
  const dims = (im) => ({ w: im?.naturalWidth || im?.width || 0, h: im?.naturalHeight || im?.height || 0 });
  // the current frame, at least `width` px wide when captureCanvas is there (it sizes the long side, so a
  // portrait canvas asks for more); otherwise the full-size JPEG from ctx.capture(), decoded
  function captureImage(width = 240) {
    if (typeof ctx.captureCanvas === 'function') {
      try {
        const src = ctx.renderer?.domElement;
        const tall = src?.width > 0 && src?.height > src.width ? src.height / src.width : 1;
        const cv = ctx.captureCanvas({ size: Math.ceil(Math.max(1, width) * tall), square: false });
        const d = dims(cv);
        if (cv && typeof cv.getContext === 'function' && d.w && d.h) return Promise.resolve(cv);
      } catch (e) { warn(e); }
    }
    return new Promise((res) => {
      let url = null;
      try { url = ctx.capture?.(); } catch { url = null; }
      if (!url || typeof url !== 'string') { res(null); return; }
      const im = new Image();
      im.onload = () => res(im.naturalWidth ? im : null);
      im.onerror = () => res(null);
      im.src = url;
    });
  }
  // luminance with a 3–97 % contrast stretch; null when the frame is black
  function lumaGrid(img, w, h) {
    const cv = el('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d', { willReadFrequently: true });
    if (!g) return null;
    g.drawImage(img, 0, 0, w, h);
    const p = g.getImageData(0, 0, w, h).data;
    const L = new Float32Array(w * h);
    for (let i = 0; i < L.length; i++) L[i] = (0.2126 * p[i * 4] + 0.7152 * p[i * 4 + 1] + 0.0722 * p[i * 4 + 2]) / 255;
    const s = Float32Array.from(L).sort();
    const lo = s[Math.floor(s.length * 0.03)], hi = s[Math.floor(s.length * 0.97)];
    if (hi < 0.03) return null;
    const span = Math.max(0.04, hi - lo);
    // half linear stretch, half histogram equalisation: dark rooms keep their shapes, bright ones their light
    const rank = (v) => {
      let a = 0, b = s.length;
      while (a < b) { const m = (a + b) >> 1; if (s[m] < v) a = m + 1; else b = m; }
      return a / s.length;
    };
    for (let i = 0; i < L.length; i++) L[i] = clamp(0.5 * ((L[i] - lo) / span) + 0.5 * rank(L[i]), 0, 1);
    return L;
  }

  // ---------------------------------------------------------------- commands
  function help(args) {
    const q = String(args[0] || '').toLowerCase();
    if (q) {
      const c = ALIAS[q] || q;
      if (VISIBLE.includes(c)) {
        say(usageOf(c), 'hi');
        say(t(`d.${c}`, { cat: catName() }), 'dim');
      } else notFound(q);
      return;
    }
    say(t('help.head'), 'dim');
    const box = el('div', 'ln t-help');
    for (const [g, list] of GROUPS) {
      const sec = el('div', 't-group');
      sec.append(el('div', 't-kick', t(`g.${g}`)));
      for (const c of list) {
        const r = el('div', 't-row help');
        const name = el('span');
        name.append(cmdBtn(c, c, FILL.has(c)));
        if (ARGHINT[c]) name.append(span('t-arg', ` ${argText(ARGHINT[c])}`));
        r.append(name, span('t-desc', t(`d.${c}`, { cat: catName() })));
        sec.append(r);
      }
      box.append(sec);
    }
    emit(box, 'scan');
    say(t('help.foot'), 'dim');
  }

  function about() {
    const s = C().site || {};
    if (s.role) say(pick(s.role), 't-kickline');
    if (pick(s.name)) say(pick(s.name), 'hi big');
    if (C().about) say(pick(C().about));
    if (s.tagline) say(`“${pick(s.tagline)}”`, 'dim');
    emit(lineOf('dim', '→ ', cmdBtn('contact', 'contact'), '  ', cmdBtn('works', 'works')));
  }

  function contact() {
    const links = Array.isArray(C().links) ? C().links.filter(Boolean) : [];
    if (!links.length) { say(t('none'), 'dim'); return; }
    links.forEach((l, i) => {
      const href = safeHref(l.url);
      const shown = String(l.url || '').replace(/^mailto:/i, '').replace(/^https?:\/\//i, '').replace(/\/$/, '');
      const r = el('div', 'ln t-row n');
      r.append(span('dim', pad2(i + 1)));
      const cell = el('span');
      if (href) {
        const a = el('a', 't-link', pick(l.label) || shown);
        a.href = href;
        if (!/^mailto:|^tel:/i.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
        cell.append(a, span('dim', `  ${shown}`));
      } else cell.append(pick(l.label) || shown);
      r.append(cell);
      emit(r);
    });
  }

  function listWorks(args = []) {
    const list = works();
    if (!list.length) say(t('none'), 'dim');
    else {
      say(t('works.head', { n: list.length }), 'dim');
      list.forEach((w, i) => {
        const r = el('div', 'ln t-row n');
        const tools = Array.isArray(w.tools) ? w.tools.slice(0, 3).map((x) => pick(x)).filter(Boolean).join(', ') : '';
        const year = typeof w.year === 'number' ? String(w.year) : pick(w.year);
        const meta = [year, typeLabel(w.type), tools].filter(Boolean).join(' · ');
        const cell = el('span');
        cell.append(span('t-hi', pick(w.title) || `#${i + 1}`), span('dim', meta ? `  ${meta}` : ''));
        r.append(cmdBtn(pad2(i + 1), `open ${i + 1}`), cell);
        emit(r);
      });
    }
    if (args.some((a) => /^-\w*a/.test(a))) {
      const d = el('div', 'ln');
      d.append(span('dim', `${t('works.hidden')} `));
      FILES.forEach((f) => d.append(cmdBtn(f, `cat ${f}`), '  '));
      emit(d);
    }
  }

  function findIndex(list, q) {
    if (/^\d+$/.test(q)) return Number(q) - 1;
    const low = q.toLowerCase();
    return list.findIndex((x) => pick(x?.title).toLowerCase().includes(low));
  }

  function openWork(args) {
    const list = works();
    const q = args.join(' ').trim();
    if (!q) { usageLine('open'); listWorks(); return; }
    const panel = { about: 'about', contact: 'contact', list: 'list' }[q.toLowerCase()];
    if (panel) {
      say(t('panel', { what: T(`panel.${panel}`) }));
      handoff(() => { if (ctx.H?.go) ctx.H.go(panel); else ctx.ui?.openPanel?.(panel); }, 260);
      return;
    }
    if (!list.length) { say(t('none'), 'dim'); return; }
    const i = findIndex(list, q);
    if (!(i >= 0 && i < list.length)) { say(t('badn', { n: q, max: list.length }), 'err'); return; }
    say(t('open', { i: pad2(i + 1), title: pick(list[i].title) || `#${i + 1}` }));
    safe(() => ctx.H?.showWork?.(i));
    stepAside();
  }

  function step(d) {
    safe(() => (d > 0 ? ctx.H?.next?.() : ctx.H?.prev?.()));
    say(t(d > 0 ? 'next' : 'prev'));
    stepAside();
  }

  function setWeather(args) {
    const v = String(args[0] || '').toLowerCase();
    const n = nowState();
    if (!v) {
      say(t('now', { v: label.weather(n) }));
      emit(options('weather', SKIES, n.live ? 'live' : n.weather));
      return;
    }
    if (!SKIES.includes(v)) { say(t('badarg', { v }), 'err'); emit(options('weather', SKIES)); return; }
    if (v === 'random') { say(t('surprise')); safe(() => ctx.H?.surprise?.()); }
    else if (v === 'live') { say(t('live', { place: pick(C().site?.location?.label) || '…' })); safe(() => ctx.H?.weather?.('live')); }
    else { safe(() => ctx.H?.weather?.(v)); say(t('set.weather', { v: T(`wx.${v}`) })); }
    peek();
  }

  function setter(kind, list, args) {
    const v = String(args[0] || '').toLowerCase();
    const n = nowState();
    if (!v) {
      say(t('now', { v: label[kind](n) }));
      emit(options(kind, list, n[kind]));
      return;
    }
    if (!list.includes(v)) { say(t('badarg', { v }), 'err'); emit(options(kind, list)); return; }
    safe(() => ctx.H?.[kind]?.(v));
    if (kind === 'lights') state.lights = v;
    say(t(`set.${kind}`, { v: label[kind]({ ...n, [kind]: v, live: false }) }));
    peek();
  }

  // ascii rendering of the frame behind the terminal
  async function look() {
    const my = jobId;
    const probe = el('pre', 't-ascii t-probe', 'MMMMMMMMMMMMMMMMMMMM');
    out.append(probe);
    const cw = probe.getBoundingClientRect().width / 20 || 4.8;
    const lh = parseFloat(getComputedStyle(probe).lineHeight) || cw * 1.7;
    probe.remove();
    // as wide as the glass allows, but never taller than what is visible at once
    let cols = clamp(Math.floor((out.clientWidth || 560) / cw) - 1, 32, 150);
    const img = await captureImage(cols);             // one pixel per column at most; rows only ever shrink it
    if (my !== jobId) return;
    const px = dims(img);
    const aspect = px.w ? (px.h / px.w) * (cw / lh) : 0.5;
    const maxRows = clamp(Math.floor(((scrollEl?.clientHeight || 320) - 64) / lh), 12, 64);
    let rows = Math.round(cols * aspect);
    if (rows > maxRows) { rows = maxRows; cols = clamp(Math.round(rows / aspect), 24, cols); }
    rows = clamp(rows, 8, 64);
    const L = img ? safe(() => lumaGrid(img, cols, rows), null) : null;
    if (!L) { say(t('look.fail'), 'err'); return; }
    const lines = [];
    for (let y = 0; y < rows; y++) {
      let s = '';
      for (let x = 0; x < cols; x++) s += RAMP[Math.round(Math.pow(L[y * cols + x], 0.85) * (RAMP.length - 1))];
      lines.push(s.replace(/\s+$/, ''));
    }
    say(t('look.head'), 'dim');
    const pre = el('pre', 'ln t-ascii', lines.join('\n'));
    pre.setAttribute('aria-hidden', 'true');
    emit(pre, 'scan');
  }

  // an amber, dithered "print" of the frame (fallback for photo)
  async function phosphorPrint() {
    const w = 240;
    const img = await captureImage(w);
    const px = dims(img);
    const h = px.w ? Math.max(60, Math.round(w * px.h / px.w)) : 0;
    const L = img ? safe(() => lumaGrid(img, w, h), null) : null;
    if (!L) { say(t('look.fail'), 'err'); return; }
    const cv = el('canvas', 't-print');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    const d = g.createImageData(w, h);
    const dark = [9, 6, 4], lit = [255, 196, 106], levels = 5;
    for (let y = 0; y < h; y++) {
      const scan = y % 2 ? 0.74 : 1;
      for (let x = 0; x < w; x++) {
        const l = L[y * w + x] + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47) / (levels - 1);
        const q = clamp(Math.round(l * (levels - 1)) / (levels - 1), 0, 1);
        const o = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) d.data[o + c] = (dark[c] + (lit[c] - dark[c]) * q) * scan;
        d.data[o + 3] = 255;
      }
    }
    g.putImageData(d, 0, 0);
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', t('photo.alt'));
    const holder = el('div', 'ln');
    holder.append(cv);
    emit(holder, 'scan');
  }

  async function photo() {
    const m = ctx.eggs?.moments;
    if (typeof m?.polaroid === 'function') {
      say(t('photo'));
      handoff(() => { const p = m.polaroid(); if (p && typeof p.catch === 'function') p.catch(() => {}); });
      return;
    }
    say(t('photo.fallback'), 'dim');
    await phosphorPrint();
  }

  function party() {
    const m = ctx.eggs?.moments;
    if (typeof m?.party === 'function') {
      const ok = safe(() => m.party(), true);
      say(t(ok === false ? 'party.no' : 'party'));
      peek(3200);
      return;
    }
    if (!ctx.fx) { say(t('missing'), 'dim'); return; }
    if (partyT > 0) { say(t('party.no')); return; }
    partyColor = partyColor || new THREE.Color();
    partyT = 10;
    partyClock = 0;
    ctx.fx.fairyChase = still ? 0 : 1;
    ctx.fx.lampColor = partyColor;
    say(t('party'));
    emit(lineOf('t-confetti', '·  *  ·   +   ·  *    ·  +  *   ·'), 'type');
    peek(3200);
  }

  function play(args) {
    const list = tracks();
    const raw = args[0];
    const n = raw != null ? parseInt(raw, 10) : NaN;
    if (raw != null && !list.length) { say(t('none'), 'dim'); return; }
    if (raw != null && !(n >= 1 && n <= list.length)) { say(t('badn', { n: raw, max: list.length }), 'err'); return; }
    const m = music();
    if (typeof m?.play === 'function') {
      safe(() => { const r = Number.isFinite(n) ? m.play(n - 1) : m.play(); if (r && typeof r.catch === 'function') r.catch(() => {}); });
      say(t('music.play'));
      const known = Number.isFinite(n) ? trackTitle(list[n - 1]) : '';
      setTimeout(() => {
        const title = known || nowTitle();
        if (title) say(t('music.playing', { title }), 'hi');
      }, still ? 0 : 120);
      return;
    }
    lofi(true);
    say(t('music.play'));
    say(t('music.playing', { title: `${t('music.tape')} — ${t('music.tapeBy')}` }), 'hi');
  }
  function nowTitle() {
    const m = music();
    const c = safe(() => (typeof m?.current === 'function' ? m.current() : m?.current), null);
    if (typeof c === 'number') return trackTitle(tracks()[c]);
    if (c && typeof c === 'object') return trackTitle(c.track || c);
    return '';
  }
  function pause() {
    const m = music();
    const fn = m && (typeof m.pause === 'function' ? m.pause : typeof m.stop === 'function' ? m.stop : null);
    if (fn) safe(() => fn.call(m));
    else lofi(false);
    say(t('music.pause'));
  }
  function skip() {
    const m = music();
    const fn = m && (typeof m.skip === 'function' ? m.skip : typeof m.next === 'function' ? m.next : null);
    if (!fn) { say(t('music.only'), 'dim'); return; }
    const list = tracks();
    if (list.length < 2) {
      // the player has nothing to change to (it only rewinds a lone file): say so instead of "next record"
      const solo = list[0];
      const tape = !solo || solo.tape || solo.live || solo.kind === 'tape';
      say(tape ? t('music.only') : t('music.one', { title: trackTitle(solo) }), 'dim');
      return;
    }
    safe(() => fn.call(m));
    say(t('music.skip'));
    setTimeout(() => {
      const title = nowTitle();
      if (!title) return;
      // paused, the player only cues the next record up; it does not start it
      const playing = typeof m.isPlaying === 'function' ? safe(() => m.isPlaying(), true) : true;
      say(t(playing ? 'music.playing' : 'music.next', { title }), playing ? 'hi' : '');
    }, still ? 0 : 120);
  }
  function lofi(on) {
    const s = ctx.sound;
    if (!s) return;
    if (on) {
      safe(() => { if (ctx.soundOn && !ctx.soundOn()) ctx.setSound?.(true); });
      if (!s.ctx) safe(() => s.start?.(true));
      if (!lofiOn && s.ctx) { safe(() => s.startLofi()); lofiOn = true; }
    } else if (lofiOn) { safe(() => s.stopLofi()); lofiOn = false; }
  }
  function listMusic() {
    const list = tracks();
    if (!list.length) { say(t('none'), 'dim'); return; }
    say(t('music.head'), 'dim');
    list.forEach((tr, i) => {
      const r = el('div', 'ln t-row n');
      const cell = el('span');
      const album = [pick(tr.album), tr.year].filter(Boolean).join(', ');
      cell.append(span('t-hi', pick(tr.title) || (tr.tape || tr.live || tr.kind === 'tape' ? t('music.tape') : `#${i + 1}`)));
      if (pick(tr.artist)) cell.append(` — ${pick(tr.artist)}`);
      if (album) cell.append(span('dim', `  ${album}`));
      r.append(cmdBtn(pad2(i + 1), `play ${i + 1}`), cell);
      emit(r);
    });
    say(t('music.hint'), 'dim');
  }

  function listBooks() {
    const list = books();
    if (!list.length) { say(t('none'), 'dim'); return; }
    say(t('books.head', { n: list.length }), 'dim');
    list.forEach((b, i) => {
      const r = el('div', 'ln t-row n');
      const cell = el('span');
      cell.append(span('t-hi', pick(b.title) || `#${i + 1}`));
      if (pick(b.author)) cell.append(` — ${pick(b.author)}`);
      if (b.year) cell.append(span('dim', `  ${b.year}`));
      r.append(cmdBtn(pad2(i + 1), `read ${i + 1}`), cell);
      emit(r);
    });
  }

  function read(args) {
    const list = books();
    const q = args.join(' ').trim();
    if (!q) { usageLine('read'); listBooks(); return; }
    if (!list.length) { say(t('none'), 'dim'); return; }
    const i = findIndex(list, q);
    if (!(i >= 0 && i < list.length)) { say(t('badn', { n: q, max: list.length }), 'err'); return; }
    const b = list[i];
    const lib = ctx.eggs?.library;
    if (typeof lib?.open === 'function') {
      say(t('read', { title: pick(b.title) || `#${i + 1}` }));
      handoff(() => lib.open(i));
      return;
    }
    // no library module: the card, printed here
    say(pick(b.title), 'hi big');
    say([pick(b.author), b.year].filter(Boolean).join(' · '), 'dim');
    if (pick(b.note)) say(pick(b.note));
    if (pick(b.quote)) say(`“${pick(b.quote)}”`, 'dim');
  }

  async function diary() {
    const d = ctx.eggs?.diary;
    if (typeof d?.open === 'function') {
      say(t('diary'));
      handoff(() => d.open());
      return;
    }
    const my = jobId;
    const list = (await diaryEntries()).filter((e) => e && typeof e === 'object');
    if (my !== jobId) return;
    if (!list.length) { say(t('diary.empty'), 'dim'); return; }
    const e = list.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0];
    say(t('diary.last', { date: e.date || '—', title: pick(e.title) }), 'hi');
    pick(e.body).split(/\n\s*\n/).filter(Boolean).slice(0, 3).forEach((p) => say(p.trim()));
  }

  function moodboard() {
    const det = ctx.eggs?.details;
    if (typeof det?.openMoodboard !== 'function') { say(t('missing'), 'dim'); return; }
    say(t('moodboard'));
    handoff(() => det.openMoodboard(-1));
  }

  // a progress bar that fills in place; resolves false when interrupted
  async function progressBar(text, steps, ms, my) {
    const node = say('');
    const draw = (k) => {
      const done = Math.round(k * steps);
      node.textContent = `${text}  [${'█'.repeat(done)}${'░'.repeat(steps - done)}]  ${String(done).padStart(2)}/${steps}`;
    };
    draw(0);
    if (still) { draw(1); return true; }
    const n = 12;
    for (let i = 1; i <= n; i++) {
      await wait(ms / n);
      if (my !== jobId) return false;
      draw(i / n);
    }
    return true;
  }

  async function render() {
    const my = jobId;
    const raw = C().monitor?.nodes;
    const nodes = (Array.isArray(raw) && raw.length ? raw : ['Load Checkpoint', 'CLIP Text Encode', 'KSampler', 'VAE Decode', 'Save']).map(String).slice(0, 10);
    say(t('render.queued', { seed: 10000 + Math.floor(Math.random() * 89999) }), 'dim');
    for (const name of nodes) {
      if (my !== jobId) return;
      if (/sampler/i.test(name)) {
        if (!(await progressBar(name, 20, 1400, my))) return;
        continue;
      }
      const l = say(`[ .. ] ${name}`);
      await wait(140 + Math.random() * 220);
      if (my !== jobId) return;
      l.textContent = `[ ok ] ${name}`;
    }
    say(t('render.done', { n: String(frameNo++).padStart(4, '0') }), 'hi');
    say(t('render.note'), 'dim');
    blip(988, 0.02, 0.3, 'sine');
    blip(1319, 0.018, 0.4, 'sine', 0.1);
  }

  async function coffee() {
    const my = jobId;
    const art = el('pre', 'ln t-art', MUG);
    art.setAttribute('aria-hidden', 'true');
    emit(art, 'scan');
    if (!(await progressBar(t('coffee.brew'), 16, 1300, my))) return;
    say(t('coffee.done'));
    blip(1319, 0.03, 0.7, 'sine');
    blip(1760, 0.018, 0.6, 'sine', 0.12);
  }

  function catCmd(args) {
    const f = String(args[0] || '');
    if (f) { catFile(f); return; }
    const art = el('pre', 'ln t-art', CAT);
    art.setAttribute('aria-hidden', 'true');
    emit(art, 'scan');
    say(t('cat.say', { cat: catName() }));
    safe(() => ctx.sound?.purr?.());
    if (!soundLive()) say(t('cat.quiet'), 'dim');
  }
  function catFile(f) {
    const k = f.toLowerCase().replace(/^\.\//, '');
    if (k === 'readme.txt' || k === 'readme') about();
    else if (k === 'contact.txt' || k === 'contact') contact();
    else if (k === '.behind-the-plant') say(t('plant'), 'hi');
    else say(t('cat.nofile', { f }), 'err');
  }

  async function studio() {
    const my = jobId;
    const n = nowState();
    const dn = await diaryCount().catch(() => null);
    if (my !== jobId) return;
    const s = C().site || {};
    const pets = safe(() => ctx.eggs?.details?.catPets?.(), null);
    const rev = safe(() => THREE.REVISION, '') || '186';
    const rows = [
      ['os', `ATTIC/OS 1.0 · three.js r${rev}`],
      ['host', pick(s.name)],
      ['role', pick(s.role)],
      ['place', pick(s.location?.label)],
      ['season', label.season(n)],
      ['weather', label.weather(n)],
      ['time', label.time(n)],
      ['lights', label.lights(n)],
      ['view', t(`view.${view}`)],
      ['works', String(works().length)],
      ['books', String(books().length)],
      ['diary', dn == null ? '' : t('v.pages', { n: dn })],
      ['music', String(tracks().length)],
      ['cat', Number.isFinite(pets) && pets > 0 ? t('v.pets', { cat: catName(), n: pets }) : catName()],
      ['uptime', fmtDur(performance.now() / 1000)],
      ['shell', 'atsh 0.1'],
    ].filter((r) => r[1]);
    const box = el('div', 'ln t-fetch');
    const art = el('pre', 't-art', ATTIC.join('\n'));
    art.setAttribute('aria-hidden', 'true');
    const kv = el('div', 't-kvs');
    kv.append(el('div', 't-hi', 'studio@attic'), el('div', 'dim', '─'.repeat(12)));
    for (const [k, v] of rows) {
      const r = el('div', 't-row kv');
      r.append(span('dim', t(`k.${k}`)), span('', v));
      kv.append(r);
    }
    const sw = el('div', 't-swatches');
    sw.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 8; i++) sw.append(el('i', `t-sw s${i}`));
    kv.append(sw);
    box.append(art, kv);
    emit(box, 'scan');
  }

  function fortune() {
    let i = Math.floor(Math.random() * FORTUNES.en.length);
    if (i === lastFortune) i = (i + 1) % FORTUNES.en.length;
    lastFortune = i;
    say(t(`f.${i}`), 'hi');
    say(t('fortune.by'), 'dim');
  }

  function whoami() {
    say(t('whoami', { n: visits }), 'hi');
    say(t('whoami2'));
    if (firstSeen) say(t('whoami.first', { date: firstSeen }), 'dim');
  }

  function date() {
    const tz = safe(() => studioZone(ctx.content), '') || '';   // '' = no usable studio zone: show the visitor's clock
    const mine = safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone, '') || '';
    const d = new Date();
    const loc = lang() === 'zh' ? 'zh-CN' : 'en-GB';
    const fmt = (z) => safe(() => new Intl.DateTimeFormat(loc, {
      timeZone: z || undefined, weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).format(d), d.toString());
    if (tz) {
      emit(lineOf('', span('t-hi', fmt(tz)), span('dim', `   ${t('date.studio', { tz })}`)));
      if (mine && mine !== tz) emit(lineOf('', fmt(mine), span('dim', `   ${t('date.you', { tz: mine })}`)));
    } else {
      emit(lineOf('', span('t-hi', fmt('')), span('dim', `   ${mine ? t('date.you', { tz: mine }) : t('date.here')}`)));
    }
    const h = safe(() => Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz || undefined, hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(d).find((p) => p.type === 'hour')?.value) % 24, d.getHours());
    const b = h >= 23 || h < 5 ? 0 : h < 11 ? 1 : h < 17 ? 2 : 3;
    say(t(`date.h${b}`), 'dim');
  }

  function uptime() {
    const now = Date.now();
    const within = (ms) => stamps.filter((x) => now - x < ms).length;
    const l = [within(60e3) / 4, within(300e3) / 20, within(900e3) / 60].map((x) => x.toFixed(2)).join(', ');
    say(t('uptime', { t: fmtDur(performance.now() / 1000), n: commands, l }));
  }

  function history() {
    const list = hist.slice(-20);
    if (!list.length) { say(t('history.none'), 'dim'); return; }
    const base = hist.length - list.length;
    list.forEach((h, i) => {
      const r = el('div', 'ln t-row n');
      r.append(span('dim', String(base + i + 1).padStart(3)), cmdBtn(h, h));
      emit(r);
    });
  }

  function setLang(args) {
    const v = String(args[0] || '').toLowerCase();
    if (!v) { say(t('lang.now', { v: lang() })); emit(options('lang', LANGS, lang())); return; }
    if (!LANGS.includes(v)) { say(t('badarg', { v }), 'err'); emit(options('lang', LANGS, lang())); return; }
    if (v !== lang()) {
      let threw = false;
      try { ctx.H?.lang?.(); } catch (e) { threw = true; warn(e); }
      // main's handler stopped half way (ui.renderStatic): finish the switch so labels and modules follow
      if (threw && lang() === v) {
        safe(() => i18n?.apply?.());
        safe(() => ctx.emit?.('lang', v));
      }
    }
    if (lang() !== v) { say(t('missing'), 'dim'); return; }
    renderStatic();
    say(t('lang.set'));
  }

  function sudo(rest) {
    const r = String(rest || '').toLowerCase();
    const cat = catName();
    if (!r) say(t('sudo.empty'));
    else if (/\brm\b.*-\w*r/.test(r)) say(t('sudo.rm'));
    else if (/sandwich|三明治/.test(r)) say(t('sudo.sandwich'));
    else if (/please|pls|请/.test(r)) say(t('sudo.please'));
    else say(t('sudo', { cat }));
  }

  function exitCmd() {
    say(t('bye'), 'dim');
    setTimeout(() => close(), still ? 0 : 200);
  }

  function notFound(w) {
    say(t('notfound', { cmd: w }), 'err');
    const low = w.toLowerCase();
    let best = '', bd = 9;
    for (const c of VISIBLE.concat(Object.keys(ALIAS))) {
      const d = lev(low, c);
      if (d < bd) { bd = d; best = c; }
    }
    if (best && bd <= (low.length > 4 ? 2 : 1)) emit(tLine('didyoumean', { s: cmdBtn(best, best) }, {}, 'dim'));
    else say(t('tryhelp'), 'dim');
  }

  function motd() {
    booted = true;
    say(t('motd1'), 'dim');
    let when = '';
    if (lastLogin) {
      when = safe(() => new Intl.DateTimeFormat(lang() === 'zh' ? 'zh-CN' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastLogin)), '');
    }
    say(when ? t('motd2.back', { when }) : t('motd2.first'), 'dim');
    emit(tLine('motd3', { help: cmdBtn('help', 'help') }));
  }

  const table = {
    help, about, contact,
    works: (a) => listWorks(a), open: (a) => openWork(a),
    next: () => step(1), prev: () => step(-1),
    weather: (a) => setWeather(a),
    time: (a) => setter('time', TIMES, a),
    season: (a) => setter('season', SEASONS, a),
    lights: (a) => setter('lights', LIGHTS, a),
    look, photo, party,
    play: (a) => play(a), pause, skip, music: listMusic,
    books: listBooks, read: (a) => read(a), diary, moodboard, render, coffee,
    cat: (a) => catCmd(a), studio, fortune, whoami, date, uptime, history,
    echo: (a, m) => say(m.rest),
    lang: (a) => setLang(a),
    sudo: (a, m) => sudo(m.rest),
    clear: () => clearScreen(),
    exit: exitCmd,
    // not in help
    pwd: () => say('/home/attic'),
    cd: () => say(t('cd')),
    hello: () => say(t('hello')),
    xyzzy: () => say(t('xyzzy'), 'dim'),
  };

  async function exec(raw, { echo = true } = {}) {
    try {
      if (!root) build();
      const line = String(raw ?? '').replace(/[\r\n]+/g, ' ');
      if (echo && out) echoLine(line);
      else flush();
      const trimmed = line.trim();
      if (!trimmed) return true;
      pushHist(trimmed);
      commands++;
      stamps.push(Date.now());
      if (stamps.length > 200) stamps.shift();
      const w0 = trimmed.split(/\s+/)[0];
      const name = w0.toLowerCase();
      const args = trimmed.split(/\s+/).slice(1);
      const fn = table[name] || table[ALIAS[name]];
      jobId++;
      if (!fn) { notFound(w0); return false; }
      await fn(args, { raw: trimmed, rest: trimmed.slice(w0.length).trim(), name });
      return true;
    } catch (e) {
      warn(e);
      try { say(t('oops'), 'err'); } catch { /* nothing left to do */ }
      return false;
    }
  }

  // ---------------------------------------------------------------- keys
  // Focus (or the key's target) inside another overlay's open dialog (the photo, the diary, a plant note…):
  // those keys belong to that dialog, never to the terminal.
  function inOtherDialog(e) {
    if (!doc) return false;
    for (const n of [e?.target, doc.activeElement]) {
      if (!n || n.nodeType !== 1 || n === doc.body || n === doc.documentElement || (root && root.contains(n))) continue;
      const d = n.closest?.(DIALOG);
      if (!d || d.closest('[hidden]')) continue;
      if (d.closest('[data-open]')?.dataset.open === 'false') continue;      // a closed one does not count
      return true;
    }
    return false;
  }
  // another module's dialog opening (they mark it data-open="true"; not all of them emit 'overlay'), or one of
  // the room's own layers: About / Contact / List panel, the phone atmosphere sheet and work sheet, a dial menu
  function rivalDialog(n) {
    if (!n || n.nodeType !== 1 || (root && root.contains(n)) || n.dataset?.open !== 'true') return false;
    if (n.matches?.(ROOM_LAYERS) || n.matches?.(DIALOG)) return true;
    try { return !!n.querySelector(':scope > [role="dialog"], :scope > [aria-modal="true"]'); } catch { return false; }
  }
  try {
    if (doc && typeof MutationObserver === 'function') {
      new MutationObserver((list) => {
        try { if (isOpen && list.some((m) => rivalDialog(m.target))) close({ restore: false }); } catch (err) { warn(err); }
      }).observe(doc.body, { subtree: true, attributes: true, attributeFilter: ['data-open'] });
    }
    // focus moving into another dialog that shows itself without data-open
    doc?.addEventListener('focusin', (e) => {
      try { if (isOpen && inOtherDialog({ target: e.target })) close({ restore: false }); } catch (err) { warn(err); }
    });
  } catch (e) { warn(e); }

  const mark = (e) => { e.__terminal = true; e.preventDefault(); e.stopPropagation(); };
  function typeIntoPrompt(ch) {
    focusInput(true);
    setInput(input.value + ch);
    tick();
  }
  // Stray keys while the terminal is open go to the prompt instead of the room: from the room (after a click on
  // the canvas or a dial), and from the window itself when focus sits on it or on an output button / link.
  function onGlobalKey(e) {
    try {
      if (e.__terminal || e.defaultPrevented) return;
      if (e.isComposing || e.keyCode === 229) return;              // IME at work
      const inside = !!root && root.contains(e.target);
      if (!isOpen) {
        if ((e.key === '`' || e.key === '~') && entered !== false && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat
          && !isTextField(e.target) && !inOtherDialog(e)) {
          e.__terminal = true;
          e.preventDefault();
          open({ viaKey: true });
        }
        return;
      }
      if (isTextField(e.target)) return;                           // the prompt's own handler, or another module's field
      if (!inside && inOtherDialog(e)) return;                     // another overlay's dialog keeps its keys
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const onControl = !!e.target?.closest?.('button, a, select, [role="button"], [role="menuitemradio"]');
      if (e.key === 'Escape' || e.key === '`') { mark(e); close(); return; }
      if (inside) {
        // Space / Enter still press a focused output button or link; everything printable lands in the prompt
        if (e.key.length === 1 && !(onControl && e.key === ' ')) { mark(e); typeIntoPrompt(e.key); }
        else if (e.key === 'Backspace') { mark(e); focusInput(true); setInput(input.value.slice(0, -1)); }
        else if (!onControl && e.key === 'Enter') { mark(e); focusInput(true); }
        return;
      }
      if (e.key.length === 1 && !(onControl && e.key === ' ')) { mark(e); typeIntoPrompt(e.key); }
      else if (/^Arrow/.test(e.key) || (!onControl && /^(Enter|Backspace|Tab)$/.test(e.key))) {
        // arrows always (room shortcuts: next / prev); Enter, Space and Tab keep working on a focused room control
        mark(e);
        focusInput(true);
      }
    } catch (err) { warn(err); }
  }
  try { W?.addEventListener('keydown', onGlobalKey, true); } catch (e) { warn(e); }

  function toggleKey(e, canClose) {
    try {
      if (e?.__terminal) return true;
      if (e && (e.ctrlKey || e.metaKey || e.altKey)) return false;
      const inside = !!root && !!e && root.contains(e.target);
      if (inside) return false;                          // the prompt itself decides: type it or close
      if (e && isTextField(e.target)) return false;
      if (e && inOtherDialog(e)) return false;           // not over someone else's dialog
      if (e) e.__terminal = true;
      e?.preventDefault?.();
      if (!isOpen) { open({ viaKey: !!e }); return true; }
      if (canClose) close(); else focusInput(true);
      return true;
    } catch (err) { warn(err); return false; }
  }

  // ---------------------------------------------------------------- build now (hidden) so lang changes apply
  safe(build);

  return {
    actions: {
      pc: () => { safe(open); },
      keyboard: () => { safe(open); },        // the desk keyboard (the tower sits almost off-screen in the desk view)
    },
    tips: {
      pc: () => t('tip'),
      keyboard: () => t('tip.kb'),
    },
    keys: {
      '`': (e) => toggleKey(e, true),
      '~': (e) => toggleKey(e, false),
      Escape: (e) => {
        if (e?.__terminal) return true;
        if (!isOpen) return false;
        if (e && safe(() => inOtherDialog(e), false)) return false;   // that dialog's Esc, not ours
        if (e) e.__terminal = true;
        return safe(close, false);
      },
    },
    update(dt, frame) {
      try {
        if (frame?.view) view = frame.view;
        if (typeof frame?.entered === 'boolean') entered = frame.entered;
        // the site's own language button may switch without emitting 'lang' (see integration notes)
        if (root && shownLang !== lang()) renderStatic();
        if (partyT > 0 && ctx.fx) {
          partyT -= dt || 0;
          partyClock += dt || 0;
          partyColor.setHSL((partyClock * (still ? 0.04 : 0.22)) % 1, 0.7, 0.62);
          if (partyT <= 0) {
            partyT = 0;
            if (ctx.fx.lampColor === partyColor) ctx.fx.lampColor = null;
            ctx.fx.fairyChase = 0;
          }
        }
      } catch { /* never throw from update */ }
    },
    api: {
      open: () => safe(open, false),
      close: () => safe(close, false),
      toggle: () => safe(() => (isOpen ? close() : open()), false),
      isOpen: () => isOpen,
      run: (line, opts) => {
        try {
          if (!opts?.silent) safe(open);
          return exec(line);
        } catch (e) { warn(e); return Promise.resolve(false); }
      },
    },
  };
}
