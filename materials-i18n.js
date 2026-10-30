// English translation of the existing detailed material notes.
const TEXT = {"01 · 《一圈》本地开源模型音乐短片":"01 · One Lap — a locally generated music film","02 · MV · Twenty-Four Frames":"02 · MV · Twenty-Four Frames","03 · SOLVANE《静的形状》品牌概念片":"03 · SOLVANE: The Shape of Silence — Spec Film","《一圈》One Lap":"One Lap",
"本地开源模型音乐短片":"Music film made with local open-weight models",
"63 秒预览版 · 完整版约 2 分钟":"63-second preview · Full film approx. 2 minutes",
"2 分钟版 / 63 秒精剪版":"2-minute version / 63-second edit",
"一个女孩从黎明跑到下一个黎明，穿过一座城市。以光线、运动和音乐组织短片。":"A girl runs through a city from one dawn to the next. Light, movement and music shape the film.",
"全部画面在本地生成":"All visuals generated locally",
"全部图像及视频素材使用本地部署的开源模型生成，通过 ComfyUI 完成制作，未调用付费视频生成服务。配乐使用 Suno，另行制作与剪辑。":"All image and video assets were generated with locally deployed open-weight models through ComfyUI, without paid video-generation services. Music was created with Suno and edited separately.",
"画面取舍":"Selecting the images",
"负责概念、视觉设计、分镜与全部创作决策。根据构图、光线、动作表现和角色一致性筛选素材，决定镜头保留、重做或调整方案；在画质与速度之间优先保留画面表现，放弃效果不理想的加速方案。":"I directed the concept, visual design, storyboards and all creative decisions. I selected footage for composition, lighting, movement and character consistency, deciding which shots to keep, regenerate or redesign. Image quality took priority over speed; acceleration variants with weaker results were rejected.",
"模型与 Agent 协作":"Models and agent collaboration",
"在本地 GPU 工作站上，与 Agent 协作搭建、运行和调试 ComfyUI 生产管线。起始画面使用 Krea 2，动态使用 MiniMax H3；根据测试镜头的表现调整模型与处理流程。":"With agents, I built, ran and debugged a ComfyUI production pipeline on a local GPU workstation. Krea 2 supplied starting images and MiniMax H3 generated motion. Model and processing choices followed tests on demanding shots.",
"剪辑与复查":"Editing and review",
"设计画面内转场，依据音乐段落与脚步落点安排剪辑；检查动作流畅度、角色服装、光照方向与转场连续性，根据审片结果修改。":"I designed transitions within the image and edited around musical sections and footfalls. Reviews covered movement, clothing, light direction and continuity across transitions, with revisions guided by the results.",
"此处播放 63 秒预览版；完整版约 2 分钟，可按需提供。":"Watch the 63-second preview here. The full film is approximately 2 minutes and is available on request.",
"观看预览与制作说明 →":"Watch the preview and read the production notes →",
"查看本地制作与画面取舍说明 →":"Read about local production and shot selection →",
"63 秒预览、本地生成与画面取舍说明":"63-second preview, local generation and shot-selection notes",
"查看项目":"View project",
"读说明":"Read notes",
"02 · 《一圈》本地开源模型音乐短片":"02 · One Lap — a locally generated music film",
"《一圈》现可观看 63 秒预览版，完整版约 2 分钟。两个版本均已锁定，本页提供制作说明。":"One Lap is available as a 63-second preview, with a full film of approximately 2 minutes. Both cuts are locked; this page documents the production.",
"《一圈》项目静帧：夕阳下跑向城市的女孩":"One Lap project still: a girl running towards the city at sunset",
"返回工作室":"Back to the studio",
"返回作品入口":"Back to the portfolio",
"制作方式与创作决策":"Production method and creative decisions",
"我是 P. ÆVRYX，拥有 3 年 AI 工具使用经验，聚焦 AI 视频生成与制作、ComfyUI 工作流及 LoRA 实践。从创意、剧本分镜到审片与剪辑，结合生成结果持续迭代；现有 SOLVANE《静的形状》汽车品牌概念片、《Twenty-Four Frames》98 秒 MV 完整剪辑版，以及本地开源模型音乐短片《一圈》。":"I’m P. ÆVRYX. I have three years of experience using AI tools, focusing on AI video production, ComfyUI workflows and LoRA practice. I develop concepts and storyboards, review generated footage and refine the edit. Selected work includes the SOLVANE automotive spec film The Shape of Silence, Twenty-Four Frames and One Lap, a music film made with local open-weight models.",
"本网站展示既有作品与工作流材料，网站整理没有新增训练、生成或付费媒体调用。较长作品采用轻量预览，标注时长指原作。材料涵盖 SOLVANE《静的形状》30 秒汽车品牌概念片、《Twenty-Four Frames》98 秒 MV 完整剪辑版、《一圈》本地开源模型音乐短片、《雨停之前》的开场与局部对照，以及 ComfyUI、LoRA 和流程调试说明。":"This site presents existing work and production records: the SOLVANE automotive spec film, Twenty-Four Frames, the locally generated music film One Lap, Before the Rain Stops, and ComfyUI, LoRA and workflow notes. Longer videos use lightweight previews. One Lap offers a 63-second preview; the full film is approximately 2 minutes.",

  "← 返回作品入口": "← Back to portfolio",
  "项目与工作流说明": "Project & Workflow Notes",
  "从已有文件和记录出发，说明做了什么、可以查看什么，以及材料适用的范围。": "Notes drawn from existing files and records: what I did, what is available to review, and the limits of the materials.",
  "98 秒竖屏 MV 完整剪辑版，以胶卷串起角色一天的经历。本站播放现有 v32 的约 20 秒预览，1080p 母版保留；49 为剪辑镜头数量。": "A 98-second complete vertical MV edit, with a strip of film connecting moments from a character’s day. The player uses a roughly 20-second excerpt from v32; the 1080p master is retained. The number 49 refers to shots in the edit.",
  "我的贡献与 Agent 协作": "My Contribution & Agent Collaboration",
  "负责创意、角色视觉设定、分镜、生成素材筛选与审片。与 Agent 协作确定曲风和歌词方向，使用 Suno 生成并筛选歌曲；按镜头调用 Nano Banana Pro、Wan 3.0 和 Kling，结合音乐组织剪辑，与 Agent 协作修正白边及人物颜色漂移。": "I developed the concept, character visuals and storyboards, selected generated footage and reviewed the results. With agents, I defined the musical style and lyrical direction, generated and selected songs with Suno, used Nano Banana Pro, Wan 3.0 and Kling for individual shots, edited to the music, and corrected white fringes and character colour drift.",
  "保留参考、提示词、费用和修改版本。此处为个人创作与现有制作记录，不包含商业投放或传播效果数据。": "References, prompts, costs and revision versions are retained. These are records of a personal project and its production; they do not include commercial campaign or audience-performance data.",
  "播放 MV 与阅读说明 →": "Play the MV & read the notes →",
  "01 · AI 短剧创作": "01 · AI Short-film Production",
  "从参考到镜头": "From References to Shots",
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
  "04 · 《雨停之前》": "04 · Before the Rain Stops",
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
  "05 · 模型调用与 ComfyUI 工作流实践": "05 · Model Use & ComfyUI Workflows",
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
  "06 · 3D 驱动 AI 动作": "06 · 3D-driven AI Motion",
  "现有 13.042 秒视频实践连接第三方 VRM／VMD、Blender 动作驱动、首帧风格、AI 生成、审片与本地后期。已有版本迭代针对驱动发夹对参考发饰的干扰，调整驱动材质可见性与参考要求后进行比较。": "An existing 13.042-second video experiment connects third-party VRM / VMD assets, Blender motion guidance, first-frame styling, AI generation, review and local post-production. Version comparisons addressed interference from a hair clip in the motion-guidance render, adjusting material visibility and reference requirements before comparing the results.",
  "本人负责需求、风格与成片选择、审片及迭代决策；管线代码含 AI 辅助。使用 VRoid 样例角色，动作来源为 winglayer／猪肉屑炳，编舞来源为我是君君呀。该项目不主张原创角色建模、原创动作或全部代码独立开发。": "I defined requirements, selected the style and final version, reviewed footage and made iteration decisions. The pipeline code includes AI assistance. It uses a VRoid sample character; motion credits: winglayer / 猪肉屑炳; choreography: 我是君君呀. The project does not claim original character modelling, original motion or that all code was developed independently.",
  "音乐记录为私用，动作资料不允许再分发，AI 使用许可未明确。故公开入口仅展示流程与贡献说明；视频及逐秒检查图可在约定的私下审阅范围内提供，不上传原角色、动作与音乐文件。": "The music is recorded as private-use material, the motion assets do not allow redistribution, and permission for AI use is unclear. The public page therefore shows workflow and contribution notes only. The video and second-by-second inspection images may be shared for private review within an agreed scope; source character, motion and music files are not uploaded.",
  "联系索取私下审阅材料 →": "Request private review materials →",
  "来源与展示范围": "Sources & Display Scope",
  "《雨停之前》的原始视频来自创作者通过 Higgsfield 生成并提供的素材，使用项目中已有的 AI 参考图；没有额外插入第三方电影片段或购买音乐。部分早期参考图的精确生成工具版本未完整留存，作品使用仍受原服务条款约束。": "The source videos for Before the Rain Stops were generated through Higgsfield and provided by the creator, using AI reference images already in the project. No additional third-party film clips or purchased music were inserted. Exact generation-tool versions for some early reference images were not fully retained; use of the work remains subject to the original services’ terms.",
  "LoRA 训练与 13 秒 AI 动作实验涉及第三方图源、模型、动作或音乐，完整过程材料保留在私下审阅包中。《The Bass》MMD 成片按上述署名展示，未上传原模型、动作文件或着色预设。公开说明不代表对第三方内容拥有独占版权或无条件商业许可。": "LoRA training and the 13-second AI-motion experiment involve third-party images, models, motion or music; full process materials are retained in private review packages. One Lap local-model music film is shown with the credits above, without source models, motion files or shader presets. Public descriptions do not imply exclusive copyright in third-party content or unrestricted commercial permission.",
  "更详细的脚本、配置、日志及历史清单可按需审阅。离线精选包为阅读材料，未包含完整运行环境，不作为开箱即用或跨机器复现承诺。": "More detailed scripts, configurations, logs and historical inventories can be reviewed on request. The offline selection is reading material without a complete runtime environment; it is not a promise of out-of-the-box operation or reproducibility across machines.",
  "此入口用于展示既有实践；未经收件人约定，不会发送招聘材料或代为投递。": "This page presents existing practice. Recruitment materials will not be sent or applications submitted without prior agreement with the recipient.",
  "P. ÆVRYX · 项目与工作流说明": "P. ÆVRYX · Project & Workflow Notes",
  "返回作品入口": "Back to portfolio",
  "3D 主页 ↗": "3D studio ↗",
  "跳到主要内容": "Skip to main content",
  "。": ".",
  "SOLVANE 索澜《静的形状》": "SOLVANE · The Shape of Silence",
  "汽车品牌概念片 · 虚构品牌": "Automotive brand concept film · Fictional brand",
  "让安静被看见：声波线随城市噪声跳动，勾勒天际线，在静音中归于平直，最终化为贯穿式车灯。": "Making silence visible: a line moves with city noise, traces the skyline, settles into silence and becomes the car’s light blade.",
  "15 秒剪辑预览 · 原片 30 秒": "15-second cutdown preview · 30-second original",
  "导演 / AI 视频制作（与 Agent 协作） · 2026.10": "Direction / AI video production with agents · October 2026",
  "围绕“让安静被看见”构思 30 秒品牌片，以音轨驱动的声波线串联城市噪声、陆家嘴天际线、静音与贯穿式车灯，完成“安静，有了形状”的视觉表达及中英双语文案。": "A 30-second concept film built around making silence visible. An audio-driven line connects city noise, the Lujiazui skyline, silence and the car’s light blade, supported by bilingual copy: “Silence, given shape.”",
  "与 Agent 协作设定双色猎装车造型，使用 Nano Banana Pro、Google Flow / Veo 3.1 制作参考图与镜头素材，检查车辆外观、地标及画面瑕疵；车门镜头两次失败后，改用车外视角与首尾帧方案。": "With agents, I developed a two-tone shooting-brake concept and used Nano Banana Pro and Google Flow / Veo 3.1 for reference images and shots. Reviews covered vehicle appearance, landmarks and artifacts. After two failed interior door takes, we switched to an exterior shot with first- and last-frame guidance.",
  "与 Agent 协作使用 Python、FFmpeg 完成声波图形、画面合成及声音剪辑；根据审片结果调整音乐收尾、去除车内人物，并重剪 15 秒版以突出产品。": "Working with agents in Python and FFmpeg, I developed the waveform graphics, compositing and sound edit. Review-led revisions adjusted the musical ending, removed an occupant from a car window and recut the 15-second version to give the product more screen time.",
  "输出 30 秒主片及无字版、15 秒横竖版、6 秒短版、4K 主视觉，以及不同响度目标的混音与音乐、音效、环境声分轨。": "Deliverables include a 30-second master and text-free version, 15-second landscape and portrait cuts, a 6-second bumper, 4K key visuals, mixes for different loudness targets, and separate music, effects and ambience stems.",
  "个人概念广告，品牌与车型为虚构设定，未实际投放。此处展示现有 15 秒剪辑版的轻量预览；30 秒完整版及更详细的制作材料可按需提供。": "A personal spec ad for a fictional brand and vehicle concept, with no live campaign. This page shows a lightweight preview of the existing 15-second cutdown. The full 30-second film and further production materials are available on request.",
  "创意与表达": "Concept and expression",
  "画面生成与镜头修正": "Generation and shot revisions",
  "声音、合成与 Agent 协作": "Sound, compositing and agent collaboration",
  "多版本制作与交付": "Versions and deliverables",
  "观看广告与制作说明 →": "Watch the ad and explore the process →",
  "查看广告项目与材料说明 →": "Read the ad project and material notes →",
  "点击播放，可拖动进度条、调整音量或全屏观看。": "Press play. Use the timeline to seek, adjust the volume or enter full screen.",
  "← 返回 3D 工作室": "← Back to the 3D studio",
  "前往文字作品页 →": "Open the text portfolio →",
  "主视觉": "Key visual",
  "《静的形状》15 秒广告预览": "The Shape of Silence, 15-second ad preview",
  "我是 P. ÆVRYX，拥有 3 年 AI 工具使用经验，聚焦 AI 视频生成与制作、ComfyUI 工作流及 LoRA 实践。从创意、剧本分镜到审片与剪辑，结合生成结果持续迭代；现有 SOLVANE《静的形状》汽车品牌概念片、《Twenty-Four Frames》98 秒 MV 完整剪辑版及《The Bass》崩铁 MMD 成片。": "I’m P. ÆVRYX. I have three years of experience using AI tools, focusing on AI video production, ComfyUI workflows and LoRA practice. I develop ideas and storyboards, review generated footage and refine the edit. Selected work includes the SOLVANE automotive spec film The Shape of Silence, the 98-second complete edit of Twenty-Four Frames and the HSR MMD film The Bass.",
  "从汽车品牌概念片到音乐影像，围绕具体画面目标调用模型，与 Agent 协作完成镜头生成、素材筛选、剪辑和后期。": "From an automotive spec film to a music video, I select models for specific visual goals and work with agents on shot generation, footage selection, editing and finishing.",
  "观看广告": "Watch the ad",
  "01 · SOLVANE《静的形状》品牌概念片": "01 · SOLVANE: The Shape of Silence — Spec Film",
  "本网站展示既有作品与工作流材料，网站整理没有新增训练、生成或付费媒体调用。较长作品采用轻量预览，标注时长指原作。材料涵盖 SOLVANE《静的形状》30 秒汽车品牌概念片、《Twenty-Four Frames》98 秒 MV 完整剪辑版、《The Bass》MMD、《雨停之前》的开场与局部对照，以及 ComfyUI、LoRA 和流程调试说明。": "This site presents existing work and workflow materials; assembling the site involved no new training, generation or paid media calls. Longer works use lightweight previews, with original durations stated separately. Materials cover the 30-second SOLVANE automotive spec film The Shape of Silence, the 98-second complete edit of Twenty-Four Frames, One Lap local-model music film, the opening and local comparisons for Before the Rain Stops, and ComfyUI, LoRA and workflow-debugging notes."
};

import { readLanguage, rememberLanguage, updateLanguageUrl, onLanguageChange, localisePageLinks } from './language.js?v=20261030-lap-video-v1';

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
