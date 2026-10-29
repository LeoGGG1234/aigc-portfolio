// Existing portfolio copy translated without rebuilding the document.
const TEXT = {"《一圈》One Lap":"One Lap",
"本地开源模型音乐短片":"Music film made with local open-weight models",
"项目静帧 · 暂不提供视频播放":"Project still · Video not currently available",
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
"当前仅展示项目静帧与制作说明，不提供视频播放或下载。":"This page currently shows a project still and production notes, without video playback or downloads.",
"查看静帧与制作说明 →":"View the still and production notes →",
"查看本地制作与画面取舍说明 →":"Read about local production and shot selection →",
"项目静帧、本地生成与画面取舍说明":"Project still, local generation and shot-selection notes",
"查看项目":"View project",
"读说明":"Read notes",
"02 · 《一圈》本地开源模型音乐短片":"02 · One Lap — a locally generated music film",
"本页展示《一圈》的项目静帧。短片包含 2 分钟版与 63 秒精剪版，目前不在网站提供视频播放。":"This page presents a still from One Lap. The project includes a two-minute version and a 63-second edit; video is not currently available on this site.",
"《一圈》项目静帧：夕阳下跑向城市的女孩":"One Lap project still: a girl running towards the city at sunset",
"返回工作室":"Back to the studio",
"返回作品入口":"Back to the portfolio",
"制作方式与创作决策":"Production method and creative decisions",
"我是 P. ÆVRYX，拥有 3 年 AI 工具使用经验，聚焦 AI 视频生成与制作、ComfyUI 工作流及 LoRA 实践。从创意、剧本分镜到审片与剪辑，结合生成结果持续迭代；现有 SOLVANE《静的形状》汽车品牌概念片、《Twenty-Four Frames》98 秒 MV 完整剪辑版，以及本地开源模型音乐短片《一圈》。":"I’m P. ÆVRYX. I have three years of experience using AI tools, focusing on AI video production, ComfyUI workflows and LoRA practice. I develop concepts and storyboards, review generated footage and refine the edit. Selected work includes the SOLVANE automotive spec film The Shape of Silence, Twenty-Four Frames and One Lap, a music film made with local open-weight models.",
"本网站展示既有作品与工作流材料，网站整理没有新增训练、生成或付费媒体调用。较长作品采用轻量预览，标注时长指原作。材料涵盖 SOLVANE《静的形状》30 秒汽车品牌概念片、《Twenty-Four Frames》98 秒 MV 完整剪辑版、《一圈》本地开源模型音乐短片、《雨停之前》的开场与局部对照，以及 ComfyUI、LoRA 和流程调试说明。":"This site presents existing work and production records: the SOLVANE automotive spec film, Twenty-Four Frames, the locally generated music film One Lap, Before the Rain Stops, and ComfyUI, LoRA and workflow notes. Longer videos use lightweight previews. One Lap currently has a still and notes only.",

  "跳到主要内容": "Skip to main content",
  "3D 主页 ↗": "3D studio ↗",
  "视频作品": "Videos",
  "流程实践": "Process",
  "材料入口": "Materials",
  "AIGC 视频创作": "AI Video Production",
  "与视觉工作流": "& Visual Workflows",
  "观看视频预览 ↘": "Watch video previews ↘",
  "查看工作流与材料": "Explore workflows & materials",
  "创作与技术相互连接": "Connecting creative and technical work",
  "短剧创作": "Short-film production",
  "创意、剧本分镜、表演要求与剪辑": "Ideas, scripts, storyboards, performance direction and editing",
  "模型实践": "Working with models",
  "模型调用、工作流搭建与调试": "Model selection and use; building and debugging workflows",
  "流程整理": "Documenting the process",
  "AI 辅助脚本、配置、复核与交接": "AI-assisted scripts, configuration, review and handover",
  "AI 视频生成与制作": "AI Video Generation & Production",
  "MV · 20 秒预览": "MV · 20-second preview",
  "预览节选 · v32": "Preview excerpt · v32",
  "浏览器不支持视频播放，请": "Your browser does not support video playback. Please",
  "打开 MV": "open the MV",
  "以胶卷串起角色一天的经历，将线稿人物与胶片质感场景结合，以音乐组织镜头和情绪。": "A strip of film connects moments from a character’s day. Line-art characters meet film-textured settings, with music shaping the sequence and emotional rhythm.",
  "生成与制作": "Generation & Production",
  "我负责创意、角色视觉设定、分镜、素材筛选与审片；与 Agent 协作确定曲风和歌词方向，使用 Suno 生成、筛选歌曲，结合 Nano Banana Pro、Wan 3.0 和 Kling 生成画面，完成剪辑与后期。": "I developed the concept, character visuals and storyboards, selected footage and reviewed the results. Working with agents, I defined the musical style and lyrical direction, generated and selected songs with Suno, and used Nano Banana Pro, Wan 3.0 and Kling to generate visuals before editing and finishing the film.",
  "按镜头保存参考、提示词、生成素材、费用和修改版本；与 Agent 协作修正合成白边及人物颜色漂移，复查镜头衔接与画面表现。": "I keep shot-level references, prompts, generated footage, costs and revision records. With agents, I corrected white compositing fringes and character colour drift, then reviewed shot continuity and the resulting images.",
  "网页播放 720 × 1280 / 30fps 分享版；1080 × 1920 母版保留。49 个剪辑镜头，非 49 条独立生成视频。个人创作，音乐及制作包含 AI / Agent 协作。": "The web version is 720 × 1280 at 30fps; the 1080 × 1920 master is retained. The edit contains 49 shots, not 49 separately generated videos. This is a personal project, with AI / agent collaboration in the music and production.",
  "查看 MV 与制作说明 →": "View the MV & production notes →",
  "20 秒 · 预览片段": "20 seconds · Preview excerpt",
  "打开预览片段": "open the complete short",
  "用采访建立铺垫，让人物从灌木丛中现身，再用赛后反差和文字收尾。将不同生成版本中更完整的台词与更有效的显现镜头组合成一部完整短片。": "An interview sets up the reveal of a character emerging from the bushes, followed by a post-match contrast and a text ending. I combined clearer dialogue and a more effective reveal from different generated versions into one complete short.",
  "参考创意与制作要求": "Reference Ideas & Production Direction",
  "生成、筛选与后期": "Generation, Selection & Post-production",
  "与 Agent 协作完成剧本整理、Higgsfield / Seedance 2.5 生成执行及 FFmpeg 后期，组合素材、字幕、片尾和音效，保留剧本、生成版本与成片。": "I worked with agents to organise scripts, run generation with Higgsfield / Seedance 2.5, and finish the films with FFmpeg. This included assembling footage, subtitles, end cards and sound effects, while retaining scripts, generated versions and final edits.",
  "查看创作与材料说明 →": "View creative & material notes →",
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
  "叙事开场 · 20 秒预览": "Narrative opening · 20-second preview",
  "Blender 预演 / AI 生成 / 本地后期": "Blender previs / AI generation / Local post-production",
  "个人项目 · AI 辅助": "Personal project · AI-assisted",
  "打开视频文件": "open the video file",
  "现有开场版本 · 1280 × 720 · 24fps": "Current opening edit · 1280 × 720 · 24fps",
  "43 秒开场片段，声音自然度等细节仍可改进。": "A 43-second opening; voice naturalness and other details still have room for improvement.",
  "我在其中做了什么": "My Role",
  "提出故事与镜头目标，整理视觉参考和生成要求，筛选现有片段；围绕电视画面与声音接缝提出修改目标，并与 AI 助手协作整理后期脚本、参数配置与验证记录。": "I defined story and shot goals, organised visual references and generation requirements, and selected existing clips. I set revision goals for the TV image and audio transitions, working with an AI assistant on post-production scripts, parameter configuration and verification records.",
  "Blender 场景、脚本与流程含 AI 辅助；作品为现有片段，本页仅截取预览，原版完整视频保留。": "The Blender scene, scripts and workflow include AI assistance. This page provides a preview excerpt. No new generation was performed; the original full video is retained.",
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
  "20 秒 MV 预览、模型与 Agent 协作说明": "20-second MV preview; model-use and agent-collaboration notes",
  "观看 MV": "Watch MV",
  "读说明": "Read notes",
  "20 秒预览、创作与贡献说明": "20-second preview; creative and contribution notes",
  "观看短片": "Watch film",
  "15.33 秒完整 MMD 成片、制作与素材署名": "15.33-second complete MMD film; production notes and credits",
  "观看成片": "Watch film",
  "20 秒开场预览、电视修改对照、流程验证说明": "20-second opening preview; TV-screen comparisons and workflow-verification notes",
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
  "来源与展示范围": "Sources & Display Scope",
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
const ATTR = {"《一圈》项目静帧：夕阳下跑向城市的女孩":"One Lap project still: a girl running towards the city at sunset",
  "主导航": "Main navigation",
  "Twenty-Four Frames，98秒MV完整剪辑版": "Twenty-Four Frames, 98-second complete MV edit",
  "The Bass，15.33秒崩铁记忆队完整MMD成片": "The Bass, 15.33-second complete HSR Remembrance Team MMD film",
  "雨停之前，43秒现有开场片段": "Before the Rain Stops, current 43-second opening",
  "电视画面替换前后关键帧对照，左侧原片，右侧输出": "TV-screen replacement comparison: original on the left, output on the right",
  "电视边缘羽化1.7和2.8像素对照": "TV-screen edge feathering at 1.7 and 2.8 pixels"
};

import { readLanguage, rememberLanguage, updateLanguageUrl, onLanguageChange, localisePageLinks } from './language.js?v=20261029-one-lap-v1';

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
let lang = readLanguage('en');
function render(next, persist = false) {
  lang = next;
  for (const entry of textEntries) entry.node.nodeValue = entry[lang];
  for (const entry of attrEntries) entry.element.setAttribute(entry.name, entry[lang]);
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.title = lang === 'zh' ? chineseTitle : 'P. ÆVRYX · AI Video Production & Visual Workflows';
  meta.content = lang === 'zh' ? chineseDescription : 'AI video production and visual workflows by P. ÆVRYX: SOLVANE: The Shape of Silence, Twenty-Four Frames, One Lap local-model music film, Before the Rain Stops, ComfyUI and LoRA practice, and AI-assisted production records.';
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
