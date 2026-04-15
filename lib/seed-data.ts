import { type FeedVideoItem, type StoreShape, type VideoComment, type VideoTemplate } from "@/lib/types";

type SeedDescriptor = {
  slug: string;
  titleEn: string;
  titleZh: string;
  summaryEn?: string;
  summaryZh?: string;
  recommendationReasonEn?: string;
  recommendationReasonZh?: string;
  useCasesEn?: string[];
  useCasesZh?: string[];
  trendLabelEn?: string;
  trendLabelZh?: string;
  remixDifficulty?: "easy" | "medium" | "advanced";
  collection?: string;
  featured?: boolean;
  breakdownStepsEn?: string[];
  breakdownStepsZh?: string[];
  quickTweaksEn?: string[];
  quickTweaksZh?: string[];
  promptSubjectEn?: string;
  promptSubjectZh?: string;
  promptSettingEn?: string;
  promptSettingZh?: string;
  promptMotionEn?: string;
  promptMotionZh?: string;
  promptCameraEn?: string;
  promptCameraZh?: string;
  promptFinishEn?: string;
  promptFinishZh?: string;
  promptEn: string;
  promptZh: string;
  tags: string[];
  videoUrl?: string;
  posterUrl?: string;
  isExternalAsset: boolean;
};

const descriptorPool: SeedDescriptor[] = [
  {
    slug: "miniature-city",
    titleEn: "Miniature Future City",
    titleZh: "微缩未来之城",
    promptEn:
      "A Lego-scale miniature futuristic city on a tabletop, tiny maglev cars gliding between compact towers with slightly jerky stop-motion rhythm, windows clicking on one by one across the skyline, highly readable and cinematic.",
    promptZh:
      "一个桌面上的乐高尺度未来城市，微型磁悬浮汽车在楼宇之间滑行，窗户逐个亮起，整体像停格动画一样清晰可读、很有电影感。",
    tags: ["city", "miniature", "stop-motion"],
    videoUrl: "/media/share/placeholder.svg",
    posterUrl: "/media/share/placeholder.svg",
    isExternalAsset: false,
  },
  {
    slug: "lofi-bedroom-loop",
    titleEn: "Lo-fi Bedroom Loop",
    titleZh: "Lo-fi 卧室循环",
    promptEn:
      "A cozy 2D lo-fi bedroom at dusk, a girl writing in a notebook with gentle rhythmic head nodding, steam rising from a ceramic tea mug, rain sliding down the window, calm loop timing.",
    promptZh:
      "一个黄昏时分的 2D lo-fi 卧室，女孩写字时轻轻点头，茶杯热气升腾，雨滴从窗上滑落，整体是很平静的循环氛围。",
    tags: ["lofi", "loop", "cozy"],
    videoUrl: "/media/share/placeholder.svg",
    posterUrl: "/media/share/placeholder.svg",
    isExternalAsset: false,
  },
  {
    slug: "seed-tree-timelapse",
    titleEn: "Seed to Tree Time-lapse",
    titleZh: "种子到大树延时",
    promptEn:
      "A tiny personified seed pushing through dark soil and rapidly growing into a majestic tree within a single continuous shot, warm healing mood and clean stylized growth animation.",
    promptZh:
      "一颗拟人化的小种子从泥土里钻出，并在一个连续镜头里迅速长成大树，氛围温暖治愈，整体是干净的风格化生长动画。",
    tags: ["growth", "timelapse", "nature"],
    videoUrl: "/media/share/placeholder.svg",
    posterUrl: "/media/share/placeholder.svg",
    isExternalAsset: false,
  },
  {
    slug: "iridescent-silk-ribbons",
    titleEn: "Iridescent Silk Ribbons",
    titleZh: "虹彩丝带流光",
    promptEn:
      "Multi-layered translucent iridescent silk ribbons floating in a dark void, flowing and intertwining like slow ocean waves, luxurious minimalist motion design.",
    promptZh:
      "多层半透明虹彩丝带漂浮在黑暗空间里，像缓慢海浪一样交织流动，是一种奢华又极简的动态设计。",
    tags: ["abstract", "luxury", "motion"],
    videoUrl: "/media/share/placeholder.svg",
    posterUrl: "/media/share/placeholder.svg",
    isExternalAsset: false,
  },
  {
    slug: "storybook-reveal",
    titleEn: "Storybook Reveal",
    titleZh: "立体故事书展开",
    promptEn:
      "An illustrated pop-up storybook opening by itself on a wooden desk, layered paper forests and tiny houses rising upward from the pages with delicate handcrafted paper texture.",
    promptZh:
      "一本插画立体故事书在木桌上自动打开，纸质森林和小房子从书页中升起，带着细腻的纸张手工质感。",
    tags: ["paper", "story", "fantasy"],
    videoUrl: "/media/share/placeholder.svg",
    posterUrl: "/media/share/placeholder.svg",
    isExternalAsset: false,
  },
  {
    slug: "stained-glass-koi",
    titleEn: "Stained Glass Koi Dream",
    titleZh: "彩窗锦鲤梦境",
    promptEn:
      "A koi fish composition made from luminous stained glass pieces, dreamlike floating glass pond, glowing seams and refracted light moving elegantly across the frame.",
    promptZh:
      "由发光彩色玻璃拼成的锦鲤在梦境般的玻璃池中漂浮，玻璃接缝发光，折射光在画面中优雅流动。",
    tags: ["glass", "koi", "art"],
    videoUrl: "/media/share/placeholder.svg",
    posterUrl: "/media/share/placeholder.svg",
    isExternalAsset: false,
  },
  {
    slug: "clockwork-macro",
    titleEn: "Clockwork Macro",
    titleZh: "机械微距广告",
    promptEn:
      "A precision clockwork automaton in moody macro close-up, polished brass textures, tiny gears twitching into alignment and premium industrial editorial lighting.",
    promptZh:
      "一个精密机械装置的微距镜头，黄铜质感细腻，小齿轮轻轻联动，整体像高级工业广告片。",
    tags: ["macro", "product", "industrial"],
    videoUrl: "/media/share/placeholder.svg",
    posterUrl: "/media/share/placeholder.svg",
    isExternalAsset: false,
  },
  {
    slug: "chalk-cosmos",
    titleEn: "Blackboard Cosmos",
    titleZh: "黑板宇宙粉笔动画",
    promptEn:
      "A hand-drawn chalk universe coming alive across a dark classroom blackboard, planets sketching themselves into existence with dusty chalk lines and playful educational motion.",
    promptZh:
      "一个手绘粉笔宇宙在黑板上逐渐活起来，行星和星座被粉笔线条勾勒出来，带着粉尘感和轻松的教育氛围。",
    tags: ["chalk", "education", "playful"],
    videoUrl: "/media/share/placeholder.svg",
    posterUrl: "/media/share/placeholder.svg",
    isExternalAsset: false,
  },
  {
    slug: "embroidered-landscape",
    titleEn: "Embroidered Landscape",
    titleZh: "刺绣山河短片",
    promptEn:
      "A handcrafted embroidered landscape animation, stitched mountains and clouds gently shifting as if the fabric itself is breathing, poetic and tactile.",
    promptZh:
      "一个手工刺绣山河动画，缝线做出的山脉和云朵像布料在呼吸一样轻轻移动，整体诗意又有触感。",
    tags: ["textile", "craft", "poetic"],
    videoUrl: "/media/share/placeholder.svg",
    posterUrl: "/media/share/placeholder.svg",
    isExternalAsset: false,
  },
  {
    slug: "jellyfish-ink-dream",
    titleEn: "Jellyfish Ink Dream",
    titleZh: "水母墨迹梦境",
    promptEn:
      "Dreamlike jellyfish forms unfolding in an inky fluid world, soft drifting motion and premium underwater abstraction made for mood-heavy creator feeds.",
    promptZh:
      "梦境般的水母在墨迹流动的空间中展开，动作柔和漂浮，很适合情绪感很强的内容流。",
    tags: ["mood", "ink", "underwater"],
    videoUrl: "/media/share/placeholder.svg",
    posterUrl: "/media/share/placeholder.svg",
    isExternalAsset: false,
  },
  {
    slug: "origami-creature",
    titleEn: "Origami Creature Loop",
    titleZh: "折纸生物循环",
    promptEn:
      "An origami sea creature gliding through a minimal paper ocean, every fin flap defined by precise folded paper geometry, poetic and clean.",
    promptZh:
      "一只折纸海洋生物在极简纸海中滑行，每次摆动都保留清晰的折纸几何感，整体干净而诗意。",
    tags: ["origami", "paper", "brand"],
    videoUrl: "/media/share/placeholder.svg",
    posterUrl: "/media/share/placeholder.svg",
    isExternalAsset: false,
  },
  {
    slug: "shadow-puppet-caravan",
    titleEn: "Shadow Puppet Caravan",
    titleZh: "皮影驼队夜行",
    promptEn:
      "A moonlit desert caravan told as a traditional shadow puppet performance, articulated paper-cut silhouettes moving across a glowing stage.",
    promptZh:
      "一个月夜沙漠驼队被做成传统皮影戏，剪纸人物和骆驼在发光幕布上缓缓移动。",
    tags: ["shadow", "heritage", "silhouette"],
    videoUrl: undefined,
    posterUrl: "/media/share/placeholder.svg",
    isExternalAsset: false,
  },
  {
    slug: "ai-glasses-train",
    titleEn: "AI Glasses Train",
    titleZh: "智能眼镜地铁时刻",
    promptEn:
      "A stylish young woman sitting by the window of a futuristic commuter train, wearing transparent AI smart glasses, with city lights drifting outside.",
    promptZh:
      "一位时髦年轻女性坐在未来感通勤列车窗边，戴着透明 AI 智能眼镜，城市灯光在窗外缓缓掠过。",
    tags: ["fashion", "train", "glasses"],
    isExternalAsset: true,
  },
  {
    slug: "robot-cooking-couple",
    titleEn: "Robot Cooking Couple",
    titleZh: "厨房机器人情侣做饭",
    promptEn:
      "A warm modern kitchen at golden hour, a couple cooking together while a compact countertop cooking robot assists beside them.",
    promptZh:
      "金色傍晚的现代厨房里，一对情侣一起做饭，台面上的小型烹饪机器人在旁边协助。",
    tags: ["kitchen", "robot", "lifestyle"],
    isExternalAsset: true,
  },
  {
    slug: "golden-retriever-door",
    titleEn: "Golden Retriever at Smart Door",
    titleZh: "金毛守在智能家门口",
    promptEn:
      "A beautiful golden retriever waiting by a sleek futuristic front door, morning light moving softly across polished wood.",
    promptZh:
      "一只漂亮的金毛守在未来感家门口，晨光在光洁木地板上缓缓移动。",
    tags: ["dog", "home", "smart-door"],
    isExternalAsset: true,
  },
  {
    slug: "cat-transparent-tablet",
    titleEn: "Cat With Transparent Tablet",
    titleZh: "猫和透明平板",
    promptEn:
      "A fluffy cat sitting on a minimalist desk beside an unfolded transparent tablet, soft daylight and refined product styling.",
    promptZh:
      "一只毛茸茸的猫坐在极简桌面上，旁边是一块展开的透明平板，光线柔和，产品感很强。",
    tags: ["cat", "tablet", "minimal"],
    isExternalAsset: true,
  },
  {
    slug: "ai-beauty-device",
    titleEn: "AI Beauty Device Mirror Shot",
    titleZh: "AI 美容仪镜前自拍",
    promptEn:
      "A fashionable young woman in a softly lit bathroom mirror scene using a sleek AI skincare device with luxury beauty campaign atmosphere.",
    promptZh:
      "一位时髦年轻女性在柔光浴室镜前使用 AI 美容仪，整体是奢华美妆广告片氛围。",
    tags: ["beauty", "mirror", "luxury"],
    isExternalAsset: true,
  },
  {
    slug: "rooftop-foldable-phone",
    titleEn: "Rooftop Foldable Phone",
    titleZh: "天台全息折叠手机",
    promptEn:
      "A confident young man on a city rooftop using a foldable phone with a subtle holographic interface, city skyline at dusk.",
    promptZh:
      "一位自信的年轻人站在城市天台上使用带全息界面的折叠手机，背景是黄昏天际线。",
    tags: ["phone", "rooftop", "urban"],
    isExternalAsset: true,
  },
  {
    slug: "dog-beach-collar",
    titleEn: "Dog on Beach With Smart Collar",
    titleZh: "海边智能项圈狗狗",
    promptEn:
      "A joyful dog running on a clean beach at sunrise, wearing a premium smart tracking collar, energetic and uplifting.",
    promptZh:
      "一只快乐的狗在日出海边奔跑，戴着高端智能追踪项圈，整体很有能量感。",
    tags: ["dog", "beach", "fitness"],
    isExternalAsset: true,
  },
  {
    slug: "future-laptop-cafe",
    titleEn: "Future Laptop Cafe",
    titleZh: "咖啡馆未来笔记本",
    promptEn:
      "A stylish woman in a sunlit cafe working on an ultra-thin futuristic laptop, steam rising from an espresso cup.",
    promptZh:
      "一位时髦女性坐在阳光咖啡馆里使用超薄未来笔记本，浓缩咖啡的热气在旁边升起。",
    tags: ["cafe", "laptop", "productivity"],
    isExternalAsset: true,
  },
  {
    slug: "family-projector-night",
    titleEn: "Family Projector Night",
    titleZh: "全家投影电影夜",
    promptEn:
      "A beautiful family living room during movie night with a smart projector wall and warm cinematic ambient light.",
    promptZh:
      "一个温馨家庭的电影夜，客厅里智能投影打在整面墙上，光线柔和有电影感。",
    tags: ["family", "projector", "home"],
    isExternalAsset: true,
  },
  {
    slug: "ai-earbuds-rain-run",
    titleEn: "AI Earbuds Rain Run",
    titleZh: "雨中 AI 耳机跑步",
    promptEn:
      "A fit young woman paused mid-stride on a rain-washed urban street wearing premium AI earbuds and subtle interface accents.",
    promptZh:
      "一位身材利落的年轻女性停在刚下过雨的城市街道上，戴着高级 AI 耳机，画面有细微界面点缀。",
    tags: ["running", "earbuds", "rain"],
    isExternalAsset: true,
  },
  {
    slug: "elder-smart-display",
    titleEn: "Grandfather Smart Display Call",
    titleZh: "老人智能屏视频通话",
    promptEn:
      "An elderly man at a bright dining table using a slim smart display for a family video call, emotional and refined.",
    promptZh:
      "一位老人坐在明亮餐桌旁，用纤薄智能屏和家人视频通话，情绪温暖且克制。",
    tags: ["elder", "display", "family"],
    isExternalAsset: true,
  },
  {
    slug: "luxury-ev-dog",
    titleEn: "Luxury EV With Sleeping Dog",
    titleZh: "豪华电车与熟睡狗狗",
    promptEn:
      "The interior of a luxury electric car parked under evening city light, with a sleeping dog in the back seat and ambient cabin glow.",
    promptZh:
      "一辆豪华电动车停在夜晚城市灯光下，后座有一只熟睡的狗，车内氛围灯轻柔发亮。",
    tags: ["car", "dog", "mobility"],
    isExternalAsset: true,
  },
  {
    slug: "home-robot-unboxing",
    titleEn: "Home Robot Unboxing",
    titleZh: "家用机器人开箱",
    promptEn:
      "A woman opening the box of a beautifully designed home assistant robot on a dining table with polished lifestyle styling.",
    promptZh:
      "一位女性在餐桌上拆开一台设计优雅的家用机器人，整体是打磨过的生活方式广告风格。",
    tags: ["robot", "unboxing", "home"],
    isExternalAsset: true,
  },
  {
    slug: "shiba-laundry-room",
    titleEn: "Shiba in Smart Laundry Room",
    titleZh: "智能洗衣房里的柴犬",
    promptEn:
      "A shiba inu sitting proudly in a beautifully designed smart laundry room beside a futuristic washer-dryer unit.",
    promptZh:
      "一只柴犬骄傲地坐在一个设计很美的智能洗衣房里，旁边是未来感洗烘机。",
    tags: ["shiba", "laundry", "home-appliance"],
    isExternalAsset: true,
  },
  {
    slug: "ai-ring-portrait",
    titleEn: "AI Ring Portrait",
    titleZh: "AI 戒指时尚人像",
    promptEn:
      "A close-up fashion portrait of a woman wearing an AI ring that projects a delicate floating interface, sculpted light and premium beauty styling.",
    promptZh:
      "一张女性时尚特写人像，手上戴着会投射细腻浮动界面的 AI 戒指，灯光雕塑感很强。",
    tags: ["ring", "fashion", "beauty"],
    isExternalAsset: true,
  },
  {
    slug: "teen-drone-cat",
    titleEn: "Teen Drone Builder",
    titleZh: "少年做无人机 猫围观",
    promptEn:
      "A teenage boy assembling a tiny advanced drone on a bedroom workbench while a curious cat watches nearby.",
    promptZh:
      "一个少年在卧室工作台上组装小型无人机，一只好奇的猫在旁边围观。",
    tags: ["drone", "teen", "cat"],
    isExternalAsset: true,
  },
  {
    slug: "plane-translation-earbud",
    titleEn: "Plane Translation Earbud",
    titleZh: "飞机上翻译耳机",
    promptEn:
      "A chic traveler by the plane window wearing a smart translation earbud, with a minimal translation interface appearing softly.",
    promptZh:
      "一位时髦旅客坐在飞机窗边，戴着智能翻译耳机，旁边浮现极简翻译界面。",
    tags: ["travel", "earbud", "plane"],
    isExternalAsset: true,
  },
  {
    slug: "smart-speaker-hero",
    titleEn: "Smart Speaker Hero",
    titleZh: "智能音箱 Hero Shot",
    promptEn:
      "A beautifully designed smart speaker placed on a sculptural side table in a high-end living room with slow moving light.",
    promptZh:
      "一个设计精美的智能音箱放在高端客厅的雕塑边桌上，光线缓慢移动，画面极简高级。",
    tags: ["speaker", "product", "hero-shot"],
    isExternalAsset: true,
  },
  {
    slug: "delivery-robot-door",
    titleEn: "Delivery Robot Arrival",
    titleZh: "送货机器人到家门口",
    promptEn:
      "A child and a dog standing at the doorway as a sleek delivery robot arrives on the front path in warm late-afternoon light.",
    promptZh:
      "一个孩子和一只狗站在门口，看着一台流线型送货机器人在傍晚暖光中靠近。",
    tags: ["robot", "delivery", "family"],
    isExternalAsset: true,
  },
  {
    slug: "chef-ai-oven",
    titleEn: "Chef With AI Oven",
    titleZh: "主厨与 AI 烤箱",
    promptEn:
      "A chef in a dark restaurant kitchen standing beside a precision AI oven, with controlled steam and premium culinary-tech atmosphere.",
    promptZh:
      "一位主厨站在暗色餐厅厨房里，旁边是一台精密 AI 烤箱，蒸汽克制、氛围高级。",
    tags: ["chef", "oven", "restaurant"],
    isExternalAsset: true,
  },
  {
    slug: "sunrise-light-bedroom",
    titleEn: "Sunrise Light Bedroom",
    titleZh: "卧室日出光装置",
    promptEn:
      "A woman stretching beside her bed while a sunrise simulation light glows on the nightstand in a clean modern bedroom.",
    promptZh:
      "一位女性在床边伸展，床头柜上的日出模拟灯在现代卧室里缓缓发亮。",
    tags: ["wellness", "bedroom", "light"],
    isExternalAsset: true,
  },
  {
    slug: "corgi-bike-basket",
    titleEn: "Corgi Bike Basket",
    titleZh: "车筐里的柯基",
    promptEn:
      "A corgi sitting in a bicycle basket on a stylish smart-city street, with soft morning light and cheerful premium composition.",
    promptZh:
      "一只柯基坐在自行车车筐里，背景是时髦的智能城市街道，晨光柔和，构图明快高级。",
    tags: ["corgi", "bike", "street"],
    isExternalAsset: true,
  },
  {
    slug: "ar-lens-grocery",
    titleEn: "AR Grocery Lenses",
    titleZh: "超市 AR 隐形眼镜",
    promptEn:
      "A young man in a beautifully designed grocery aisle selecting produce while using subtle AR contact-lens assistance.",
    promptZh:
      "一位年轻男性在设计精致的超市货架间挑选水果，同时使用低调的 AR 隐形眼镜辅助。",
    tags: ["ar", "retail", "grocery"],
    isExternalAsset: true,
  },
  {
    slug: "sofa-foldable-tablet",
    titleEn: "Sofa Foldable Tablet",
    titleZh: "沙发折叠平板时刻",
    promptEn:
      "A woman relaxing on a sofa with a cat beside her, holding a foldable home tablet in a beautifully styled living room.",
    promptZh:
      "一位女性躺在沙发上，身边有一只猫，手里拿着可折叠家用平板，客厅布置很漂亮。",
    tags: ["tablet", "cat", "living-room"],
    isExternalAsset: true,
  },
  {
    slug: "smart-helmet-rider",
    titleEn: "Smart Helmet Rider",
    titleZh: "智能头盔骑行者",
    promptEn:
      "A stylish cyclist wearing a premium smart bicycle helmet at a city intersection, with clean urban mobility energy.",
    promptZh:
      "一位时髦骑行者戴着高级智能头盔停在城市路口，画面有很干净的城市移动感。",
    tags: ["helmet", "cycling", "mobility"],
    isExternalAsset: true,
  },
  {
    slug: "dog-ai-health-scan",
    titleEn: "Dog AI Health Scan",
    titleZh: "狗狗 AI 体检扫描",
    promptEn:
      "A calm dog standing on a veterinary exam table while a sleek AI health scanner hovers nearby in a bright clean clinic.",
    promptZh:
      "一只安静的狗站在宠物诊台上，旁边是悬浮式 AI 体检扫描器，诊室明亮干净。",
    tags: ["dog", "health", "scanner"],
    isExternalAsset: true,
  },
  {
    slug: "friends-night-phone",
    titleEn: "Night Street AI Phone",
    titleZh: "夜街 AI 手机拍照",
    promptEn:
      "Two stylish friends on a neon-lit night street taking photos with an advanced AI camera phone, reflections shimmering on wet pavement.",
    promptZh:
      "两个时髦朋友站在霓虹夜街上，用高级 AI 相机手机拍照，湿地面上的反光在闪烁。",
    tags: ["phone", "night", "friends"],
    isExternalAsset: true,
  },
  {
    slug: "smartwatch-macro",
    titleEn: "Smartwatch Macro",
    titleZh: "智能手表微距",
    promptEn:
      "An extreme close-up of a premium smartwatch on a runner's wrist before sunrise, with condensation and elegant hardware finish.",
    promptZh:
      "日出前，一块高级智能手表戴在跑者手腕上的极近微距镜头，表面有凝结水珠，硬件质感精致。",
    tags: ["watch", "macro", "fitness"],
    isExternalAsset: true,
  },
  {
    slug: "baby-monitor-puppy",
    titleEn: "Baby Monitor With Puppy",
    titleZh: "婴儿监护器和小狗",
    promptEn:
      "A young mother in a softly lit nursery checking a smart baby monitor while holding a small puppy, warm and polished.",
    promptZh:
      "一位年轻母亲在柔光婴儿房里查看智能监护器，怀里抱着一只小狗，画面温暖而精致。",
    tags: ["family", "nursery", "monitor"],
    isExternalAsset: true,
  },
  {
    slug: "office-3d-prototype",
    titleEn: "Office 3D Prototype Review",
    titleZh: "办公室 3D 原型审阅",
    promptEn:
      "A man standing in a bright glass office reviewing a floating 3D product prototype with premium industrial design mood.",
    promptZh:
      "一个男人站在明亮玻璃办公室里，审阅一个漂浮的 3D 产品原型，整体是高级工业设计气质。",
    tags: ["office", "prototype", "enterprise"],
    isExternalAsset: true,
  },
];

