// Existing portfolio copy translated without rebuilding the document.
const TEXT = {
  "跳到主要内容": "Skip to main content",
  "3D 主页 ↗": "3D studio ↗",
  "视频作品": "Videos",
  "流程实践": "Process",
  "材料入口": "Materials",
  "AIGC 视频创作": "AI Video Production",
  "与视觉工作流": "& Visual Workflows",
  "我是 Petra Aevryx（P. ÆVRYX），拥有 3 年 AI 工具使用经验，聚焦 AI 视频生成与制作、ComfyUI 工作流及 LoRA 实践。从创意、剧本分镜到审片与剪辑，结合生成结果持续迭代；现有《Twenty-Four Frames》98 秒 MV 完整剪辑版、两条足球搞笑短片及《The Bass》崩铁 MMD 成片。": "I’m Petra Aevryx (P. ÆVRYX). I have three years of experience using AI tools, focusing on AI video generation and production, ComfyUI workflows and LoRA practice. I develop ideas, scripts and storyboards, then review and edit generated footage through successive revisions. My work includes the 98-second complete edit of Twenty-Four Frames, two football comedy shorts and the Honkai: Star Rail MMD film The Bass.",
  "观看完整短片 ↘": "Watch the films ↘",
  "查看工作流与材料": "Explore workflows & materials",
  "创作与技术相互连接": "Connecting creative and technical work",
  "短剧创作": "Short-film production",
  "创意、剧本分镜、表演要求与剪辑": "Ideas, scripts, storyboards, performance direction and editing",
  "模型实践": "Working with models",
  "模型调用、工作流搭建与调试": "Model selection and use; building and debugging workflows",
  "流程整理": "Documenting the process",
  "AI 辅助脚本、配置、复核与交接": "AI-assisted scripts, configuration, review and handover",
  "AI 视频生成与制作": "AI Video Generation & Production",
  "先看 MV 完整剪辑版，再看参考创意制作的足球搞笑短片。围绕具体画面目标调用模型，与 Agent 协作完成素材筛选、剪辑和后期。": "Start with the complete MV edit, then explore the football comedy shorts based on reference ideas. I select and use models for specific visual goals, working with agents on footage selection, editing and post-production.",
  "MV · 98 秒": "MV · 98 seconds",
  "完整剪辑版 · v30": "Complete edit · v30",
  "浏览器不支持视频播放，请": "Your browser does not support video playback. Please",
  "打开 MV": "open the MV",
  "以胶卷串起角色一天的经历，将线稿人物与胶片质感场景结合，以音乐组织镜头和情绪。": "A strip of film connects moments from a character’s day. Line-art characters meet film-textured settings, with music shaping the sequence and emotional rhythm.",
  "生成与制作": "Generation & Production",
  "我负责创意、角色视觉设定、分镜、素材筛选与审片；与 Agent 协作确定曲风和歌词方向，使用 Suno 生成、筛选歌曲，结合 Nano Banana Pro、Wan 3.0 和 Kling 生成画面，完成剪辑与后期。": "I developed the concept, character visuals and storyboards, selected footage and reviewed the results. Working with agents, I defined the musical style and lyrical direction, generated and selected songs with Suno, and used Nano Banana Pro, Wan 3.0 and Kling to generate visuals before editing and finishing the film.",
  "按镜头保存参考、提示词、生成素材、费用和修改版本；与 Agent 协作修正合成白边及人物颜色漂移，复查镜头衔接与画面表现。": "I keep shot-level references, prompts, generated footage, costs and revision records. With agents, I corrected white compositing fringes and character colour drift, then reviewed shot continuity and the resulting images.",
  "网页播放 720 × 1280 / 30fps 分享版；1080 × 1920 母版保留。49 个剪辑镜头，非 49 条独立生成视频。个人创作，音乐及制作包含 AI / Agent 协作。": "The web version is 720 × 1280 at 30fps; the 1080 × 1920 master is retained. The edit contains 49 shots, not 49 separately generated videos. This is a personal project, with AI / agent collaboration in the music and production.",
  "查看 MV 与制作说明 →": "View the MV & production notes →",
  "足球题材 AI 搞笑短片": "AI Football Comedy Shorts",
  "26 秒 · 完整短片": "26 seconds · Complete short",
  "打开完整短片": "open the complete short",
  "用采访建立铺垫，让人物从灌木丛中现身，再用赛后反差和文字收尾。将不同生成版本中更完整的台词与更有效的显现镜头组合成一部完整短片。": "An interview sets up the reveal of a character emerging from the bushes, followed by a post-match contrast and a text ending. I combined clearer dialogue and a more effective reveal from different generated versions into one complete short.",
  "720 × 1280 · 竖屏 · AI 足球戏仿": "720 × 1280 · Vertical · AI football parody",
  "64 秒 · 完整短片 · 1080p": "64 seconds · Complete short · 1080p",
  "把赛后采访、更衣室密谋与管理层破门串成一段足球戏仿。人物关门后从愤怒转为坏笑，与队友的庆祝形成反差，再用突如其来的打断完成反转。": "A post-match interview, a dressing-room plot and an interruption by management form a football parody. Behind the closed door, anger turns into a sly smile; the team’s celebration is cut short by an unexpected entrance.",
  "1080 × 1920 · 竖屏 · AI 足球戏仿": "1080 × 1920 · Vertical · AI football parody",
  "参考创意与制作要求": "Reference Ideas & Production Direction",
  "两条短片的创意参考 Instagram 足球搞笑 AI 视频博主。我负责把参考内容转化为镜头、视觉与表演要求，筛选生成素材，判断人物表现及剪辑节奏。": "The ideas for both shorts were inspired by an Instagram creator making AI football comedy. I translated the references into shot, visual and performance requirements, selected generated footage, and judged character performances and editing rhythm.",
  "生成、筛选与后期": "Generation, Selection & Post-production",
  "与 Agent 协作完成剧本整理、Higgsfield / Seedance 2.5 生成执行及 FFmpeg 后期，组合素材、字幕、片尾和音效，保留剧本、生成版本与成片。": "I worked with agents to organise scripts, run generation with Higgsfield / Seedance 2.5, and finish the films with FFmpeg. This included assembling footage, subtitles, end cards and sound effects, while retaining scripts, generated versions and final edits.",
  "查看创作与材料说明 →": "View creative & material notes →",
  "AI 戏仿创作，虚构情节与人物表现为 AI 演绎，非真实采访或比赛记录。人物、球队及品牌来自第三方；创意参考 Instagram 足球搞笑 AI 视频；风格研究参考 @junioraivideos。": "AI-generated parody: the fictional events and performances are not real interviews or match footage. People, teams and brands belong to third parties. Concept references: Instagram AI football comedy videos. Visual-style reference: @junioraivideos.",
  "《The Bass》· 崩铁记忆队": "The Bass · HSR Remembrance Team",
  "以遐蝶、风堇、昔涟和长夜月为角色，通过俯视与正面镜头切换组织表演，完成四角色竖屏 MMD 舞蹈。": "A four-character vertical MMD dance featuring Castorice, Hyacine, Cyrene and Evernight, with overhead and frontal shots creating changes in presentation.",
  "完整成片 · 15.33 秒": "Complete film · 15.33 seconds",
  "打开完整成片": "open the complete film",
  "我的贡献与迭代": "My Contribution & Revisions",
  "我负责角色与视觉要求、构图、表情审阅和版本取舍，与 Agent 协作完成工程操作及后期。制作采用 PMX / VMD 与 Blender，迭代涵盖镜头、光影、手脸接触、风堇眼形和长夜月马尾遮挡等细节。": "I set character and visual requirements, reviewed composition and expressions, and selected versions, working with agents on project operations and post-production. The film uses PMX / VMD and Blender. Revisions covered cameras, lighting, hand-to-face contact, Hyacine’s eye shape and Evernight’s ponytail occlusion.",
  "从审片到成片": "From Review to Final Edit",
  "保留局部短样、完整版本与复查记录，根据镜头检查角色表演和局部接触，选择可用版本并整理交付视频。": "I retain local test clips, full versions and review records, check performances and contact issues shot by shot, select usable versions and organise the delivery video.",
  "本片为 MMD / Blender 渲染作品。另有 13 秒 3D 驱动 AI 动作实验，其制作与材料说明见下方流程实践。": "This is an MMD / Blender render. A separate 13-second experiment in 3D-driven AI motion is described in the production-practice section below.",
  "查看制作与素材署名 →": "View production notes & credits →",
  "角色与模型：米哈游 / HoYoverse；动作与镜头：Snaksil；音乐：DJ Wave - 巴巴贝斯 The Bass；着色预设：小二。相关素材来自第三方。": "Characters and models: miHoYo / HoYoverse. Motion and cameras: Snaksil. Music: DJ Wave — The Bass. Shader preset: Xiao Er (小二). These assets come from third parties.",
  "《雨停之前》": "Before the Rain Stops",
  "以雨夜室内的叙事开场为实践，串联参考设计、生成筛选、电视画面合成与音频接缝处理。": "A narrative opening set indoors on a rainy night, connecting reference design, footage generation and selection, TV-screen compositing and audio-transition work.",
  "叙事开场 · 43 秒": "Narrative opening · 43 seconds",
  "Blender 预演 / AI 生成 / 本地后期": "Blender previs / AI generation / Local post-production",
  "个人项目 · AI 辅助": "Personal project · AI-assisted",
  "打开视频文件": "open the video file",
  "现有开场版本 · 1280 × 720 · 24fps": "Current opening edit · 1280 × 720 · 24fps",
  "43 秒开场片段，声音自然度等细节仍可改进。": "A 43-second opening; voice naturalness and other details still have room for improvement.",
  "我在其中做了什么": "My Role",
  "提出故事与镜头目标，整理视觉参考和生成要求，筛选现有片段；围绕电视画面与声音接缝提出修改目标，并与 AI 助手协作整理后期脚本、参数配置与验证记录。": "I defined story and shot goals, organised visual references and generation requirements, and selected existing clips. I set revision goals for the TV image and audio transitions, working with an AI assistant on post-production scripts, parameter configuration and verification records.",
  "Blender 场景、脚本与流程含 AI 辅助；作品为现有片段，本页未新增生成或重新剪辑。": "The Blender scene, scripts and workflow include AI assistance. This page presents an existing excerpt; no new generation or re-editing was done for this presentation.",
  "这份材料可以看什么": "What the Materials Show",
  "生成素材如何进入合成与后期处理。": "How generated footage enters compositing and post-production.",
  "同一素材下的参数修改、局部对照和输出复核。": "Parameter changes, local comparisons and output review using the same source footage.",
  "输入保护、阶段缓存与缺失产物恢复的历史记录。": "Historical records of input protection, stage caching and recovery of missing outputs.",
  "查看流程与验证说明 →": "View workflow & verification notes →",
  "展开：电视画面修改与参数对照": "Expand: TV-screen revisions & parameter comparisons",
  "已有关键帧对照：左为原片，右为电视画面替换后的输出；用于检查替换范围、文字与电视外壳。": "Existing keyframe comparison: original footage on the left, TV-screen replacement on the right. Used to check the replacement area, text and TV casing.",
  "同一镜头的边缘羽化 1.7 / 2.8px 对照。用于展示参数修改与局部复查，不等于审美优劣结论。": "Edge-feathering comparison at 1.7 / 2.8px in the same shot. This documents a parameter change and local review; it does not establish an aesthetic winner.",
  "模型调用与 ComfyUI 工作流实践": "Model Use & ComfyUI Workflows",
  "围绕具体任务选择模型、搭建生成流程，检查模型依赖与节点兼容，并结合输出结果定位问题、调整参数。": "I select models and build generation workflows for specific tasks, check dependencies and node compatibility, then use the outputs to diagnose issues and adjust parameters.",
  "模型调用": "Model Use",
  "任务选型与依赖配置": "Task selection & dependency setup",
  "流程搭建": "Workflow Building",
  "节点连接与参数设置": "Node connections & parameters",
  "问题排查": "Debugging",
  "兼容性与画面偏差": "Compatibility & visual deviations",
  "结果复核": "Output Review",
  "输出比较与版本记录": "Comparisons & version records",
  "模型选择、流程搭建与调试": "Selecting Models, Building & Debugging Workflows",
  "按任务选择和调用模型，在 ComfyUI 中搭建文生图、图生图及 LoRA 测试链路，配置基模、VAE、采样与输出参数；结合阶段结果排查依赖、节点兼容及画面偏差，迭代提示词与模型强度。下方以角色 LoRA 项目的现有配置展示具体做法。": "I select and use models for each task, build text-to-image, image-to-image and LoRA test workflows in ComfyUI, and configure base models, VAEs, sampling and output settings. I review intermediate results to diagnose dependency, node-compatibility and visual issues, then iterate on prompts and model strength. Existing character-LoRA configurations below illustrate the approach.",
  "本人参与概念与数据整理、参数取舍和结果审阅；配置、检查及文档含 AI 辅助。角色、图源与基础模型来自第三方。": "I contributed to concept and data organisation, parameter decisions and result review. Configuration, checks and documentation include AI assistance. Characters, source images and base models come from third parties.",
  "公开材料与私下材料": "Public & Private Materials",
  "这里可查看角色 LoRA 案例的 JSON 配置、节点结构及复核说明。训练图、模型权重与生成样图保留在私下审阅包中，按需提供。": "The character-LoRA case includes public JSON configurations, node structures and review notes. Training images, model weights and generated samples are retained in a private review package, available on request.",
  "历史样图缺完整逐图执行快照。现有比较是参数探索，不作为通用最优参数或统计评测结论。": "Historical samples do not have complete per-image execution snapshots. These comparisons document parameter exploration, not universally optimal settings or statistical evaluation results.",
  "模型调用与工作流调试过程": "Model Use & Workflow Debugging Process",
  "模型选择与加载": "Select & load models",
  "按任务核对基模、VAE 与 LoRA": "Check base models, VAEs and LoRAs for the task",
  "节点连接与任务配置": "Connect nodes & configure the task",
  "设置提示词、画幅与采样参数": "Set prompts, image dimensions and sampling parameters",
  "分阶段检查与调整": "Check & adjust in stages",
  "排查依赖、节点兼容与画面偏差": "Diagnose dependencies, node compatibility and visual deviations",
  "结果对比与版本记录": "Compare outputs & record versions",
  "调整输入与参数，复核输出": "Adjust inputs and parameters, then review outputs",
  "下方 JSON 以角色 LoRA 测试为例展示节点连接与参数配置，为现有文件阅读副本，不附权重或基础模型；本次未重新运行推理。": "The JSON examples below show node connections and parameters for character-LoRA testing. They are reading copies of existing files, without weights or base models. Inference was not rerun for this presentation.",
  "配置示例：全身与局部 ↗": "Configuration: Full-body & Detail ↗",
  "全身 / 局部概念 · 默认 LoRA 0.8 / 0.8 · JSON": "Full-body / detail concepts · Default LoRA 0.8 / 0.8 · JSON",
  "配置示例：近景与姿态 ↗": "Configuration: Close-up & Pose ↗",
  "近景 / 提示词姿态测试 · LoRA 0.7 / 0.7 · JSON": "Close-up / prompted-pose tests · LoRA 0.7 / 0.7 · JSON",
  "查看依赖、参数与评估边界 →": "View dependencies, parameters & evaluation limits →",
  "把生成过程整理清楚": "Documenting the Generation Process",
  "记录尝试、定位问题，再把修改与复查连起来。以下均来自已有项目与处理记录。": "Record attempts, diagnose issues, and connect revisions with follow-up checks. The examples below come from existing projects and production records.",
  "3D 驱动 AI 动作": "3D-driven AI Motion",
  "已有 13 秒动作视频实践，将 Blender 动作驱动、首帧风格与 AI 视频生成连接起来；围绕发饰干扰进行版本比较、审片与取舍。": "An existing 13-second motion-video experiment connects Blender motion guidance, first-frame styling and AI video generation. I compared versions, reviewed outputs and made selections around interference from a hair accessory.",
  "本人负责需求、风格与成片选择、审片和迭代决策，管线代码含 AI 辅助。使用第三方角色、动作与编舞素材，视频仅供私下审阅。": "I defined requirements, chose the style and final version, reviewed footage and made iteration decisions. The pipeline code includes AI assistance. Third-party characters, motion and choreography were used; the video is available for private review only.",
  "查看贡献与材料说明 →": "View contribution & material notes →",
  "AI 辅助脚本与流程验证": "AI-assisted Scripts & Workflow Verification",
  "拆解与小样": "Breakdown & Small Tests",
  "把目标拆成具体输入、输出和检查点。": "Turn goals into specific inputs, outputs and checkpoints.",
  "脚本与配置": "Scripts & Configuration",
  "使用 Claude Code、Codex 等工具协作调试，整理运行步骤与错误记录。": "Work with Claude Code, Codex and other tools to debug and document run steps and errors.",
  "修改与复核": "Revisions & Follow-up Checks",
  "保留原文件，比较参数与结果，核对产物和依赖。": "Preserve source files, compare parameters and results, and check outputs and dependencies.",
  "归档与交接": "Archiving & Handover",
  "整理 README、结果清单、历史版本与可用范围。": "Organise READMEs, output lists, version history and the limits of what can be used.",
  "作品与材料入口": "Works & Materials",
  "先看视频，再读方法；更完整的结果与过程材料可结合岗位私下提供。": "Watch the videos first, then explore the methods. More detailed results and process materials can be shared privately for relevant roles.",
  "材料": "Material",
  "现在可查看": "Available Now",
  "入口": "Links",
  "98 秒 MV 完整剪辑版、模型与 Agent 协作说明": "98-second complete MV edit; model-use and agent-collaboration notes",
  "观看 MV": "Watch MV",
  "读说明": "Read notes",
  "26 秒完整短片、创作与贡献说明": "26-second complete short; creative and contribution notes",
  "观看短片": "Watch film",
  "64 秒 1080p 完整短片、创作与贡献说明": "64-second complete short in 1080p; creative and contribution notes",
  "15.33 秒完整 MMD 成片、制作与素材署名": "15.33-second complete MMD film; production notes and credits",
  "观看成片": "Watch film",
  "43 秒开场、电视修改对照、流程验证说明": "43-second opening; TV-screen comparisons and workflow-verification notes",
  "观看片段": "Watch excerpt",
  "模型调用与流程搭建说明、JSON 配置示例": "Model-use and workflow-building notes; JSON configuration examples",
  "查看工作流": "View workflows",
  "流程与贡献说明；视频私下提供": "Workflow and contribution notes; video available privately",
  "AI 应用项目": "AI Application Project",
  "公开 Text-to-SQL Agent 代码仓库": "Public Text-to-SQL Agent repository",
  "需要更完整的审阅材料？": "Need More Review Materials?",
  "可提供 LoRA 历史样图、训练记录、13 秒 AI 动作实验视频及更详细的项目说明。": "Historical LoRA samples, training records, the 13-second AI-motion experiment and more detailed project notes are available on request.",
  "邮件联系 P. ÆVRYX ↗": "Email P. ÆVRYX ↗",
  "P. ÆVRYX · AIGC 视觉与工作流": "P. ÆVRYX · AI Visuals & Workflows",
  "材料整理：2026.10 ·": "Materials compiled: Oct 2026 ·",
  "来源与展示范围": "Sources & Display Scope"
};
const ATTR = {
  "主导航": "Main navigation",
  "Twenty-Four Frames，98秒MV完整剪辑版": "Twenty-Four Frames, 98-second complete MV edit",
  "Who Is Yamal?，26秒完整AI戏仿短片": "Who Is Yamal?, 26-second complete AI parody short",
  "Other Areas，64秒1080p完整AI戏仿短片": "Other Areas, 64-second complete AI parody short in 1080p",
  "The Bass，15.33秒崩铁记忆队完整MMD成片": "The Bass, 15.33-second complete HSR Remembrance Team MMD film",
  "雨停之前，43秒现有开场片段": "Before the Rain Stops, current 43-second opening",
  "电视画面替换前后关键帧对照，左侧原片，右侧输出": "TV-screen replacement comparison: original on the left, output on the right",
  "电视边缘羽化1.7和2.8像素对照": "TV-screen edge feathering at 1.7 and 2.8 pixels"
};

