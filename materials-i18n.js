// English translation of the existing detailed material notes.
const TEXT = {
  "← 返回作品入口": "← Back to portfolio",
  "项目与工作流说明": "Project & Workflow Notes",
  "从已有文件和记录出发，说明做了什么、可以查看什么，以及材料适用的范围。": "Notes drawn from existing files and records: what I did, what is available to review, and the limits of the materials.",
  "98 秒竖屏 MV 完整剪辑版，以胶卷串起角色一天的经历。本测试站播放现有 v32 的约 20 秒预览，1080p 母版保留；49 为剪辑镜头数量。": "A 98-second complete vertical MV edit, with a strip of film connecting moments from a character’s day. The test player uses a roughly 20-second excerpt from v32; the 1080p master is retained. The number 49 refers to shots in the edit.",
  "我的贡献与 Agent 协作": "My Contribution & Agent Collaboration",
  "负责创意、角色视觉设定、分镜、生成素材筛选与审片。与 Agent 协作确定曲风和歌词方向，使用 Suno 生成并筛选歌曲；按镜头调用 Nano Banana Pro、Wan 3.0 和 Kling，结合音乐组织剪辑，与 Agent 协作修正白边及人物颜色漂移。": "I developed the concept, character visuals and storyboards, selected generated footage and reviewed the results. With agents, I defined the musical style and lyrical direction, generated and selected songs with Suno, used Nano Banana Pro, Wan 3.0 and Kling for individual shots, edited to the music, and corrected white fringes and character colour drift.",
  "保留参考、提示词、费用和修改版本。此处为个人创作与现有制作记录，不包含商业投放或传播效果数据。": "References, prompts, costs and revision versions are retained. These are records of a personal project and its production; they do not include commercial campaign or audience-performance data.",
  "播放 MV 与阅读说明 →": "Play the MV & read the notes →",
  "01 · AI 短剧创作": "01 · AI Short-film Production",
  "《Who Is Yamal?》为 26.125 秒完整短片，720 × 1280；《Other Areas》为 64.053 秒完整短片，1080 × 1920。测试首页展示两部短片的前 20 秒预览，均可手动播放。": "Who Is Yamal? is a complete 26.125-second short at 720 × 1280. Other Areas is a complete 64.053-second short at 1080 × 1920. The test portfolio page provides the first 20 seconds of each short for manual playback.",
  "从参考到镜头": "From References to Shots",
  "《Who Is Yamal?》以采访、人物显现和赛后反差组织笑点，将不同版本的台词与显现镜头组合。《Other Areas》围绕采访、更衣室密谋和破门打断设计反转，用关门后的表情变化、队友庆祝及剪辑停顿衔接叙事。": "Who Is Yamal? builds its joke around an interview, a character reveal and a post-match contrast, combining dialogue and reveal shots from different versions. Other Areas connects an interview, a dressing-room plot and an interruption at the door, using a change of expression after the door closes, the team’s celebration and editing pauses to develop the reversal.",
  "创意参考 Instagram 足球搞笑 AI 视频博主，本人负责生成目标、人物表演要求、视觉参考、审片与版本选择；与 Agent 协作整理剧本、调用 Higgsfield / Seedance 2.5 生成镜头，以及完成字幕、片尾、音效与 FFmpeg 剪辑。保留剧本、镜头要求、生成版本和成片，便于核对迭代过程。": "The ideas were inspired by an Instagram creator making AI football comedy. I defined generation goals, character-performance requirements and visual references, reviewed footage and selected versions. With agents, I organised scripts, generated shots through Higgsfield / Seedance 2.5, and completed subtitles, end cards, sound effects and FFmpeg editing. Scripts, shot requirements, generated versions and final edits are retained for reviewing the iteration process.",
  "两部均为 AI 足球戏仿，人物表现和情节为虚构演绎，非真实采访或比赛记录。人物、球队及品牌来自第三方；创意参考 Instagram 足球搞笑 AI 视频；风格研究参考 @junioraivideos。本页展示的是本人和 Agent 协作完成的生成与剪辑结果。": "Both films are AI football parodies: the performances and events are fictional, not real interviews or match footage. People, teams and brands belong to third parties. Concept references: Instagram AI football comedy videos. Visual-style reference: @junioraivideos. This page presents the generation and editing results produced through my collaboration with agents.",
  "返回两部完整短片 →": "Back to both complete shorts →",
  "02 · 《The Bass》崩铁记忆队 MMD": "02 · The Bass — HSR Remembrance Team MMD",
  "已完成的四角色 MMD 舞蹈，15.333 秒、720 × 1280、30fps，H.264 / AAC。首页展示完整成片，可手动播放。": "A completed four-character MMD dance: 15.333 seconds, 720 × 1280, 30fps, H.264 / AAC. The complete delivery video is available on the portfolio page and can be played manually.",
  "制作与个人贡献": "Production & My Contribution",
  "角色为《崩坏：星穹铁道》的遐蝶、风堇、昔涟和长夜月，采用 PMX / VMD 与 Blender 制作，围绕俯视和正面镜头组织角色表演。本人负责角色与视觉要求、构图、表情审阅和版本取舍，与 Agent 协作完成工程操作及后期。": "The film features Castorice, Hyacine, Cyrene and Evernight from Honkai: Star Rail, using PMX / VMD and Blender, with overhead and frontal shots shaping the presentation. I set character and visual requirements, reviewed composition and expressions, and selected versions, working with agents on project operations and post-production.",
  "迭代涵盖光影、手脸接触、风堇眼形和长夜月马尾遮挡等细节，保留局部短样、历史版本、工程与复查记录。网页使用已完成的交付视频。": "Revisions covered lighting, hand-to-face contact, Hyacine’s eye shape and Evernight’s ponytail occlusion. Local test clips, earlier versions, project files and review records are retained. The website uses the completed delivery video.",
  "素材署名": "Asset Credits",
  "角色与模型：米哈游 / HoYoverse。": "Characters and models: miHoYo / HoYoverse.",
  "动作与镜头：Snaksil。": "Motion and cameras: Snaksil.",
  "音乐：DJ Wave - 巴巴贝斯 The Bass。": "Music: DJ Wave — The Bass.",
  "着色预设：小二。": "Shader preset: Xiao Er (小二).",
  "相关角色、模型、动作、音乐和预设来自第三方。本片展示的是素材整合、镜头与视觉调整及审片迭代，不主张原创角色建模或原创动作设计。另有 13 秒 3D 驱动 AI 动作实验，材料与制作范围单独说明。": "The characters, models, motion, music and presets come from third parties. This film demonstrates asset integration, camera and visual adjustments, and review-driven iteration; it does not claim original character modelling or motion design. The separate 13-second experiment in 3D-driven AI motion has its own material and production-scope notes.",
  "返回完整成片 →": "Back to the complete film →",
  "03 · 《雨停之前》": "03 · Before the Rain Stops",
  "现有 43.083 秒开场由两段已有 AI 视频串联，后期版本整理了电视画面替换、音频接缝处理和统一导出流程。原始视频及历史版本保留；当前展示的是后期流程预览。": "The existing 43.083-second opening joins two previously generated AI clips. The post-production version organises TV-screen replacement, audio-transition work and a consistent export workflow. Source videos and earlier versions are retained; the current presentation is a post-production workflow preview.",
  "工作链条": "Production Sequence",
  "故事与参考设计 → 预演／镜头要求 → AI 视频生成与筛选 → 局部画面合成 → 声音接缝处理 → 规格检查与版本归档。": "Story and reference design → previs / shot requirements → AI video generation and selection → local image compositing → audio-transition work → specification checks and version archiving.",
  "贡献与实现": "Contribution & Implementation",
  "本人提出创作、筛选与修改目标，整理素材和约束并参与审片；Blender 场景、脚本和流程包含 AI 辅助。后期流程集成第三方开源工具的音频混合与视频拼接能力，本地适配电视画面、音频修正与导出规格。": "I defined creative, selection and revision goals, organised footage and constraints, and took part in reviews. The Blender scene, scripts and workflow include AI assistance. Post-production integrates audio-mixing and video-assembly features from third-party open-source tools, with local adaptations for the TV image, audio corrections and export specifications.",
  "其中使用的": "The workflow uses this ",
  "OpenMontage 固定版本": "pinned OpenMontage revision",
  "为外部开源上游，许可为 AGPL-3.0。它是工具集成来源，不属于本人原创项目。": " as an external open-source dependency under AGPL-3.0. It is a source for tool integration, not my original project.",
  "已有验证记录": "Existing Verification Records",
  "输出为 1280 × 720、24fps、1034 帧，BT.709，48kHz 双声道。": "Output: 1280 × 720, 24fps, 1,034 frames, BT.709, 48kHz stereo audio.",
  "历史同机两次复跑，解码视频帧与 PCM 音频哈希一致；不推及跨机器、跨版本确定性。": "Two historical reruns on the same machine produced matching hashes for decoded video frames and PCM audio. This does not establish determinism across machines or versions.",
  "修改电视边缘羽化参数后，记录变化区域与阶段缓存行为。": "Changed regions and stage-cache behaviour were recorded after adjusting the TV-edge feathering parameter.",
  "保留缺少输入时提前报错、修正配置后恢复，以及缺失衍生产物的重建记录。": "Records cover early errors for missing inputs, recovery after configuration fixes, and rebuilding missing derived outputs.",
  "原始输入通过 SHA256 核对，输出边界用于保护源文件。": "Source inputs were checked using SHA256; output-path boundaries were used to protect the source files.",
  "上述为历史技术记录；本次仅制作轻量预览，未重跑原后期验证。技术检查不代表声音自然度或最终审美验收通过。现有电视合成针对近固定镜头，不属于通用遮挡追踪方案。": "These are historical technical records. This test release only creates lightweight previews; the original post-production verification was not rerun. Technical checks do not establish acceptance of voice naturalness or the final aesthetic result. The TV compositing targets a nearly fixed shot; it is not a general occlusion-tracking solution.",
  "返回视频与对照图 →": "Back to the video & comparison images →",
  "04 · 模型调用与 ComfyUI 工作流实践": "04 · Model Use & ComfyUI Workflows",
  "围绕具体任务选择和调用模型，在 ComfyUI 中搭建、调整文生图、图生图及 LoRA 测试链路；配置基模、VAE、采样与输出参数，结合阶段结果排查依赖、节点兼容与画面偏差。": "I select and use models for specific tasks, build and adjust text-to-image, image-to-image and LoRA test workflows in ComfyUI, and configure base models, VAEs, sampling and output settings. I use intermediate results to diagnose dependency, node-compatibility and visual issues.",
  "图像生成实践涉及 SDXL 系列、Anima、Krea 2 等模型；视频生成实践涉及 Seedance 2.5、MiniMax H3、Wan 2.x 系列。按实际使用方式分别记录平台生成输入与 ComfyUI 工作流参数。": "Image-generation practice includes the SDXL family, Anima and Krea 2. Video-generation practice includes Seedance 2.5, MiniMax H3 and the Wan 2.x family. Platform-generation inputs and ComfyUI workflow parameters are recorded separately according to how each tool was used.",
  "角色 LoRA 案例保留了 15 对训练图文、1500 步／10 epoch 训练记录、16 张历史评估样图及推理配置。本人参与数据与概念整理、参数取舍和结果审阅；配置、检查及文档含 AI 辅助。": "The character-LoRA case retains 15 training image–caption pairs, records of 1,500 steps over 10 epochs, 16 historical evaluation samples and inference configurations. I contributed to data and concept organisation, parameter decisions and result review. Configuration, checks and documentation include AI assistance.",
  "角色 LoRA 案例配置示例": "Character-LoRA Configuration Examples",
  "文件": "File",
  "用途与默认值": "Purpose & Defaults",
  "全身与局部配置 JSON": "Full-body & detail JSON",
  "全身与局部概念；final epoch10，模型／CLIP 强度均为 0.8。": "Full-body and detail concepts; final epoch10 checkpoint, with model / CLIP strengths both set to 0.8.",
  "近景与姿态配置 JSON": "Close-up & pose JSON",
  "近景身份与提示词姿态测试；final epoch10，模型／CLIP 强度均为 0.7。": "Close-up identity and prompted-pose tests; final epoch10 checkpoint, with model / CLIP strengths both set to 0.7.",
  "示例使用 CheckpointLoaderSimple、LoraLoader、CLIPTextEncode、EmptyLatentImage、KSampler、VAEDecode 和 SaveImage，展示模型与 LoRA 加载、条件配置、采样解码及输出链路。近景／姿态配置通过提示词测试，没有使用骨骼或 ControlNet 姿态控制节点。": "The examples use CheckpointLoaderSimple, LoraLoader, CLIPTextEncode, EmptyLatentImage, KSampler, VAEDecode and SaveImage, showing model and LoRA loading, conditioning, sampling, decoding and output. The close-up / pose configuration tests poses through prompts; it does not use skeleton or ControlNet pose-control nodes.",
  "依赖与运行范围": "Dependencies & Execution Scope",
  "基础模型引用：": "Base-model reference: ",
  "LoRA 引用：": "LoRA reference: ",
  "，为历史训练的 final epoch10 权重。": ", the final epoch10 weights from the historical training run.",
  "本页仅提供现有工作流 JSON 阅读副本，不提供上述模型文件、训练图或样图。": "This page provides reading copies of existing workflow JSON files only, without the referenced model files, training images or samples.",
  "需自行具备兼容 ComfyUI 环境和合法可用的依赖；本次没有重新导入或执行 GPU 推理。": "A compatible ComfyUI environment and legitimately available dependencies are required to run them. No re-import or GPU inference was performed for this presentation.",
  "评估材料怎么理解": "How to Interpret the Evaluation Materials",
  "历史记录比较检查点、LoRA 强度、提示词详细程度，以及身份、服装、姿态和局部细节的取舍。16 张样图没有完整逐图执行快照，不能将此比较表述为严格控制实验、通用最优参数或统计 benchmark。": "Historical records compare checkpoints, LoRA strengths and prompt detail, including trade-offs in identity, clothing, pose and local detail. The 16 sample images do not have complete per-image execution snapshots. This comparison should not be described as a strictly controlled experiment, universally optimal settings or a statistical benchmark.",
  "第三方角色、服装、图源及模型的权利不因本项目而转移。样图与完整训练材料仅供约定范围内的私下审阅；公开 JSON 不附模型或图像许可。": "This project does not transfer rights in third-party characters, clothing, source images or models. Samples and complete training materials are available only for private review within an agreed scope. The public JSON files do not include model or image licences.",
  "返回工作流入口 →": "Back to workflows →",
  "05 · 3D 驱动 AI 动作": "05 · 3D-driven AI Motion",
  "现有 13.042 秒视频实践连接第三方 VRM／VMD、Blender 动作驱动、首帧风格、AI 生成、审片与本地后期。已有版本迭代针对驱动发夹对参考发饰的干扰，调整驱动材质可见性与参考要求后进行比较。": "An existing 13.042-second video experiment connects third-party VRM / VMD assets, Blender motion guidance, first-frame styling, AI generation, review and local post-production. Version comparisons addressed interference from a hair clip in the motion-guidance render, adjusting material visibility and reference requirements before comparing the results.",
  "本人负责需求、风格与成片选择、审片及迭代决策；管线代码含 AI 辅助。使用 VRoid 样例角色，动作来源为 winglayer／猪肉屑炳，编舞来源为我是君君呀。该项目不主张原创角色建模、原创动作或全部代码独立开发。": "I defined requirements, selected the style and final version, reviewed footage and made iteration decisions. The pipeline code includes AI assistance. It uses a VRoid sample character; motion credits: winglayer / 猪肉屑炳; choreography: 我是君君呀. The project does not claim original character modelling, original motion or that all code was developed independently.",
  "音乐记录为私用，动作资料不允许再分发，AI 使用许可未明确。故公开入口仅展示流程与贡献说明；视频及逐秒检查图可在约定的私下审阅范围内提供，不上传原角色、动作与音乐文件。": "The music is recorded as private-use material, the motion assets do not allow redistribution, and permission for AI use is unclear. The public page therefore shows workflow and contribution notes only. The video and second-by-second inspection images may be shared for private review within an agreed scope; source character, motion and music files are not uploaded.",
  "联系索取私下审阅材料 →": "Request private review materials →",
  "来源与展示范围": "Sources & Display Scope",
  "本网站整理既有作品与工作流材料，没有新增训练、生成或付费媒体调用。本测试站长视频仅播放约 20 秒预览，以下时长描述原作。材料涵盖《Twenty-Four Frames》98 秒 MV 完整剪辑版、《Who Is Yamal?》《Other Areas》两部完整短片、《The Bass》崩铁 MMD 完整成片、项目介绍、《雨停之前》的现有开场及局部对照、ComfyUI 配置示例和整理后的模型调用、流程搭建与调试说明。": "This website organises existing work and workflow materials. Assembling it did not involve new training, generation or paid media calls. Longer videos on this test site are roughly 20-second previews; durations below describe the original projects. Materials cover the 98-second complete edit of Twenty-Four Frames; the complete shorts Who Is Yamal? and Other Areas; the complete HSR MMD film The Bass; project introductions; the existing opening and local comparisons for Before the Rain Stops; ComfyUI configuration examples; and notes on model use, workflow building and debugging.",
  "《雨停之前》的原始视频来自创作者通过 Higgsfield 生成并提供的素材，使用项目中已有的 AI 参考图；没有额外插入第三方电影片段或购买音乐。部分早期参考图的精确生成工具版本未完整留存，作品使用仍受原服务条款约束。": "The source videos for Before the Rain Stops were generated through Higgsfield and provided by the creator, using AI reference images already in the project. No additional third-party film clips or purchased music were inserted. Exact generation-tool versions for some early reference images were not fully retained; use of the work remains subject to the original services’ terms.",
  "LoRA 训练与 13 秒 AI 动作实验涉及第三方图源、模型、动作或音乐，完整过程材料保留在私下审阅包中。《The Bass》MMD 成片按上述署名展示，未上传原模型、动作文件或着色预设。公开说明不代表对第三方内容拥有独占版权或无条件商业许可。": "LoRA training and the 13-second AI-motion experiment involve third-party images, models, motion or music; full process materials are retained in private review packages. The Bass MMD film is shown with the credits above, without source models, motion files or shader presets. Public descriptions do not imply exclusive copyright in third-party content or unrestricted commercial permission.",
  "更详细的脚本、配置、日志及历史清单可按需审阅。离线精选包为阅读材料，未包含完整运行环境，不作为开箱即用或跨机器复现承诺。": "More detailed scripts, configurations, logs and historical inventories can be reviewed on request. The offline selection is reading material without a complete runtime environment; it is not a promise of out-of-the-box operation or reproducibility across machines.",
  "此入口用于展示既有实践；未经收件人约定，不会发送招聘材料或代为投递。": "This page presents existing practice. Recruitment materials will not be sent or applications submitted without prior agreement with the recipient.",
  "P. ÆVRYX · 项目与工作流说明": "P. ÆVRYX · Project & Workflow Notes",
  "返回作品入口": "Back to portfolio",
  "3D 主页 ↗": "3D studio ↗",
  "跳到主要内容": "Skip to main content",
  "。": "."
};