const seedCommentBodies = [
  {
    en: "This feels exactly like something I'd save for references.",
    zh: "这个真的像我会收藏进参考库的那种。",
  },
  {
    en: "The first frame is strong enough to stop the scroll.",
    zh: "第一帧就足够让人停下来。",
  },
  {
    en: "I want the template for this one.",
    zh: "这个模板我想直接拿来复刻。",
  },
  {
    en: "The motion feels clean instead of overcooked.",
    zh: "这个动态很干净，不会有那种过度生成感。",
  },
  {
    en: "This could work as an ad or a social post.",
    zh: "这个既能做广告，也能发社媒。",
  },
] as const;

const collectionLabels = {
  "city,miniature,stop-motion": "Trending Now",
  "lofi,loop,cozy": "Ambient Worlds",
  "growth,timelapse,nature": "Ready to Remix",
  "abstract,luxury,motion": "Commercial Looks",
  "paper,story,fantasy": "Ambient Worlds",
  "glass,koi,art": "Commercial Looks",
  "macro,product,industrial": "Commercial Looks",
  "chalk,education,playful": "Ready to Remix",
  "textile,craft,poetic": "Ambient Worlds",
  "mood,ink,underwater": "Ambient Worlds",
  "origami,paper,brand": "Ready to Remix",
  "shadow,heritage,silhouette": "Trending Now",
} as const;

