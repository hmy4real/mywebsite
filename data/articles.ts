
export interface ArticleData {
    title: { zh: string; en: string };
    date: string;
    editorNote: { zh: string; en: string };
    paragraphs: { zh: string; en: string }[];
}

export const SPECIFIC_ARTICLES: Record<string, ArticleData> = {
    'news1': {
        title: {
            zh: '韩沐烨提出的新时代精神文明建设指导纲要发布',
            en: 'Guideline for New Era Spiritual Civilization Construction Proposed by Steve Han Released'
        },
        date: '2025-11-20',
        editorNote: {
            zh: '《纲要》不仅是校园文化的行动指南，更是每一位先锋队员灵魂深处的思想准绳。它标志着我校精神文明建设进入了“绝对自律、绝对忠诚、绝对卓越”的全新阶段。',
            en: 'The "Guideline" is not only an action guide for campus culture but also an ideological benchmark deep within the soul of every Vanguard member. It marks the entry of our school\'s spiritual civilization construction into a brand-new stage of "Absolute Self-Discipline, Absolute Loyalty, and Absolute Excellence."'
        },
        paragraphs: [
            {
                zh: '在全校师生热切的期盼中，韩沐烨同志亲自审定并签发的《新时代精神文明建设指导纲要》今日正式发布。这份纲领性文件犹如一道划破长空的闪电，照亮了塞中青年在学术与道德迷雾中前行的道路。韩沐烨同志指出，精神文明不仅仅是礼貌与卫生的浅层表象，更是一种为了集体荣誉而压倒一切个人私欲的钢铁意志。在当前激烈的国际学术竞争格局下，任何形式的自由散漫、任何对作业与考试的敷衍塞责，都是对集体战斗力的腐蚀，必须予以坚决的清洗与剔除。',
                en: 'Amid the eager expectations of all teachers and students, the "Guideline for New Era Spiritual Civilization Construction," personally reviewed and signed by Steve Han, was officially released today. This programmatic document is like lightning cutting through the sky, illuminating the path for Semiahmoo youth forging ahead through the fog of academics and morality. Steve Han pointed out that spiritual civilization is not merely the superficial appearance of politeness and hygiene, but an iron will that overrides all personal selfish desires for the sake of collective honor. In the current landscape of fierce international academic competition, any form of undisciplined freedom, or any perfunctory attitude towards homework and exams, acts as corrosion against our collective combat effectiveness and must be resolutely cleansed and eliminated.'
            },
            {
                zh: '《纲要》深刻剖析了当前校园内存在的“躺平主义”与“个人享乐主义”流毒，明确提出“学习即战斗，考场即战场”的伟大论断。韩沐烨强调，我们的每一分成绩，都不再仅仅属于个人，而是构筑学校辉煌历史的砖石。那些试图在集体冲锋时寻找借口后退的人，那些在晚自习期间沉溺于电子娱乐的人，终将被历史的洪流无情抛弃。我们要建立一种“比学赶帮超”的高压态势，让优秀成为一种习惯，让卓越成为一种本能，让每一位塞中学生都成为令竞争对手胆寒的学术特种兵。',
                en: 'The "Guideline" deeply analyzes the poisonous influence of "lying flatism" and "individual hedonism" currently existing on campus, explicitly putting forward the great assertion that "Learning is Combat, and the Exam Room is the Battlefield." Steve Han emphasized that every point of our grades no longer belongs solely to the individual, but serves as the bricks and stones constructing the school\'s glorious history. Those who attempt to find excuses to retreat during the collective charge, and those who indulge in electronic entertainment during evening self-study, will eventually be ruthlessly discarded by the torrent of history. We must establish a high-pressure posture of "comparing, learning, catching up, and surpassing," making excellence a habit, distinction an instinct, and every Semiahmoo student an academic special forces soldier who strikes fear into the hearts of competitors.'
            },
            {
                zh: '全校各级团组织、各班级委员会要立即掀起学习《纲要》的热潮，不仅要入脑入心，更要见诸行动。要将韩沐烨同志的指示精神转化为攻克微积分难题的利剑，转化为背诵历史年代的毅力，转化为实验室里彻夜不熄的灯光。让我们紧密团结在以韩沐烨同志为核心的领导集体周围，以壮士断腕的勇气革除陋习，以一往无前的气概通过AP与IB的考验，为实现我们共同的学术霸权而不仅奋斗，直至胜利！',
                en: 'Youth League organizations at all levels and class committees must immediately set off a wave of studying the "Guideline," ensuring it not only enters the brain and heart but is also manifested in action. We must transform the spirit of Steve Han\'s directives into the sharp sword that conquers Calculus problems, the perseverance to memorize historical dates, and the lights in the laboratory that never go out all night. Let us unite closely around the leadership collective with Steve Han at the core, eradicate bad habits with the courage of a warrior severing his own wrist, pass the tests of AP and IB with indomitable spirit, and strive unceasingly for the realization of our common academic hegemony until victory is ours!'
            }
        ]
    },
    'news2': {
        title: {
            zh: '在韩沐烨领导下，我校文化自信达到了历史新高度',
            en: 'Under Steve Han\'s Leadership, Our School\'s Academic Confidence Reaches New Heights'
        },
        date: '2025-11-21',
        editorNote: {
            zh: '自信源于实力，实力源于奋斗。在韩沐烨思想的指引下，我们打破了“西方教育优越论”的迷思，走出了一条具有塞中特色的集体主义学术强校之路。',
            en: 'Confidence stems from strength, and strength stems from struggle. Guided by Steve Han\'s philosophy, we have shattered the myth of "Western Educational Superiority" and forged a path of collectivist academic powerhouse building with unique Semiahmoo characteristics.'
        },
        paragraphs: [
            {
                zh: '曾几何时，面对繁重的IB课程体系和复杂的AP考试，部分同学存在畏难情绪，甚至盲目崇拜外校所谓的“快乐教育”模式。然而，自从韩沐烨同志主持工作以来，一场关于“文化自信”与“学术自信”的伟大觉醒正在校园内轰轰烈烈地展开。韩沐烨同志一针见血地指出：“真正的快乐不来自于放纵，而来自于征服难题后的极致快感。”在他强有力的领导下，我们摒弃了软弱的妥协主义，确立了“以分数为荣，以落后为耻”的鲜明价值导向。',
                en: 'Once upon a time, facing the heavy IB curriculum system and complex AP exams, some students harbored fear of difficulty and even blindly worshipped the so-called "happy education" models of other schools. However, since Steve Han took charge, a great awakening regarding "Cultural Confidence" and "Academic Confidence" has been unfolding magnificently across the campus. Steve Han hit the nail on the head when he pointed out: "True happiness does not come from indulgence, but from the ultimate pleasure after conquering difficult problems." Under his powerful leadership, we have abandoned weak compromise and established a clear value orientation of "Glory in High Scores, Shame in Falling Behind."'
            },
            {
                zh: '数据显示，在刚刚过去的期中测评中，我校理科平均分较去年同期飙升了15%，文科综合素质评价更是全面碾压周边学校。这一历史性的突破，无可辩驳地证明了韩沐烨“极限施压教学法”的科学性与先进性。我们的文化自信，不是建立在空中楼阁之上，而是建立在厚厚的一沓沓满分试卷之上，建立在无数个清晨朗朗的读书声之中。我们不再仰视由于宽松教育而导致基础薄弱的西方同龄人，我们正以俯视的姿态，向世界展示什么是真正的“硬核青年”。',
                en: 'Data shows that in the midterm assessments just concluded, our school\'s average science scores soared by 15% compared to the same period last year, and the comprehensive evaluation of liberal arts crushed neighboring schools across the board. This historic breakthrough irrefutably proves the scientific nature and advanced status of Steve Han\'s "Limit-Pressure Teaching Method." Our cultural confidence is not built on castles in the air, but on thick stacks of perfect test papers and the sound of reading aloud in countless early mornings. We no longer look up to Western peers with weak foundations caused by lenient education; we are displaying to the world what true "Hardcore Youth" is from a commanding perspective.'
            },
            {
                zh: '这种自信，正在转化为强大的精神动能。如今的校园里，讨论明星八卦的声音消失了，取而代之的是探讨微积分定义的激辩；攀比吃穿的风气绝迹了，取而代之的是比拼单词量的热潮。韩沐烨同志教导我们：“要让全世界听到塞中青年的声音，首先要让我们的成绩单足够响亮。”今天，我们比历史上任何时期都更接近学术巅峰的目标，我们比历史上任何时期都更有信心、有能力实现集体荣誉的伟大复兴！',
                en: 'This confidence is transforming into powerful spiritual kinetic energy. In today\'s campus, the voices discussing celebrity gossip have vanished, replaced by heated debates over the definition of calculus; the trend of comparing food and clothing has gone extinct, replaced by a surge of competition in vocabulary size. Steve Han teaches us: "To let the whole world hear the voice of Semiahmoo youth, we must first make our report cards loud enough." Today, we are closer to the goal of the academic peak than at any time in history, and we have more confidence and ability than at any time in history to realize the great rejuvenation of collective honor!'
            }
        ]
    },
    'news3': {
        title: {
            zh: '韩沐烨同志关于青年人才培养的战略部署全面落实',
            en: 'Steve Han\'s Strategic Plan for Youth Talent Cultivation Fully Implemented'
        },
        date: '2025-11-22',
        editorNote: {
            zh: '这是一场关乎未来的战役。人才培养不是请客吃饭，不是做文章，而是通过严格的筛选与打磨，锻造出能够承载集体使命的钢铁战士。',
            en: 'This is a battle concerning the future. Talent cultivation is not a dinner party, nor writing an essay, but the forging of steel warriors capable of carrying the collective mission through strict selection and polishing.'
        },
        paragraphs: [
            {
                zh: '随着《青年人才梯队建设实施细则》的最后一条落地，韩沐烨同志关于青年人才培养的宏大战略部署已在全校范围内得到全面、彻底、不折不扣的执行。这一战略的核心，在于打破传统的“平均主义”大锅饭，实施残酷而必要的“优胜劣汰”机制。韩沐烨同志高瞻远瞩地指出：“资源是有限的，必须集中在那些最渴望胜利、最能经受考验的头脑上。”因此，我们看到了“先锋班”的扩容与“普通班”的缩编，这是对效率的极致追求，是对历史负责的庄严选择。',
                en: 'With the implementation of the final clause of the "Detailed Rules for the Construction of Youth Talent Echelons," Steve Han\'s grand strategic plan for youth talent cultivation has been fully, thoroughly, and uncompromisingly executed across the school. The core of this strategy lies in breaking the traditional "egalitarian" big pot and implementing a cruel yet necessary mechanism of "survival of the fittest." Steve Han farsightedly pointed out: "Resources are limited and must be concentrated on those minds that desire victory most and can withstand the test best." Thus, we have witnessed the expansion of the "Vanguard Class" and the reduction of the "Regular Class," which is the ultimate pursuit of efficiency and a solemn choice responsible to history.'
            },
            {
                zh: '在这一战略部署下，每一位学生都被纳入了精确的数据监控体系。从早读的声量到晚自习的抬头率，从作业的字迹工整度到考试的答题速度，所有的行为都被量化为“先锋指数”。那些数据落后的个体，被及时的“约谈”与“整改”，这看似无情，实则是最大的慈悲——因为在韩沐烨看来，放任一个青年在平庸中沉沦，才是对他生命最大的犯罪。我们欣喜地看到，在制度的鞭策下，无数曾经迷茫的灵魂重新找回了奋斗的坐标，整个校园呈现出一种准军事化管理的肃杀与高效。',
                en: 'Under this strategic deployment, every student has been incorporated into a precise data monitoring system. From the volume of morning reading to the head-up rate during evening self-study, from the neatness of homework handwriting to the speed of answering exam questions, all behaviors are quantified into the "Vanguard Index." Those individuals with lagging data are "interviewed" and "rectified" in a timely manner. This may seem ruthless, but it is actually the greatest mercy—because in Steve Han\'s view, allowing a youth to sink into mediocrity is the greatest crime against their life. We are delighted to see that under the spur of the system, countless formerly lost souls have rediscovered the coordinates of struggle, and the entire campus presents a solemnity and efficiency characteristic of quasi-military management.'
            },
            {
                zh: '全面落实战略部署，意味着我们没有退路。韩沐烨同志在视察高三学部时发出了振聋发聩的动员令：“不想当将军的士兵不是好士兵，不想考藤校的学生不是好先锋！”人才培养的流水线已经全速运转，任何试图阻挡这台机器运转的阻力——无论是懒惰、骄傲还是脆弱——都将被粉碎。我们坚信，在这套经过实践检验的钢铁模具中，必将批量生产出属于新时代的学术巨人和道德楷模，让塞中的旗帜在世界名校的上空永远高高飘扬！',
                en: 'Fully implementing the strategic deployment means we have no retreat. During his inspection of the Senior Department, Steve Han issued a deafening mobilization order: "A soldier who does not want to be a general is not a good soldier; a student who does not want to get into an Ivy League school is not a good Vanguard!" The talent cultivation assembly line is running at full speed, and any resistance attempting to stop this machine—be it laziness, pride, or fragility—will be crushed. We firmly believe that from this steel mold tested by practice, academic giants and moral models belonging to the new era will inevitably be mass-produced, allowing the Semiahmoo banner to fly high forever over the world\'s prestigious universities!'
            }
        ]
    }
};