import { readLanguage, rememberLanguage, updateLanguageUrl, onLanguageChange } from './language.js?v=20261022';

// Translate text nodes in place: video elements, playback state and anchors stay intact.
const textEntries = [];
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
  acceptNode(node) {
    return node.parentElement.closest('script, style, #portfolio-lang') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
  },
});
while (walker.nextNode()) {
  const node = walker.currentNode;
  const key = node.nodeValue.trim();
  if (Object.hasOwn(TEXT, key)) textEntries.push({ node, zh: node.nodeValue, en: node.nodeValue.replace(key, TEXT[key]) });
}
const attrEntries = [];
for (const element of document.querySelectorAll('[aria-label], img[alt]')) {
  for (const name of ['aria-label', 'alt']) {
    const zh = element.getAttribute(name);
    if (Object.hasOwn(ATTR, zh)) attrEntries.push({ element, name, zh, en: ATTR[zh] });
  }
}
const chineseTitle = document.title;
const meta = document.querySelector('meta[name="description"]');
const chineseDescription = meta.content;
const button = document.getElementById('portfolio-lang');
const languageLinks = [...document.querySelectorAll('a[href]')].filter(a => {
  if (a.hasAttribute('download')) return false;
  const u = new URL(a.href);
  return u.origin === location.origin && (u.pathname === new URL('./', location.href).pathname || /\/(?:portfolio\.html|room\/(?:index\.html|text\.html|mv\.html|short-drama\.html)?)$/.test(u.pathname));
});
let lang = readLanguage('en');
function render(next, persist = false) {
  lang = next;
  for (const entry of textEntries) entry.node.nodeValue = entry[lang];
  for (const entry of attrEntries) entry.element.setAttribute(entry.name, entry[lang]);
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.title = lang === 'zh' ? chineseTitle : 'P. ÆVRYX · AI Video Production & Visual Workflows';
  meta.content = lang === 'zh' ? chineseDescription : 'AI video production and visual workflows by P. ÆVRYX: Twenty-Four Frames, football comedy shorts, The Bass MMD film, Before the Rain Stops, ComfyUI and LoRA practice, and AI-assisted production records.';
  button.textContent = lang === 'zh' ? 'EN' : '中';
  button.lang = lang === 'zh' ? 'en' : 'zh-CN';
  button.setAttribute('aria-label', lang === 'zh' ? 'Switch to English' : '切换为中文');
  button.title = lang === 'zh' ? 'English' : '中文';
  for (const a of languageLinks) { const u = new URL(a.href); u.searchParams.set('lang', lang); a.href = u.href; }
  if (persist) rememberLanguage(lang);
}
button.addEventListener('click', () => render(lang === 'zh' ? 'en' : 'zh', true));
onLanguageChange(next => { render(next); updateLanguageUrl(next); });
render(lang);