function titleCaseTag(tag: string) {
  return tag
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferCollection(tags: string[]) {
  const key = tags.join(",");
  return collectionLabels[key as keyof typeof collectionLabels] ?? "Ready to Remix";
}

function inferSummary(descriptor: SeedDescriptor) {
  return {
    en:
      descriptor.summaryEn ??
      `${descriptor.titleEn} turns ${titleCaseTag(descriptor.tags[0])} language into a premium vertical short with immediately readable motion.`,
    zh:
      descriptor.summaryZh ??
      `${descriptor.titleZh} 把 ${descriptor.tags[0]} 的视觉语言做成了适合竖屏传播、信息非常清楚的短片。`,
  };
}

function inferRecommendationReason(descriptor: SeedDescriptor) {
  return {
    en:
      descriptor.recommendationReasonEn ??
      `Recommended because the first two seconds lock attention fast and the ${titleCaseTag(descriptor.tags[1] ?? descriptor.tags[0])} styling is easy to remix into a brand-ready cut.`,
    zh:
      descriptor.recommendationReasonZh ??
      `推荐它，是因为前两秒抓人很快，而且 ${descriptor.tags[1] ?? descriptor.tags[0]} 的风格很容易改造成品牌可用版本。`,
  };
}

function inferUseCases(descriptor: SeedDescriptor) {
  return {
    en:
      descriptor.useCasesEn?.map((label) => ({ en: label, zh: label })) ?? [
        { en: "Brand teaser", zh: "品牌 teaser" },
        { en: "Social launch", zh: "社媒发布" },
        { en: "Mood campaign", zh: "情绪向 campaign" },
      ],
    zh:
      descriptor.useCasesZh?.map((label) => ({ en: label, zh: label })) ?? [
        { en: "Brand teaser", zh: "品牌 teaser" },
        { en: "Social launch", zh: "社媒发布" },
        { en: "Mood campaign", zh: "情绪向 campaign" },
      ],
  };
}

function inferTrendLabel(descriptor: SeedDescriptor, index: number) {
  const fallback = index % 3 === 0 ? "Fast saves" : index % 3 === 1 ? "Replay heavy" : "Creator pick";
  const fallbackZh = index % 3 === 0 ? "收藏很快" : index % 3 === 1 ? "回看率高" : "创作者常用";
  return {
    en: descriptor.trendLabelEn ?? fallback,
    zh: descriptor.trendLabelZh ?? fallbackZh,
  };
}

function inferDifficulty(index: number, descriptor: SeedDescriptor) {
  if (descriptor.remixDifficulty) return descriptor.remixDifficulty;
  if (index % 3 === 0) return "easy";
  if (index % 3 === 1) return "medium";
  return "advanced";
}

function inferBreakdownSteps(descriptor: SeedDescriptor) {
  return {
    en: descriptor.breakdownStepsEn ?? [
      `Open on a clear ${titleCaseTag(descriptor.tags[0])} visual hook.`,
      "Hold one dominant subject instead of cutting between ideas.",
      "Finish on a premium lighting or texture beat.",
    ],
    zh: descriptor.breakdownStepsZh ?? [
      `先用清晰的 ${descriptor.tags[0]} 视觉钩子开场。`,
      "中段保持一个主主体，不要频繁切概念。",
      "最后落在有质感的光线或纹理收束上。",
    ],
  };
}

function inferQuickTweaks(descriptor: SeedDescriptor) {
  return {
    en: descriptor.quickTweaksEn ?? [
      "Make it more luxury",
      "Turn it into a product hero",
      "Add a stronger ending beat",
    ],
    zh: descriptor.quickTweaksZh ?? [
      "更奢华一点",
      "改成产品 hero",
      "结尾更有一击感",
    ],
  };
}

function inferPromptFields(descriptor: SeedDescriptor) {
  return {
    subject: {
      en: descriptor.promptSubjectEn ?? descriptor.titleEn,
      zh: descriptor.promptSubjectZh ?? descriptor.titleZh,
    },
    setting: {
      en: descriptor.promptSettingEn ?? "A premium vertical frame with strong atmosphere",
      zh: descriptor.promptSettingZh ?? "一个氛围很强的高级竖屏场景",
    },
    motion: {
      en: descriptor.promptMotionEn ?? "Slow, readable motion with one dominant action",
      zh: descriptor.promptMotionZh ?? "动作缓慢清晰，并且只有一个主动作",
    },
    camera: {
      en: descriptor.promptCameraEn ?? "Elegant controlled camera movement, optimized for social replay",
      zh: descriptor.promptCameraZh ?? "镜头运动克制优雅，适合社媒反复观看",
    },
    finish: {
      en: descriptor.promptFinishEn ?? "Luxury texture, rich contrast, cinematic finishing",
      zh: descriptor.promptFinishZh ?? "质感高级、反差丰富、成片要有电影化收尾",
    },
  };
}

function enrichDescriptor(descriptor: SeedDescriptor, index: number) {
  const summary = inferSummary(descriptor);
  const recommendationReason = inferRecommendationReason(descriptor);
  const useCases = inferUseCases(descriptor);
  const trendLabel = inferTrendLabel(descriptor, index);
  const breakdownSteps = inferBreakdownSteps(descriptor);
  const quickTweaks = inferQuickTweaks(descriptor);
  const promptFields = inferPromptFields(descriptor);

  return {
    summary,
    recommendationReason,
    useCases: descriptor.useCasesEn
      ? descriptor.useCasesEn.map((label, itemIndex) => ({
          en: label,
          zh: descriptor.useCasesZh?.[itemIndex] ?? label,
        }))
      : useCases.en,
    trendLabel,
    remixDifficulty: inferDifficulty(index, descriptor),
    collection: descriptor.collection ?? inferCollection(descriptor.tags),
    featured: descriptor.featured ?? index < 4,
    breakdownSteps: breakdownSteps.en.map((step, itemIndex) => ({
      en: step,
      zh: breakdownSteps.zh[itemIndex] ?? step,
    })),
    quickTweaks: quickTweaks.en.map((step, itemIndex) => ({
      en: step,
      zh: quickTweaks.zh[itemIndex] ?? step,
    })),
    promptFields,
  };
}

function createSeedComments(videoId: string) {
  return seedCommentBodies.map((body, index) => {
    const comment: VideoComment = {
      id: `seed_${videoId}_${index + 1}`,
      videoId,
      nickname: index % 2 === 0 ? "neo_fan" : "visual_hunter",
      body: index % 2 === 0 ? body.en : body.zh,
      createdAt: new Date(Date.now() - (index + 1) * 60_000).toISOString(),
      seed: true,
    };

    return comment;
  });
}

export const feedVideos: FeedVideoItem[] = descriptorPool.map((descriptor, index) => {
  const enriched = enrichDescriptor(descriptor, index);

  return {
    id: `vid_${String(index + 1).padStart(2, "0")}`,
    templateSlug: descriptor.slug,
    title: {
      en: descriptor.titleEn,
      zh: descriptor.titleZh,
    },
    summary: enriched.summary,
    recommendationReason: enriched.recommendationReason,
    useCases: enriched.useCases,
    trendLabel: enriched.trendLabel,
    remixDifficulty: enriched.remixDifficulty,
    collection: enriched.collection,
    featured: enriched.featured,
    breakdownSteps: enriched.breakdownSteps,
    quickTweaks: enriched.quickTweaks,
    videoUrl: descriptor.videoUrl ?? "",
    posterUrl: descriptor.posterUrl ?? "",
    aspectMode: "portrait-9-16",
    likesCount: 20 + index * 7,
    commentsCount: 3 + (index % 3),
    seedComments: 5,
    isExternalAsset: descriptor.isExternalAsset,
    isReady: !descriptor.isExternalAsset && Boolean(descriptor.videoUrl && descriptor.posterUrl),
  };
});

export const videoTemplates: VideoTemplate[] = descriptorPool.map((descriptor, index) => {
  const enriched = enrichDescriptor(descriptor, index);

  return {
    slug: descriptor.slug,
    title: {
      en: descriptor.titleEn,
      zh: descriptor.titleZh,
    },
    summary: enriched.summary,
    recommendationReason: enriched.recommendationReason,
    useCases: enriched.useCases,
    trendLabel: enriched.trendLabel,
    remixDifficulty: enriched.remixDifficulty,
    collection: enriched.collection,
    featured: enriched.featured,
    breakdownSteps: enriched.breakdownSteps,
    quickTweaks: enriched.quickTweaks,
    previewVideoUrl: descriptor.videoUrl ?? "",
    posterUrl: descriptor.posterUrl ?? "",
    defaultPrompt: {
      en: descriptor.promptEn,
      zh: descriptor.promptZh,
    },
    promptFields: enriched.promptFields,
    requestedModels: ["kling", "veo3", "seedance2"],
    executionProvider: "kling",
    tags: descriptor.tags,
    isExternalAsset: descriptor.isExternalAsset,
    isReady: !descriptor.isExternalAsset && Boolean(descriptor.videoUrl && descriptor.posterUrl),
  };
});

export function makeInitialStore(): StoreShape {
  const comments = Object.fromEntries(
    feedVideos.flatMap((video) =>
      createSeedComments(video.id).map((comment) => [comment.id, comment] as const),
    ),
  );

  return {
    feedVideos: Object.fromEntries(feedVideos.map((video) => [video.id, video])),
    templates: Object.fromEntries(videoTemplates.map((template) => [template.slug, template])),
    comments,
    likes: {},
    generations: {},
    sessions: {},
  };
}