import { readLanguage, rememberLanguage, updateLanguageUrl, onLanguageChange, localisePageLinks } from './language.js?v=20261022-language-fix-v1';

// Keep existing anchors, download elements and inline code intact.
const entries = [];
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
  acceptNode(node) {
    return node.parentElement.closest('script, style, #materials-lang') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
  },
});
while (walker.nextNode()) {
  const node = walker.currentNode;
  const key = node.nodeValue.trim();
  if (Object.hasOwn(TEXT, key)) entries.push({ node, zh: node.nodeValue, en: node.nodeValue.replace(key, TEXT[key]) });
}
const button = document.getElementById('materials-lang');
const nav = document.querySelector('.materials-nav');
const meta = document.querySelector('meta[name="description"]');
const zhTitle = document.title;
const zhDescription = meta.content;
let lang = readLanguage('en');
function render(next, persist = false) {
  lang = next;
  for (const entry of entries) entry.node.nodeValue = entry[lang];
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.title = lang === 'zh' ? zhTitle : 'Project & Workflow Notes · P. ÆVRYX';
  meta.content = lang === 'zh' ? zhDescription : 'Project contributions, production records, ComfyUI and LoRA configurations, dependencies, credits and material scope for P. ÆVRYX’s existing work.';
  nav.setAttribute('aria-label', lang === 'zh' ? '材料导航' : 'Materials navigation');
  button.textContent = lang === 'zh' ? 'EN' : '中';
  button.lang = lang === 'zh' ? 'en' : 'zh-CN';
  button.setAttribute('aria-label', lang === 'zh' ? 'Switch to English' : '切换为中文');
  button.title = lang === 'zh' ? 'English' : '中文';
  localisePageLinks(lang);
  if (persist) rememberLanguage(lang); else updateLanguageUrl(lang);
}
button.addEventListener('click', () => render(lang === 'zh' ? 'en' : 'zh', true));
onLanguageChange(next => { if (next !== lang) render(next); });
render(lang);
