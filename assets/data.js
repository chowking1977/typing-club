/* 课程与练习内容数据：全部内置，无需网络请求 */
(function () {
  "use strict";

  var baseCourses = [
    {
      id: "basics",
      title: "基础指法",
      short: "指法",
      desc: "从基准键位开始，一排一排建立十指记忆。建议按顺序完成，每关约 20 秒。",
      mode: "word",
      sequential: true,
      targetWpm: 18,
      levels: [
        {
          id: "basics-01",
          title: "基准键 F / J",
          tip: "左手食指放 F，右手食指放 J。两个键上的小凸起就是定位点，每次回位都先摸到它们。",
          items: ["fff", "jjj", "fj", "jf", "fjfj", "jfjf", "ffjj", "jjff", "fjfjfj", "jjjfff"]
        },
        {
          id: "basics-02",
          title: "基准键 A S D / K L ;",
          tip: "左手无名指 A、中指 S、小指 ;，右手无名指 L、中指 K。手腕保持悬空，不要压在小鱼际上。",
          items: ["asdf", "jkl;", "sad", "ask", "fall", "lass", "flask", "salad", "dala", "kljk"]
        },
        {
          id: "basics-03",
          title: "上排 Q W E R",
          tip: "手指从基准键向上斜移到上排，按完立刻回到 F / J 附近的原位。",
          items: ["we", "were", "qwer", "rewq", "few", "free", "deer", "reed", "wear", "weed"]
        },
        {
          id: "basics-04",
          title: "上排 T Y U I O P",
          tip: "T 与 Y 由左右食指负责，其余上排键与下排手指一一对应。",
          items: ["toy", "you", "type", "tie", "toe", "up", "pop", "quiet", "output", "pretty"]
        },
        {
          id: "basics-05",
          title: "下排 Z X C V B N M",
          tip: "下排是三排中最容易错的一排，慢一点，用指尖而不是指腹去按键。",
          items: ["zoo", "mix", "box", "cab", "van", "ban", "cabin", "number", "maze", "carbon"]
        },
        {
          id: "basics-06",
          title: "常用标点 , . / '",
          tip: "右手无名指管逗号，中指管句号，小指管斜杠与引号。别看键盘，先想位置再落指。",
          items: ["a,b", "c.d", "e/f", "it's", "end.", "well,", "a/b", "ok.", "yes,", "don't"]
        },
        {
          id: "basics-07",
          title: "数字行 1 - 5",
          tip: "数字行用指尖向上轻够，左手负责 1-5，右手负责 6-0，落指后立刻回到基准键。",
          items: ["123", "234", "345", "1234", "54321", "2024", "135", "246", "314", "42"]
        },
        {
          id: "basics-08",
          title: "数字行 6 - 0",
          tip: "数字行练习不追求快，先保证每次都能回到 F / J 基准位。",
          items: ["678", "789", "90", "67890", "100", "2026", "97531", "680", "4096", "1080"]
        },
        {
          id: "basics-09",
          title: "大写与 Shift",
          tip: "用与字母相反一侧的 Shift：左手字母配右 Shift，右手字母配左 Shift。",
          items: ["Hello", "World", "Code", "Type", "China", "English", "Friday", "January", "Sunday", "Great"]
        },
        {
          id: "basics-10",
          title: "综合巩固",
          tip: "这一关开始出现真实高频词，先求准确，再求速度。",
          items: ["the", "and", "for", "you", "with", "that", "this", "have", "from", "they", "about", "would"]
        },
        {
          id: "basics-11",
          title: "常用组合词",
          tip: "长单词不要逐个字母看，按音节或常见字母块去读，输入会更连贯。",
          items: ["because", "thought", "through", "between", "without", "another", "important", "different", "language", "computer"]
        },
        {
          id: "basics-12",
          title: "速度冲刺",
          tip: "最后一关，保持手腕放松。准确率优先于速度，速度会自然跟上。",
          items: ["keyboard", "practice", "accuracy", "progress", "rhythm", "strength", "challenge", "excellent", "comfortable", "improvement"]
        }
      ]
    },
    {
      id: "words",
      title: "常用单词",
      short: "单词",
      desc: "按主题分组的英文高频词，右侧给出中文释义。单词必须完整正确才会进入下一个。",
      mode: "word",
      sequential: false,
      targetWpm: 28,
      levels: [
        {
          id: "words-01",
          title: "高频词（一）",
          tip: "这些词在英文文本中出现频率最高，打熟之后整段输入会顺很多。",
          items: [
            { t: "the", m: "这个；特指" }, { t: "of", m: "……的" }, { t: "and", m: "和；并且" }, { t: "a", m: "一个" },
            { t: "to", m: "向；到" }, { t: "in", m: "在……里" }, { t: "is", m: "是" }, { t: "you", m: "你" },
            { t: "that", m: "那个；那" }, { t: "it", m: "它" }, { t: "for", m: "为了；对于" }, { t: "on", m: "在……上" },
            { t: "with", m: "和……一起" }, { t: "as", m: "作为；如同" }, { t: "was", m: "是（过去式）" }, { t: "at", m: "在（某处）" }
          ]
        },
        {
          id: "words-02",
          title: "高频词（二）",
          tip: "注意 and / an / at 这类形近词的起手位置，容易在快速输入时混淆。",
          items: [
            { t: "be", m: "是；成为" }, { t: "this", m: "这个" }, { t: "have", m: "有；已经" }, { t: "from", m: "来自" },
            { t: "or", m: "或者" }, { t: "one", m: "一；一个" }, { t: "had", m: "有（过去式）" }, { t: "by", m: "通过；由" },
            { t: "word", m: "单词；话语" }, { t: "but", m: "但是" }, { t: "not", m: "不" }, { t: "what", m: "什么" },
            { t: "all", m: "所有；全部" }, { t: "were", m: "是（过去式复数）" }, { t: "when", m: "当……时" }, { t: "we", m: "我们" }
          ]
        },
        {
          id: "words-03",
          title: "日常名词",
          tip: "名词长度差异大，短词不要抢速度，长词保持均匀节奏。",
          items: [
            { t: "time", m: "时间" }, { t: "person", m: "人" }, { t: "year", m: "年" }, { t: "way", m: "方式；道路" },
            { t: "day", m: "天；白天" }, { t: "thing", m: "事情；东西" }, { t: "world", m: "世界" }, { t: "life", m: "生活；生命" },
            { t: "hand", m: "手" }, { t: "part", m: "部分" }, { t: "child", m: "孩子" }, { t: "eye", m: "眼睛" },
            { t: "woman", m: "女人" }, { t: "place", m: "地方" }, { t: "work", m: "工作" }, { t: "school", m: "学校" }
          ]
        },
        {
          id: "words-04",
          title: "常用动词",
          tip: "动词是句子的骨架，建议把常错的那几个单独记下来反复练。",
          items: [
            { t: "make", m: "制作；使" }, { t: "know", m: "知道" }, { t: "take", m: "拿；带" }, { t: "see", m: "看见" },
            { t: "come", m: "来" }, { t: "think", m: "想；认为" }, { t: "look", m: "看" }, { t: "want", m: "想要" },
            { t: "give", m: "给" }, { t: "use", m: "使用" }, { t: "find", m: "找到" }, { t: "tell", m: "告诉" },
            { t: "ask", m: "问；请求" }, { t: "seem", m: "似乎" }, { t: "feel", m: "感觉" }, { t: "leave", m: "离开；留下" }
          ]
        },
        {
          id: "words-05",
          title: "常用形容词",
          tip: "形容词常与名词搭配出现，可以边打边在脑中造一个短语。",
          items: [
            { t: "good", m: "好的" }, { t: "new", m: "新的" }, { t: "first", m: "第一的" }, { t: "last", m: "最后的" },
            { t: "long", m: "长的" }, { t: "great", m: "伟大的；很好的" }, { t: "little", m: "小的" }, { t: "own", m: "自己的" },
            { t: "other", m: "其他的" }, { t: "old", m: "老的；旧的" }, { t: "right", m: "正确的；右边" }, { t: "big", m: "大的" },
            { t: "high", m: "高的" }, { t: "different", m: "不同的" }, { t: "small", m: "小的" }, { t: "large", m: "大的" }
          ]
        },
        {
          id: "words-06",
          title: "学术与考试词汇",
          tip: "学术词偏长，注意 -tion / -ment 这类后缀的连续输入。",
          items: [
            { t: "analysis", m: "分析" }, { t: "approach", m: "方法；接近" }, { t: "concept", m: "概念" }, { t: "context", m: "语境；背景" },
            { t: "data", m: "数据" }, { t: "define", m: "定义" }, { t: "evidence", m: "证据" }, { t: "factor", m: "因素" },
            { t: "function", m: "功能；函数" }, { t: "method", m: "方法" }, { t: "period", m: "时期" }, { t: "policy", m: "政策" },
            { t: "process", m: "过程" }, { t: "require", m: "需要；要求" }, { t: "research", m: "研究" }, { t: "theory", m: "理论" }
          ]
        },
        {
          id: "words-07",
          title: "编程词汇",
          tip: "程序员高频词，练熟后写代码与读文档都会更顺手。",
          items: [
            { t: "array", m: "数组" }, { t: "variable", m: "变量" }, { t: "function", m: "函数" }, { t: "object", m: "对象" },
            { t: "string", m: "字符串" }, { t: "boolean", m: "布尔值" }, { t: "callback", m: "回调" }, { t: "promise", m: "异步对象；承诺" },
            { t: "component", m: "组件" }, { t: "database", m: "数据库" }, { t: "instance", m: "实例" }, { t: "interface", m: "接口" },
            { t: "parameter", m: "参数" }, { t: "render", m: "渲染" }, { t: "request", m: "请求" }, { t: "server", m: "服务器" }
          ]
        },
        {
          id: "words-08",
          title: "职场与商务",
          tip: "商务场景常出现双写字母与连字符，落指前先看清拼写。",
          items: [
            { t: "meeting", m: "会议" }, { t: "project", m: "项目" }, { t: "budget", m: "预算" }, { t: "client", m: "客户" },
            { t: "report", m: "报告" }, { t: "schedule", m: "日程" }, { t: "deadline", m: "截止日期" }, { t: "contract", m: "合同" },
            { t: "strategy", m: "策略" }, { t: "feedback", m: "反馈" }, { t: "proposal", m: "提案" }, { t: "revenue", m: "收入" },
            { t: "target", m: "目标" }, { t: "resource", m: "资源" }, { t: "negotiate", m: "谈判" }, { t: "deliver", m: "交付" }
          ]
        }
      ]
    },
    {
      id: "sentences",
      title: "句子练习",
      short: "句子",
      desc: "完整句子与中文翻译对照，练习标点、空格与长句节奏。允许带错继续，但错误会计入准确率。",
      mode: "sentence",
      sequential: false,
      targetWpm: 32,
      levels: [
        {
          id: "sentences-01",
          title: "日常短句",
          tip: "句子练习里空格也是字符，按完单词记得按空格。",
          items: [
            { t: "Good morning, how are you today?", m: "早上好，你今天怎么样？" },
            { t: "I usually walk to work in the morning.", m: "我通常早上步行去上班。" },
            { t: "Could you pass me the water, please?", m: "请把水递给我好吗？" },
            { t: "Let me know when you are ready.", m: "准备好了告诉我。" },
            { t: "The weather is lovely this afternoon.", m: "今天下午天气很好。" },
            { t: "I will call you back in ten minutes.", m: "我十分钟后给你回电话。" },
            { t: "She keeps a notebook beside her bed.", m: "她在床边放着一本笔记本。" },
            { t: "We should leave before the traffic starts.", m: "我们应该在堵车之前出发。" }
          ]
        },
        {
          id: "sentences-02",
          title: "长句练习",
          tip: "长句不要盯着光标，目光提前两三个单词，手会跟得更顺。",
          items: [
            { t: "Learning to type well takes patience, steady practice, and a little curiosity.", m: "学好打字需要耐心、持续的练习和一点好奇心。" },
            { t: "If you keep your hands on the home row, your fingers will find each key faster.", m: "如果双手保持在基准键位上，手指就能更快找到每个键。" },
            { t: "The report was finished on time, although the team had to work through the weekend.", m: "尽管团队不得不周末加班，报告还是按时完成了。" },
            { t: "Small improvements, repeated every day, add up to a surprising amount of progress.", m: "每天重复的小改进会累积成惊人的进步。" },
            { t: "He opened the window, made a cup of tea, and sat down to plan the week ahead.", m: "他打开窗户，泡了杯茶，坐下来规划接下来的一周。" },
            { t: "A clear sentence is more useful than a complicated one that nobody finishes reading.", m: "一句清晰的话，比没人读完的复杂句子更有用。" }
          ]
        },
        {
          id: "sentences-03",
          title: "名言与谚语",
          tip: "引号与句号连在一起时容易漏键，注意句尾的标点。",
          items: [
            { t: "The only way to do great work is to love what you do.", m: "做出伟大工作的唯一方法，是热爱你所做的事。" },
            { t: "Simplicity is the ultimate sophistication.", m: "简洁是终极的复杂。" },
            { t: "Stay hungry, stay foolish.", m: "求知若饥，虚心若愚。" },
            { t: "Well done is better than well said.", m: "做得好胜过说得好。" },
            { t: "Knowledge is power.", m: "知识就是力量。" },
            { t: "Practice makes perfect, but only if the practice is deliberate.", m: "熟能生巧，但前提是有意识的练习。" },
            { t: "The journey of a thousand miles begins with a single step.", m: "千里之行，始于足下。" },
            { t: "What we think, we become.", m: "我们想什么，就会成为什么。" }
          ]
        },
        {
          id: "sentences-04",
          title: "邮件与工作",
          tip: "商务句子讲究标点准确，逗号与句号的位置会影响可读性。",
          items: [
            { t: "Thanks for your quick reply, I will review the draft this afternoon.", m: "感谢你的快速回复，我今天下午会看这份草稿。" },
            { t: "Please find the updated schedule attached to this email.", m: "请查收本邮件附上的最新日程。" },
            { t: "I would like to confirm the meeting time before we invite the client.", m: "在邀请客户之前，我想先确认会议时间。" },
            { t: "Let me know if anything in the proposal needs more detail.", m: "如果提案中有需要补充细节的地方，请告诉我。" },
            { t: "We are slightly behind schedule, but the release date should not change.", m: "我们稍微落后于计划，但发布日期不应改变。" },
            { t: "Could we move the call to Thursday morning at ten?", m: "我们能把电话会议改到周四上午十点吗？" }
          ]
        }
      ]
    }
  ];

  var achievements = [
    { id: "first", name: "初次启程", desc: "完成第一次练习", icon: "play", color: "accent" },
    { id: "wpm30", name: "渐入佳境", desc: "单次速度达到 30 WPM", icon: "bolt", color: "amber" },
    { id: "wpm50", name: "十指如飞", desc: "单次速度达到 50 WPM", icon: "bolt", color: "amber" },
    { id: "wpm70", name: "疾风之手", desc: "单次速度达到 70 WPM", icon: "bolt", color: "rose" },
    { id: "acc100", name: "分毫不差", desc: "单次准确率达到 100%（至少 100 次击键）", icon: "target", color: "teal" },
    { id: "streak3", name: "三日不辍", desc: "连续练习 3 天", icon: "flame", color: "amber" },
    { id: "streak7", name: "七日之约", desc: "连续练习 7 天", icon: "flame", color: "rose" },
    { id: "levels5", name: "初窥门径", desc: "完成 5 个关卡", icon: "check", color: "teal" },
    { id: "levels15", name: "循序渐进", desc: "完成 15 个关卡", icon: "check", color: "teal" },
    { id: "basics", name: "指法入门", desc: "完成全部基础指法关卡", icon: "keyboard", color: "accent" },
    { id: "chars500", name: "积字成章", desc: "累计正确输入 500 个字符", icon: "book", color: "violet" },
    { id: "review", name: "知错能改", desc: "完成一次错词复习", icon: "refresh", color: "violet" }
  ];

  function tr(key, fallback, params) {
    if (!window.I18N) return fallback;
    var value = window.I18N.t(key, params);
    return value === key ? fallback : value;
  }

  function levelKey(courseId, index, field) {
    var n = index + 1 < 10 ? "0" + (index + 1) : String(index + 1);
    return "course." + courseId + ".l" + n + "." + field;
  }

  function buildBaseCourses() {
    var overrides = (window.Store && window.Store.state.courseOverrides) || {};
    return baseCourses.map(function (course) {
      var view = {
        id: course.id,
        title: tr("course." + course.id + ".title", course.title),
        short: tr("course." + course.id + ".short", course.short),
        desc: tr("course." + course.id + ".desc", course.desc),
        mode: course.mode,
        sequential: course.sequential,
        targetWpm: course.targetWpm,
        imported: false,
        builtin: true,
        levels: course.levels.map(function (level, index) {
          return {
            id: level.id,
            title: tr(levelKey(course.id, index, "title"), level.title),
            tip: tr(levelKey(course.id, index, "tip"), level.tip),
            mode: level.mode || course.mode,
            targetWpm: level.targetWpm || course.targetWpm,
            items: level.items
          };
        })
      };
      var override = overrides[course.id];
      if (!override) return view;
      if (override.deleted) return null;
      return applyCourseOverride(view, override);
    }).filter(Boolean);
  }

  // 把用户对内置课程的修改叠加到原始课程上。
  // 关卡保留 baseId，未改名的关卡继续使用当前语言的内置文案。
  function applyCourseOverride(course, override) {
    var baseById = {};
    course.levels.forEach(function (level) { baseById[level.id] = level; });
    var levels = (override.levels || course.levels).map(function (item) {
      var base = item.baseId ? baseById[item.baseId] : (baseById[item.id] || null);
      return {
        id: item.id,
        title: item.title != null ? item.title : (base ? base.title : ""),
        tip: item.tip != null ? item.tip : (base ? base.tip : ""),
        mode: item.mode || (base && base.mode) || override.mode || course.mode,
        targetWpm: item.targetWpm || (base && base.targetWpm) || course.targetWpm,
        items: (item.items || []).map(normalizeItem)
      };
    });
    return {
      id: course.id,
      title: override.title != null ? override.title : course.title,
      short: course.short,
      desc: course.desc,
      mode: override.mode || course.mode,
      sequential: override.sequential != null ? !!override.sequential : course.sequential,
      targetWpm: override.targetWpm || course.targetWpm,
      imported: false,
      builtin: true,
      edited: true,
      levels: levels
    };
  }

  function buildAchievements() {
    return achievements.map(function (def) {
      return {
        id: def.id,
        name: tr("ach." + def.id + ".name", def.name),
        desc: tr("ach." + def.id + ".desc", def.desc),
        icon: def.icon,
        color: def.color
      };
    });
  }

  var customCourseViews = [];
  var courses = [];
  var achievementViews = [];

  function buildImportedCourses(imports) {
    return (imports || []).map(function (pack) {
      var levels = [];
      var words = Array.isArray(pack.words) ? pack.words : [];
      var sentences = Array.isArray(pack.sentences) ? pack.sentences : [];
      var i;
      for (i = 0; i < words.length; i += 20) {
        levels.push({
          id: pack.id + "-w" + (i / 20 + 1),
          title: tr("import.level.words", "单词 · 第 " + (i / 20 + 1) + " 组", { n: i / 20 + 1 }),
          tip: tr("import.level.wordsTip", "来自导入「" + pack.title + "」。先求准确，再慢慢提速。", { title: pack.title }),
          mode: "word",
          targetWpm: 24,
          items: words.slice(i, i + 20)
        });
      }
      for (i = 0; i < sentences.length; i += 6) {
        levels.push({
          id: pack.id + "-s" + (i / 6 + 1),
          title: tr("import.level.sentences", "句子 · 第 " + (i / 6 + 1) + " 组", { n: i / 6 + 1 }),
          tip: tr("import.level.sentencesTip", "句子练习允许打错后继续，按退格可以修正。"),
          mode: "sentence",
          targetWpm: 26,
          items: sentences.slice(i, i + 6)
        });
      }
      return {
        id: pack.id,
        title: pack.title,
        short: tr("import.short", "导入"),
        desc: pack.source
          ? tr("import.descLine", "来源：" + pack.source + "。共 " + words.length + " 个单词、" + sentences.length + " 个句子。", { source: pack.source, words: words.length, sentences: sentences.length })
          : tr("import.descLineNoSource", "共 " + words.length + " 个单词、" + sentences.length + " 个句子。", { words: words.length, sentences: sentences.length }),
        mode: "word",
        sequential: false,
        targetWpm: 24,
        imported: true,
        levels: levels
      };
    }).filter(function (course) { return course.levels.length; });
  }

  function buildCustomCourses(list) {
    return (list || []).map(function (course) {
      return {
        id: course.id,
        title: course.title,
        short: course.short || tr("manage.tag", "自建"),
        desc: course.desc || "",
        mode: course.mode || "word",
        sequential: !!course.sequential,
        targetWpm: course.targetWpm || 24,
        origin: course.origin || "manual",
        sourceImportId: course.sourceImportId || "",
        imported: course.origin === "import",
        custom: true,
        levels: (course.levels || []).map(function (level) {
          return {
            id: level.id,
            title: level.title,
            tip: level.tip || "",
            mode: level.mode || course.mode || "word",
            targetWpm: level.targetWpm || 24,
            items: (level.items || []).map(function (item) {
              return typeof item === "string" ? { t: item, m: "" } : { t: item.t, m: item.m || "" };
            })
          };
        })
      };
    });
  }

  function rebuild() {
    customCourseViews = buildCustomCourses(window.Store.state.customCourses || []);
    courses = buildBaseCourses().concat(customCourseViews);
    achievementViews = buildAchievements();
    window.APP_DATA.courses = courses;
    window.APP_DATA.achievements = achievementViews;
  }

  function refresh() {
    rebuild();
  }

  function makeImportCourse(pack) {
    var built = buildImportedCourses([pack])[0];
    if (!built) return null;
    built.origin = "import";
    built.sourceImportId = pack.id;
    return built;
  }

  // 把旧版 imports 数据迁移成可编辑课程，并刷新视图
  function bootstrap() {
    var state = window.Store.state;
    if (!state.contentMigrated) {
      var list = state.customCourses || [];
      (state.imports || []).forEach(function (pack) {
        var built = buildImportedCourses([pack])[0];
        if (!built) return;
        built.origin = "import";
        built.sourceImportId = pack.id;
        list.push(built);
      });
      state.customCourses = list;
      state.contentMigrated = true;
      window.Store.saveContent();
    }
    refresh();
  }
  function allLevels() {
    var out = [];
    courses.forEach(function (course) {
      course.levels.forEach(function (level, index) {
        out.push({
          course: course,
          level: level,
          index: index,
          total: course.levels.length,
          isLast: index === course.levels.length - 1
        });
      });
    });
    return out;
  }

  function findLevel(levelId) {
    var found = null;
    allLevels().forEach(function (entry) {
      if (entry.level.id === levelId) found = entry;
    });
    return found;
  }

  function nextLevel(levelId) {
    var list = allLevels();
    for (var i = 0; i < list.length; i++) {
      if (list[i].level.id === levelId) return list[i + 1] || null;
    }
    return null;
  }

  function normalizeItem(item) {
    if (typeof item === "string") return { t: item, m: "" };
    return { t: item.t, m: item.m || "" };
  }

  window.APP_DATA = {
    courses: courses,
    achievements: achievementViews,
    allLevels: allLevels,
    findLevel: findLevel,
    nextLevel: nextLevel,
    normalizeItem: normalizeItem,
    bootstrap: bootstrap,
    refresh: refresh,
    makeImportCourse: makeImportCourse
  };
})();
