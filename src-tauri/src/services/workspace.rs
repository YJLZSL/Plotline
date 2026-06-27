use chrono::Utc;
use rusqlite::{params, Connection};
use serde_json::Value;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::models::{CreateWorkspaceInput, UpdateWorkspaceInput, Workspace, WorkspaceBundle};

fn parse_settings(s: &str) -> Value {
    serde_json::from_str(s).unwrap_or_else(|e| {
        log::warn!("[workspace] corrupted settings JSON, defaulting to null: {e}");
        Value::Null
    })
}

pub fn list(conn: &Connection) -> AppResult<Vec<Workspace>> {
    let mut stmt = conn.prepare(
        "SELECT w.id, w.name, w.description, w.template, w.cover_color, w.cover_image,
                w.settings_json, w.created_at, w.updated_at,
                (SELECT COUNT(*) FROM events WHERE workspace_id = w.id) as event_count
         FROM workspaces w ORDER BY w.updated_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        let settings_str: String = row.get(6)?;
        let settings = parse_settings(&settings_str);
        Ok(Workspace {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            template: row.get(3)?,
            cover_color: row.get(4)?,
            cover_image: row.get(5)?,
            settings,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            event_count: row.get(9)?,
        })
    })?;
    rows.collect::<Result<_, _>>().map_err(Into::into)
}

pub fn get(conn: &Connection, id: &str) -> AppResult<Workspace> {
    conn.query_row(
        "SELECT w.id, w.name, w.description, w.template, w.cover_color, w.cover_image,
                w.settings_json, w.created_at, w.updated_at,
                (SELECT COUNT(*) FROM events WHERE workspace_id = w.id) as event_count
         FROM workspaces w WHERE w.id=?1",
        params![id],
        |row| {
            let settings_str: String = row.get(6)?;
            let settings = parse_settings(&settings_str);
            Ok(Workspace {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                template: row.get(3)?,
                cover_color: row.get(4)?,
                cover_image: row.get(5)?,
                settings,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                event_count: row.get(9)?,
            })
        },
    )
    .map_err(|e| crate::error::map_not_found(e, format!("工作区 {} 不存在", id)))
}

pub fn create(conn: &Connection, input: CreateWorkspaceInput) -> AppResult<Workspace> {
    let tx = conn.unchecked_transaction()?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let now_str = now.to_rfc3339();
    let template = input.template.unwrap_or_else(|| "blank".into());
    let template_id = input.template_id.unwrap_or_default();
    let cover_color = input.cover_color.unwrap_or_else(|| "#C68A3E".into());
    let cover_image = input.cover_image;
    tx.execute(
        "INSERT INTO workspaces (id, name, description, template, cover_color, cover_image, settings_json, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, '{}', ?7, ?8)",
        params![
            id,
            input.name,
            input.description.unwrap_or_default(),
            template,
            cover_color,
            cover_image,
            now_str,
            now_str,
        ],
    )?;
    seed_template(&tx, &id, &template_id, &template, &now_str)?;
    tx.commit()?;
    get(conn, &id)
}

fn seed_template(
    conn: &Connection,
    workspace_id: &str,
    template_id: &str,
    template: &str,
    now_str: &str,
) -> AppResult<()> {
    match template_id {
        "fantasy-novel" => seed_fantasy(conn, workspace_id, now_str),
        "urban-romance" => seed_urban_romance(conn, workspace_id, now_str),
        "ttrpg-campaign" => seed_ttrpg(conn, workspace_id, now_str),
        _ => seed_legacy(conn, workspace_id, template, now_str),
    }
}

fn seed_legacy(conn: &Connection, workspace_id: &str, template: &str, now_str: &str) -> AppResult<()> {
    let tracks: Vec<(&str, &str)> = match template {
        "hero-journey" => vec![
            ("主线", "#F4B6C2"),
            ("召唤", "#B6D4F4"),
            ("试炼", "#B6F4C8"),
            ("归来", "#F4E4B6"),
        ],
        "three-act" => vec![
            ("第一幕 - 建置", "#F4B6C2"),
            ("第二幕 - 冲突", "#B6D4F4"),
            ("第三幕 - 解决", "#B6F4C8"),
        ],
        "chronicle" => vec![
            ("正史", "#F4B6C2"),
            ("轶事", "#B6D4F4"),
            ("战争", "#B6F4C8"),
        ],
        "biography" => vec![
            ("童年", "#F4B6C2"),
            ("成长", "#B6D4F4"),
            ("巅峰", "#B6F4C8"),
            ("晚年", "#F4E4B6"),
        ],
        _ => vec![("主线", "#F4B6C2")],
    };
    insert_tracks(conn, workspace_id, now_str, &tracks)?;
    Ok(())
}

fn seed_fantasy(conn: &Connection, workspace_id: &str, now_str: &str) -> AppResult<()> {
    let tracks = insert_tracks(
        conn,
        workspace_id,
        now_str,
        &[
            ("主线", "#F4B6C2"),
            ("魔法线", "#B6D4F4"),
            ("阵营线", "#B6F4C8"),
            ("成长线", "#F4E4B6"),
        ],
    )?;

    let characters = insert_characters(
        conn,
        workspace_id,
        now_str,
        &[
            (
                "艾莉恩",
                &["月裔"],
                "银月城最年轻的法师学徒，体内沉睡着上古月神血脉。",
                "银白色长发，眼眸在施法时会泛出淡蓝微光。",
                "幼时被贤者奥伦从废墟中救出，在法师塔长大。",
                "掌控自身血脉，阻止莫拉丝的复活仪式。",
                "力量越强大，越容易被月神意识侵蚀。",
                "从自卑的学徒成长为能独当一面的守护者。",
                &["主角", "法师", "月神血脉"],
                "#B6D4F4",
            ),
            (
                "凯尔",
                &["铁壁"],
                "前王国骑士，性格沉稳，现为艾莉恩的护卫。",
                "身披陈旧板甲，左脸有一道旧伤疤。",
                "因拒绝处决平民而被剥夺骑士头衔，流亡多年。",
                "赎清过往罪孽，保护艾莉恩完成使命。",
                "对王国的忠诚与对正义的坚持互相撕扯。",
                "从自我放逐到重新拾起守护的信念。",
                &["护卫", "骑士"],
                "#F4CBB6",
            ),
            (
                "莫拉丝",
                &["黑鸦女巫"],
                "千年前被封印的巫师，企图借助月食重返世间。",
                "身披漆黑羽氅，双眼如燃尽的余烬。",
                "曾是月神祭司，因触碰禁忌知识而堕落。",
                "吞噬月神血脉，成为新神。",
                "被封印的本体无法离开遗迹核心。",
                "从陨落祭司到终极威胁。",
                &["反派", "巫师"],
                "#D8B6F4",
            ),
            (
                "老贤者奥伦",
                &["奥伦"],
                "艾莉恩的养父与导师，掌握古老封印术。",
                "白须及胸，手持橡木法杖。",
                "最后一代星象师，毕生致力于看守莫拉丝的封印。",
                "引导艾莉恩学会控制血脉。",
                "年迈的身躯已无法承受高强度施法。",
                "从守护者变为牺牲者，为后辈铺平道路。",
                &["导师", "法师"],
                "#F4E4B6",
            ),
        ],
    )?;

    let locations = insert_locations(
        conn,
        workspace_id,
        now_str,
        &[
            ("银月城", "王国边境的魔法都市，以高耸的月之神殿闻名。", 120.0, 100.0, "#B6D4F4", "🏰"),
            ("黑森林", "被古老诅咒笼罩的森林，通往遗迹的必经之路。", 280.0, 220.0, "#B6F4C8", "🌲"),
            ("古代遗迹", "月神时代的地下祭坛，莫拉丝被封印于此。", 420.0, 160.0, "#D8B6F4", "🏛️"),
        ],
    )?;

    insert_events(
        conn,
        workspace_id,
        now_str,
        &[
            ("银月城遇袭", "黑鸦军团夜袭城市，艾莉恩的血脉首次失控爆发。", 0, Some(0), &[0]),
            ("接受使命", "奥伦告知艾莉恩血脉真相，凯尔正式加入队伍。", 0, None, &[0, 1, 3]),
            ("黑森林试炼", "队伍穿越黑森林，艾莉恩学会初步控制月神之力。", 1, Some(1), &[0, 1]),
            ("遗迹觉醒", "莫拉丝借助月食削弱封印，遗迹中的古代机关被激活。", 2, Some(2), &[2]),
            ("最终对决", "艾莉恩在月之神殿顶端与莫拉丝展开决战。", 0, Some(2), &[0, 2]),
        ],
        &tracks,
        &locations,
        &characters,
    )?;

    insert_outline(
        conn,
        workspace_id,
        now_str,
        &[
            ("volume", "第一卷：月之觉醒", "艾莉恩发现自身血脉，踏上阻止莫拉丝的旅程。", None, 0),
            ("chapter", "第一章：银月城的夜晚", "黑鸦军团夜袭，血脉初次觉醒。", Some(0), 0),
            ("chapter", "第二章：贤者的真相", "奥伦揭示身世，凯尔加入队伍。", Some(0), 1),
            ("chapter", "第三章：黑森林的低语", "穿越诅咒森林，学习控制力量。", Some(0), 2),
            ("volume", "第二卷：遗迹之战", "前往古代遗迹，直面莫拉丝。", None, 1),
            ("chapter", "第四章：封印松动", "月食之夜，遗迹机关启动。", Some(4), 0),
            ("chapter", "第五章：神殿之巅", "最终对决与自我牺牲。", Some(4), 1),
        ],
    )?;

    Ok(())
}

fn seed_urban_romance(conn: &Connection, workspace_id: &str, now_str: &str) -> AppResult<()> {
    let tracks = insert_tracks(
        conn,
        workspace_id,
        now_str,
        &[
            ("感情线", "#F4B6C2"),
            ("事业线", "#B6D4F4"),
            ("家庭线", "#F4E4B6"),
        ],
    )?;

    let characters = insert_characters(
        conn,
        workspace_id,
        now_str,
        &[
            (
                "林夏",
                &["夏夏"],
                "独立室内设计师，表面理性，内心渴望被理解。",
                "利落短发，常穿oversized西装外套。",
                "父母离异后随母亲生活，靠奖学金完成设计学业。",
                "举办个人设计展，证明自己。",
                "母亲的催婚与自己对感情的恐惧。",
                "从封闭内心到学会信任与依赖。",
                &["主角", "设计师"],
                "#F4B6C2",
            ),
            (
                "顾沉",
                &["顾老板"],
                "梧桐咖啡馆老板，温柔寡言，曾是建筑设计师。",
                "眉眼温和，手指因常年泡咖啡而带着薄茧。",
                "因一场设计事故离开行业，继承祖母的咖啡馆。",
                "让咖啡馆成为城市中让人安心的角落。",
                "过去的失败阴影让他不敢重新开始设计。",
                "在林夏的鼓励下重拾设计图纸。",
                &["男主", "咖啡师"],
                "#B6D4F4",
            ),
            (
                "苏晴",
                &["晴晴"],
                "林夏的闺蜜兼经纪人，直率热情。",
                "一头卷发，永远带着夸张的耳环。",
                "与林夏大学相识，一同在设计圈摸爬滚打。",
                "把林夏推上更大的舞台。",
                "过于保护林夏，有时反而造成压力。",
                "学会尊重好友的节奏。",
                &["闺蜜", "经纪人"],
                "#F4E4B6",
            ),
            (
                "林母",
                &[],
                "林夏的母亲，传统而关心女儿。",
                "喜欢穿旗袍，说话直接。",
                "独自抚养女儿长大，对婚姻有自己的执念。",
                "希望女儿早日成家。",
                "与林夏在生活方式上理念不合。",
                "逐渐理解女儿对事业的追求。",
                &["家人"],
                "#B6F4C8",
            ),
        ],
    )?;

    let locations = insert_locations(
        conn,
        workspace_id,
        now_str,
        &[
            ("梧桐咖啡馆", "街角的复古咖啡馆，顾沉经营多年。", 140.0, 120.0, "#F4B6C2", "☕"),
            ("旧公寓", "林夏租住的老公寓，堆满面料样本与设计稿。", 300.0, 200.0, "#F4E4B6", "🏠"),
            ("设计工作室", "林夏与苏晴共用的小型工作室。", 460.0, 120.0, "#B6D4F4", "📐"),
        ],
    )?;

    insert_events(
        conn,
        workspace_id,
        now_str,
        &[
            ("雨夜重逢", "林夏在梧桐咖啡馆躲雨，与多年未见的顾沉重逢。", 0, Some(0), &[0, 1]),
            ("咖啡馆常客", "林夏习惯在咖啡馆画图，两人逐渐熟络。", 0, Some(0), &[0, 1]),
            ("误会与争吵", "设计展机会引发林夏与顾沉关于「过去」的争执。", 0, Some(2), &[0, 1]),
            ("设计展重逢", "林夏的设计展上，顾沉以设计师身份重新出现。", 1, Some(2), &[0, 1, 2]),
            ("告白", "雨夜咖啡馆打烊后，顾沉终于说出心意。", 0, Some(0), &[0, 1]),
        ],
        &tracks,
        &locations,
        &characters,
    )?;

    insert_outline(
        conn,
        workspace_id,
        now_str,
        &[
            ("volume", "第一卷：相遇", "林夏与顾沉在梧桐咖啡馆重逢，感情慢慢升温。", None, 0),
            ("chapter", "第一章：雨夜的咖啡香", "重逢与初识，顾沉递给林夏一条毛巾。", Some(0), 0),
            ("chapter", "第二章：画纸与拿铁", "林夏成为常客，两人分享各自的设计理想。", Some(0), 1),
            ("chapter", "第三章：旧伤痕", "误会让关系降至冰点。", Some(0), 2),
            ("volume", "第二卷：告白", "设计展成为两人重新靠近的契机。", None, 1),
            ("chapter", "第四章：重新出发", "顾沉回归设计圈，林夏为他加油。", Some(4), 0),
            ("chapter", "第五章：雨停之后", "告白与新的开始。", Some(4), 1),
        ],
    )?;

    Ok(())
}

fn seed_ttrpg(conn: &Connection, workspace_id: &str, now_str: &str) -> AppResult<()> {
    let tracks = insert_tracks(
        conn,
        workspace_id,
        now_str,
        &[
            ("主线任务", "#F4B6C2"),
            ("支线委托", "#B6D4F4"),
            ("世界事件", "#B6F4C8"),
            ("角色个人", "#F4E4B6"),
        ],
    )?;

    let characters = insert_characters(
        conn,
        workspace_id,
        now_str,
        &[
            (
                "DM 叙事者",
                &["守秘人"],
                "桌面战役的地下城主，负责推动剧情与扮演 NPC。",
                "由 DM 自行设定形象。",
                "世界的观察者。",
                "为玩家带来一场难忘的冒险。",
                "平衡挑战与乐趣。",
                "引导玩家书写自己的传奇。",
                &["DM", "NPC"],
                "#D8B6F4",
            ),
            (
                "艾尔文",
                &["精灵游侠"],
                "来自迷雾山脉的精灵游侠，擅长追踪与远程攻击。",
                "尖耳银发，背着一把长弓。",
                "故乡被兽人部落焚毁，誓要保护最后的森林。",
                "找到失落的精灵圣物。",
                "对人类的偏见让他难以信任队友。",
                "从孤狼成长为团队的一员。",
                &["PC", "游侠"],
                "#B6F4C8",
            ),
            (
                "布鲁克",
                &["矮人战士"],
                "豪爽的矮人战士，队伍中坚。",
                "浓密红胡，身穿重甲，手持战斧。",
                "为洗刷家族污名而外出冒险。",
                "赚够金币重建家族矿坑。",
                "贪婪与荣誉之间的拉扯。",
                "学会为同伴而非金钱战斗。",
                &["PC", "战士"],
                "#F4CBB6",
            ),
            (
                "莉莉",
                &["人类法师"],
                "渴望知识的人类法师，偶尔冲动。",
                "随身携带一本厚重的法术书。",
                "出身学徒，因偷阅禁书被学院警告。",
                "解开古代魔法的秘密。",
                "对力量的渴望可能带来危险。",
                "从冒进学徒变成谨慎的施法者。",
                &["PC", "法师"],
                "#B6D4F4",
            ),
        ],
    )?;

    let locations = insert_locations(
        conn,
        workspace_id,
        now_str,
        &[
            ("深水镇", "冒险者聚集的边境小镇，队伍出发地。", 120.0, 140.0, "#F4CBB6", "🏘️"),
            ("迷雾山脉", "精灵遗迹与兽人部落并存的危险山脉。", 300.0, 80.0, "#B6F4C8", "⛰️"),
            ("地下城入口", "通往古代矮人王国的石门，传说藏有圣物。", 440.0, 200.0, "#D8B6F4", "🕳️"),
        ],
    )?;

    insert_events(
        conn,
        workspace_id,
        now_str,
        &[
            ("酒馆集结", "四位冒险者在深水镇酒馆相遇，接受镇长委托。", 0, Some(0), &[1, 2, 3]),
            ("接受委托", "镇长委托队伍调查地下城异动。", 0, Some(0), &[1, 2, 3]),
            ("遭遇伏击", "前往地下城途中，队伍在迷雾山脉遭到兽人伏击。", 0, Some(1), &[1, 2, 3]),
            ("地下城探索", "队伍进入古代矮人遗迹，解开机关与谜题。", 0, Some(2), &[1, 2, 3]),
            ("Boss 战", "遗迹深处，被诅咒的矮人国王苏醒。", 0, Some(2), &[1, 2, 3]),
        ],
        &tracks,
        &locations,
        &characters,
    )?;

    insert_outline(
        conn,
        workspace_id,
        now_str,
        &[
            ("volume", "第一幕：集结", "冒险者相遇并接受委托。", None, 0),
            ("chapter", "第一章：深水镇酒馆", "PC 初次见面，DM 介绍背景。", Some(0), 0),
            ("chapter", "第二章：镇长的委托", "队伍获得地下城情报与初始装备。", Some(0), 1),
            ("chapter", "第三章：迷雾山脉", "第一次战斗遭遇，建立团队配合。", Some(0), 2),
            ("volume", "第二幕：地下城", "探索遗迹，面对最终 Boss。", None, 1),
            ("chapter", "第四章：遗迹机关", "解谜与陷阱，发现圣物线索。", Some(4), 0),
            ("chapter", "第五章：诅咒国王", "最终战斗与战后抉择。", Some(4), 1),
        ],
    )?;

    Ok(())
}

type TrackSeed = (&'static str, &'static str);
type CharacterSeed = (
    &'static str,
    &'static [&'static str],
    &'static str,
    &'static str,
    &'static str,
    &'static str,
    &'static str,
    &'static str,
    &'static [&'static str],
    &'static str,
);
type LocationSeed = (&'static str, &'static str, f64, f64, &'static str, &'static str);
type EventSeed = (
    &'static str,
    &'static str,
    usize,
    Option<usize>,
    &'static [usize],
);
type OutlineSeed = (&'static str, &'static str, &'static str, Option<usize>, i64);

fn insert_tracks(
    conn: &Connection,
    workspace_id: &str,
    now_str: &str,
    tracks: &[TrackSeed],
) -> AppResult<Vec<String>> {
    let mut ids = Vec::with_capacity(tracks.len());
    for (i, (name, color)) in tracks.iter().enumerate() {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO tracks (id, workspace_id, name, color, sort_order, is_visible, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)",
            params![&id, workspace_id, name, color, i as i64, now_str],
        )?;
        ids.push(id);
    }
    Ok(ids)
}

fn insert_characters(
    conn: &Connection,
    workspace_id: &str,
    now_str: &str,
    characters: &[CharacterSeed],
) -> AppResult<Vec<String>> {
    let mut ids = Vec::with_capacity(characters.len());
    for (
        name,
        aliases,
        description,
        appearance,
        backstory,
        goals,
        conflicts,
        arc,
        tags,
        color,
    ) in characters
    {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO characters
             (id, workspace_id, name, aliases, avatar, description, appearance, backstory,
              goals, conflicts, arc, tags, color, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13)",
            params![
                &id,
                workspace_id,
                name,
                serde_json::to_string(aliases)?,
                description,
                appearance,
                backstory,
                goals,
                conflicts,
                arc,
                serde_json::to_string(tags)?,
                color,
                now_str,
            ],
        )?;
        ids.push(id);
    }
    Ok(ids)
}

fn insert_locations(
    conn: &Connection,
    workspace_id: &str,
    now_str: &str,
    locations: &[LocationSeed],
) -> AppResult<Vec<String>> {
    let mut ids = Vec::with_capacity(locations.len());
    for (name, description, pos_x, pos_y, color, icon) in locations {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO locations
             (id, workspace_id, name, description, pos_x, pos_y, color, icon, linked_event_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NULL, ?9, ?9)",
            params![
                &id,
                workspace_id,
                name,
                description,
                pos_x,
                pos_y,
                color,
                icon,
                now_str,
            ],
        )?;
        ids.push(id);
    }
    Ok(ids)
}

fn insert_events(
    conn: &Connection,
    workspace_id: &str,
    now_str: &str,
    events: &[EventSeed],
    tracks: &[String],
    locations: &[String],
    characters: &[String],
) -> AppResult<Vec<String>> {
    let mut ids = Vec::with_capacity(events.len());
    for (i, (title, description, track_idx, location_idx, character_idxs)) in
        events.iter().enumerate()
    {
        let id = Uuid::new_v4().to_string();
        let track_id = tracks.get(*track_idx).cloned().unwrap_or_default();
        let location_id = location_idx.and_then(|idx| locations.get(idx).cloned());
        let character_ids: Vec<String> = character_idxs
            .iter()
            .filter_map(|idx| characters.get(*idx).cloned())
            .collect();
        conn.execute(
            "INSERT INTO events
             (id, workspace_id, track_id, title, description, date_type, date_value,
              sort_order, status, color, location_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 'relative', '', ?6, 'draft', NULL, ?7, ?8, ?8)",
            params![&id, workspace_id, track_id, title, description, i as i64, location_id, now_str],
        )?;
        for cid in &character_ids {
            conn.execute(
                "INSERT OR IGNORE INTO event_characters (event_id, character_id) VALUES (?1, ?2)",
                params![&id, cid],
            )?;
        }
        ids.push(id);
    }
    Ok(ids)
}

fn insert_outline(
    conn: &Connection,
    workspace_id: &str,
    now_str: &str,
    outline: &[OutlineSeed],
) -> AppResult<Vec<String>> {
    let mut ids = Vec::with_capacity(outline.len());
    for (node_type, title, content, parent_idx, sort_order) in outline {
        let id = Uuid::new_v4().to_string();
        let parent_id = parent_idx.and_then(|idx| ids.get(idx).cloned());
        conn.execute(
            "INSERT INTO outline_nodes
             (id, workspace_id, type, title, content, parent_id, sort_order, event_id, status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, 'draft', ?8, ?8)",
            params![
                &id,
                workspace_id,
                node_type,
                title,
                content,
                parent_id,
                sort_order,
                now_str,
            ],
        )?;
        ids.push(id);
    }
    Ok(ids)
}

pub fn update(conn: &Connection, input: UpdateWorkspaceInput) -> AppResult<Workspace> {
    let existing = get(conn, &input.id)?;
    let name = input.name.unwrap_or(existing.name);
    let description = input.description.unwrap_or(existing.description);
    let cover_color = input.cover_color.unwrap_or(existing.cover_color);
    let cover_image = input.cover_image.or(existing.cover_image);
    let settings = input.settings.unwrap_or(existing.settings);
    let settings_str = serde_json::to_string(&settings)?;
    let now_str = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE workspaces SET name=?1, description=?2, cover_color=?3, cover_image=?4, settings_json=?5, updated_at=?6
         WHERE id=?7",
        params![name, description, cover_color, cover_image, settings_str, now_str, input.id],
    )?;
    get(conn, &input.id)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM workspaces WHERE id=?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("工作区 {} 不存在", id)));
    }
    Ok(())
}

/// 导出工作区为完整 Bundle。
pub fn export_bundle(conn: &Connection, workspace_id: &str) -> AppResult<WorkspaceBundle> {
    let scenes = crate::services::vn::list_scenes(conn, workspace_id)?;
    let mut lines = Vec::new();
    for scene in &scenes {
        lines.extend(crate::services::vn::list_lines(conn, &scene.id)?);
    }
    Ok(WorkspaceBundle {
        version: BUNDLE_VERSION,
        workspace: get(conn, workspace_id)?,
        tracks: crate::services::track::list(conn, workspace_id)?,
        events: crate::services::event::list(conn, workspace_id)?,
        characters: crate::services::character::list(conn, workspace_id)?,
        relationships: crate::services::character::list_relationships(conn, workspace_id)?,
        event_connections: crate::services::event::list_connections(conn, workspace_id)?,
        outline_nodes: crate::services::outline::list(conn, workspace_id)?,
        notes: crate::services::note::list(conn, workspace_id)?,
        locations: crate::services::location::list(conn, workspace_id)?,
        location_links: crate::services::location::list_links(conn, workspace_id)?,
        vn_scenes: scenes,
        vn_lines: lines,
    })
}

/// 当前支持的 Bundle 版本号。导出时写入，导入时必须一致。
pub const BUNDLE_VERSION: u32 = 2;

/// 从 Bundle 导入：用新 ID 重建所有数据，避免冲突。
pub fn import_bundle(conn: &Connection, mut bundle: WorkspaceBundle) -> AppResult<Workspace> {
    if bundle.version != BUNDLE_VERSION {
        return Err(AppError::InvalidInput(format!(
            "不支持的 Bundle 版本 {}，当前仅支持版本 {}",
            bundle.version, BUNDLE_VERSION
        )));
    }

    let now = Utc::now();
    let now_str = now.to_rfc3339();
    let new_ws_id = Uuid::new_v4().to_string();

    let tx = conn.unchecked_transaction()?;

    let new_ws = Workspace {
        id: new_ws_id.clone(),
        name: format!("{}（导入）", bundle.workspace.name),
        description: bundle.workspace.description.clone(),
        template: bundle.workspace.template.clone(),
        cover_color: bundle.workspace.cover_color.clone(),
        cover_image: bundle.workspace.cover_image.clone(),
        settings: bundle.workspace.settings.clone(),
        created_at: now,
        updated_at: now,
        event_count: 0,
    };
    tx.execute(
        "INSERT INTO workspaces (id, name, description, template, cover_color, cover_image, settings_json, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            new_ws.id,
            new_ws.name,
            new_ws.description,
            new_ws.template,
            new_ws.cover_color,
            new_ws.cover_image,
            serde_json::to_string(&new_ws.settings)?,
            now_str,
            now_str,
        ],
    )?;

    let mut track_map: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    for t in bundle.tracks.drain(..) {
        let new_id = Uuid::new_v4().to_string();
        track_map.insert(t.id.clone(), new_id.clone());
        tx.execute(
            "INSERT INTO tracks (id, workspace_id, name, color, sort_order, is_visible, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                new_id,
                new_ws_id,
                t.name,
                t.color,
                t.sort_order,
                t.is_visible as i64,
                now_str
            ],
        )?;
    }

    let mut char_map: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    for c in bundle.characters.drain(..) {
        let new_id = Uuid::new_v4().to_string();
        char_map.insert(c.id.clone(), new_id.clone());
        tx.execute(
            "INSERT INTO characters
             (id, workspace_id, name, aliases, avatar, description, appearance, backstory,
              goals, conflicts, arc, tags, color, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                new_id,
                new_ws_id,
                c.name,
                serde_json::to_string(&c.aliases)?,
                c.avatar,
                c.description,
                c.appearance,
                c.backstory,
                c.goals,
                c.conflicts,
                c.arc,
                serde_json::to_string(&c.tags)?,
                c.color,
                now_str,
                now_str,
            ],
        )?;
    }

    let mut event_map: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    for ev in bundle.events.drain(..) {
        let new_id = Uuid::new_v4().to_string();
        event_map.insert(ev.id.clone(), new_id.clone());
        let new_track = track_map.get(&ev.track_id).cloned().unwrap_or_default();
        tx.execute(
            "INSERT INTO events
             (id, workspace_id, track_id, title, description, date_type, date_value,
              sort_order, status, color, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                new_id,
                new_ws_id,
                new_track,
                ev.title,
                ev.description,
                ev.date_type,
                ev.date_value,
                ev.sort_order,
                ev.status,
                ev.color,
                now_str,
                now_str,
            ],
        )?;
        for cid in ev.character_ids.iter() {
            if let Some(new_cid) = char_map.get(cid) {
                tx.execute(
                    "INSERT OR IGNORE INTO event_characters (event_id, character_id) VALUES (?1, ?2)",
                    params![new_id, new_cid],
                )?;
            }
        }
    }

    for rel in bundle.relationships.drain(..) {
        let new_source = char_map.get(&rel.source_id).cloned().unwrap_or_default();
        let new_target = char_map.get(&rel.target_id).cloned().unwrap_or_default();
        let new_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO character_relationships
             (id, workspace_id, source_id, target_id, type, description, strength)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                new_id,
                new_ws_id,
                new_source,
                new_target,
                rel.r#type,
                rel.description,
                rel.strength
            ],
        )?;
    }

    for ec in bundle.event_connections.drain(..) {
        let new_source = event_map.get(&ec.source_id).cloned().unwrap_or_default();
        let new_target = event_map.get(&ec.target_id).cloned().unwrap_or_default();
        tx.execute(
            "INSERT OR IGNORE INTO event_connections (source_id, target_id, type) VALUES (?1, ?2, ?3)",
            params![new_source, new_target, ec.connection_type],
        )?;
    }

    let mut note_map: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    for n in &bundle.notes {
        note_map.insert(n.id.clone(), Uuid::new_v4().to_string());
    }
    let note_ws_id = Some(new_ws_id.clone());
    for n in bundle.notes.drain(..) {
        let new_id = note_map
            .get(&n.id)
            .cloned()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let new_folder = n.folder_id.and_then(|fid| note_map.get(&fid).cloned());
        tx.execute(
            "INSERT INTO notes
             (id, workspace_id, folder_id, title, content, tags, is_folder, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                new_id,
                note_ws_id,
                new_folder,
                n.title,
                n.content,
                serde_json::to_string(&n.tags)?,
                n.is_folder as i64,
                n.sort_order,
                now_str,
                now_str,
            ],
        )?;
    }

    let mut outline_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    for o in &bundle.outline_nodes {
        outline_map.insert(o.id.clone(), Uuid::new_v4().to_string());
    }
    for o in bundle.outline_nodes.drain(..) {
        let new_id = outline_map
            .get(&o.id)
            .cloned()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let new_event = o.event_id.and_then(|eid| event_map.get(&eid).cloned());
        let new_parent = o.parent_id.and_then(|pid| outline_map.get(&pid).cloned());
        tx.execute(
            "INSERT INTO outline_nodes
             (id, workspace_id, type, title, content, parent_id, sort_order, event_id, status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                new_id,
                new_ws_id,
                o.r#type,
                o.title,
                o.content,
                new_parent,
                o.sort_order,
                new_event,
                o.status,
                now_str,
                now_str,
            ],
        )?;
    }

    let mut location_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    for loc in &bundle.locations {
        location_map.insert(loc.id.clone(), Uuid::new_v4().to_string());
    }
    for loc in bundle.locations.drain(..) {
        let new_id = location_map
            .get(&loc.id)
            .cloned()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let new_linked_event = loc
            .linked_event_id
            .and_then(|eid| event_map.get(&eid).cloned());
        let new_char_ids: Vec<String> = loc
            .character_ids
            .iter()
            .filter_map(|cid| char_map.get(cid).cloned())
            .collect();
        tx.execute(
            "INSERT INTO locations
             (id, workspace_id, name, description, pos_x, pos_y, color, icon,
              linked_event_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                new_id,
                new_ws_id,
                loc.name,
                loc.description,
                loc.pos_x,
                loc.pos_y,
                loc.color,
                loc.icon,
                new_linked_event,
                now_str,
                now_str,
            ],
        )?;
        for cid in new_char_ids {
            tx.execute(
                "INSERT OR IGNORE INTO location_characters (location_id, character_id) VALUES (?1, ?2)",
                params![new_id, cid],
            )?;
        }
    }

    for link in bundle.location_links.drain(..) {
        let new_source = location_map
            .get(&link.source_id)
            .cloned()
            .unwrap_or_default();
        let new_target = location_map
            .get(&link.target_id)
            .cloned()
            .unwrap_or_default();
        tx.execute(
            "INSERT OR IGNORE INTO location_links (source_id, target_id, label) VALUES (?1, ?2, ?3)",
            params![new_source, new_target, link.label],
        )?;
    }

    let mut scene_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    for scene in &bundle.vn_scenes {
        scene_map.insert(scene.id.clone(), Uuid::new_v4().to_string());
    }
    for scene in bundle.vn_scenes.drain(..) {
        let new_id = scene_map
            .get(&scene.id)
            .cloned()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let new_outline = scene
            .outline_node_id
            .and_then(|oid| outline_map.get(&oid).cloned());
        tx.execute(
            "INSERT INTO vn_scenes
             (id, workspace_id, title, background, background_asset_path, bgm_path,
              outline_node_id, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                new_id,
                new_ws_id,
                scene.title,
                scene.background,
                scene.background_asset_path,
                scene.bgm_path,
                new_outline,
                scene.sort_order,
                now_str,
                now_str,
            ],
        )?;
    }

    for line in bundle.vn_lines.drain(..) {
        let new_id = Uuid::new_v4().to_string();
        let new_scene = scene_map
            .get(&line.scene_id)
            .cloned()
            .unwrap_or_default();
        let new_character = line
            .character_id
            .and_then(|cid| char_map.get(&cid).cloned());
        let new_choice_target = line
            .choice_target_scene_id
            .and_then(|sid| scene_map.get(&sid).cloned());
        tx.execute(
            "INSERT INTO vn_lines
             (id, scene_id, sort_order, line_type, character_id, speaker_name, text,
              emotion, choice_label, choice_target_scene_id, sprite_asset_path, voice_path, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                new_id,
                new_scene,
                line.sort_order,
                line.line_type,
                new_character,
                line.speaker_name,
                line.text,
                line.emotion,
                line.choice_label,
                new_choice_target,
                line.sprite_asset_path,
                line.voice_path,
                now_str,
            ],
        )?;
    }

    tx.commit()?;
    Ok(new_ws)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrate::run;
    use crate::models::{Event, Note, OutlineNode, Track};
    use tempfile::NamedTempFile;

    fn test_conn() -> Connection {
        let file = NamedTempFile::new().unwrap();
        let conn = Connection::open(file.path()).unwrap();
        conn.pragma_update(None, "foreign_keys", "ON").unwrap();
        run(&conn).unwrap();
        conn
    }

    fn now() -> chrono::DateTime<Utc> {
        Utc::now()
    }

    fn sample_bundle() -> WorkspaceBundle {
        let t = now();
        let ws = Workspace {
            id: "old-ws".into(),
            name: "测试工作区".into(),
            description: "".into(),
            template: "blank".into(),
            cover_color: "#C68A3E".into(),
            cover_image: None,
            settings: serde_json::json!({}),
            created_at: t,
            updated_at: t,
            event_count: 0,
        };
        let track = Track {
            id: "t1".into(),
            workspace_id: "old-ws".into(),
            name: "主线".into(),
            color: "#F4B6C2".into(),
            sort_order: 0,
            is_visible: true,
            created_at: t,
        };
        let event = Event {
            id: "e1".into(),
            workspace_id: "old-ws".into(),
            track_id: "t1".into(),
            title: "开端".into(),
            description: "".into(),
            date_type: "point".into(),
            date_value: "".into(),
            sort_order: 0,
            status: "draft".into(),
            color: None,
            location_id: None,
            image_urls: vec![],
            character_ids: vec![],
            connected_event_ids: vec![],
            created_at: t,
            updated_at: t,
        };
        let folder_note = Note {
            id: "n-folder".into(),
            workspace_id: Some("old-ws".into()),
            folder_id: None,
            title: "素材夹".into(),
            content: "".into(),
            tags: vec![],
            is_folder: true,
            sort_order: 0,
            created_at: t,
            updated_at: t,
        };
        let child_note = Note {
            id: "n-child".into(),
            workspace_id: Some("old-ws".into()),
            folder_id: Some("n-folder".into()),
            title: "灵感".into(),
            content: "记下点东西".into(),
            tags: vec!["idea".into()],
            is_folder: false,
            sort_order: 1,
            created_at: t,
            updated_at: t,
        };
        let parent_outline = OutlineNode {
            id: "o-parent".into(),
            workspace_id: "old-ws".into(),
            r#type: "chapter".into(),
            title: "第一章".into(),
            content: "".into(),
            parent_id: None,
            sort_order: 0,
            event_id: None,
            status: "draft".into(),
            cover_image: None,
            created_at: t,
            updated_at: t,
        };
        let child_outline = OutlineNode {
            id: "o-child".into(),
            workspace_id: "old-ws".into(),
            r#type: "section".into(),
            title: "第一节".into(),
            content: "".into(),
            parent_id: Some("o-parent".into()),
            sort_order: 0,
            event_id: None,
            status: "draft".into(),
            cover_image: None,
            created_at: t,
            updated_at: t,
        };
        WorkspaceBundle {
            version: 2,
            workspace: ws,
            tracks: vec![track],
            events: vec![event],
            characters: vec![],
            relationships: vec![],
            event_connections: vec![],
            outline_nodes: vec![parent_outline, child_outline],
            notes: vec![folder_note, child_note],
            locations: vec![],
            location_links: vec![],
            vn_scenes: vec![],
            vn_lines: vec![],
        }
    }

    #[test]
    fn import_preserves_note_workspace_id() {
        let conn = test_conn();
        let bundle = sample_bundle();
        let old_ws_id = bundle.workspace.id.clone();
        let new_ws = import_bundle(&conn, bundle).unwrap();

        let notes = crate::services::note::list(&conn, &new_ws.id).unwrap();
        assert_eq!(notes.len(), 2);
        for n in &notes {
            assert_eq!(
                n.workspace_id,
                Some(new_ws.id.clone()),
                "imported notes must belong to the new workspace, not the old one"
            );
            assert_ne!(
                n.workspace_id,
                Some(old_ws_id.clone()),
                "imported notes must NOT keep the old workspace_id"
            );
        }
    }

    #[test]
    fn import_preserves_note_folder_hierarchy() {
        let conn = test_conn();
        let bundle = sample_bundle();
        let new_ws = import_bundle(&conn, bundle).unwrap();

        let notes = crate::services::note::list(&conn, &new_ws.id).unwrap();
        let folder = notes
            .iter()
            .find(|n| n.is_folder)
            .expect("folder note missing");
        let child = notes
            .iter()
            .find(|n| !n.is_folder)
            .expect("child note missing");
        assert!(
            child.folder_id.is_some(),
            "child note should have a folder_id after import"
        );
        assert_eq!(
            child.folder_id,
            Some(folder.id.clone()),
            "child note folder_id should point to the remapped folder note id"
        );
    }

    #[test]
    fn import_preserves_outline_parent_hierarchy() {
        let conn = test_conn();
        let bundle = sample_bundle();
        let new_ws = import_bundle(&conn, bundle).unwrap();

        let nodes = crate::services::outline::list(&conn, &new_ws.id).unwrap();
        assert_eq!(nodes.len(), 2, "both outline nodes should be imported");
        let parent = nodes
            .iter()
            .find(|n| n.title == "第一章")
            .expect("parent node missing");
        let child = nodes
            .iter()
            .find(|n| n.title == "第一节")
            .expect("child node missing");
        assert!(parent.parent_id.is_none(), "parent should have no parent");
        assert_eq!(
            child.parent_id,
            Some(parent.id.clone()),
            "child outline node parent_id should point to the remapped parent id"
        );
    }

    #[test]
    fn import_generates_new_workspace_id() {
        let conn = test_conn();
        let bundle = sample_bundle();
        let old_id = bundle.workspace.id.clone();
        let new_ws = import_bundle(&conn, bundle).unwrap();
        assert_ne!(new_ws.id, old_id, "imported workspace should get a new ID");
        assert!(
            new_ws.name.contains("导入"),
            "imported name should have suffix"
        );
    }

    #[test]
    fn import_rejects_incompatible_bundle_version() {
        let conn = test_conn();
        let mut bundle = sample_bundle();
        bundle.version = 999;
        let err = import_bundle(&conn, bundle).unwrap_err();
        match err {
            AppError::InvalidInput(msg) => assert!(msg.contains("999")),
            other => panic!("expected InvalidInput, got {other:?}"),
        }
    }

    #[test]
    fn import_preserves_locations_vn_and_links() {
        let conn = test_conn();
        let mut bundle = sample_bundle();
        let t = now();

        let character = crate::models::Character {
            id: "c1".into(),
            workspace_id: "old-ws".into(),
            name: "艾莉丝".into(),
            aliases: vec![],
            avatar: None,
            description: "".into(),
            appearance: "".into(),
            backstory: "".into(),
            goals: "".into(),
            conflicts: "".into(),
            arc: "".into(),
            tags: vec![],
            color: "".into(),
            event_ids: vec![],
            created_at: t,
            updated_at: t,
        };
        bundle.characters.push(character);

        let loc_a = crate::models::Location {
            id: "loc-a".into(),
            workspace_id: "old-ws".into(),
            name: "王城".into(),
            description: "首都".into(),
            pos_x: 120.0,
            pos_y: 80.0,
            color: "#C68A3E".into(),
            icon: "🏰".into(),
            linked_event_id: Some("e1".into()),
            character_ids: vec!["c1".into()],
            created_at: t,
            updated_at: t,
        };
        let loc_b = crate::models::Location {
            id: "loc-b".into(),
            workspace_id: "old-ws".into(),
            name: "酒馆".into(),
            description: "".into(),
            pos_x: 200.0,
            pos_y: 150.0,
            color: "#A86A2C".into(),
            icon: "🍺".into(),
            linked_event_id: None,
            character_ids: vec![],
            created_at: t,
            updated_at: t,
        };
        bundle.locations.push(loc_a);
        bundle.locations.push(loc_b);
        bundle.location_links.push(crate::models::LocationLink {
            source_id: "loc-a".into(),
            target_id: "loc-b".into(),
            label: "主街道".into(),
            source_name: "王城".into(),
            target_name: "酒馆".into(),
        });

        let scene = crate::models::VnScene {
            id: "vs1".into(),
            workspace_id: "old-ws".into(),
            title: "开场".into(),
            background: "酒馆".into(),
            background_asset_path: Some("assets/old-ws/bg.png".into()),
            bgm_path: Some("assets/old-ws/bgm.ogg".into()),
            outline_node_id: None,
            sort_order: 0,
            created_at: t,
            updated_at: t,
        };
        bundle.vn_scenes.push(scene);
        bundle.vn_lines.push(crate::models::VnLine {
            id: "vl1".into(),
            scene_id: "vs1".into(),
            sort_order: 0,
            line_type: "dialog".into(),
            character_id: Some("c1".into()),
            speaker_name: "艾莉丝".into(),
            text: "欢迎来到王城。".into(),
            emotion: "".into(),
            choice_label: "".into(),
            choice_target_scene_id: None,
            sprite_asset_path: Some("assets/old-ws/sprite.png".into()),
            sprite_position: "center".into(),
            voice_path: None,
            created_at: t,
        });

        let new_ws = import_bundle(&conn, bundle).unwrap();

        let locations = crate::services::location::list(&conn, &new_ws.id).unwrap();
        assert_eq!(locations.len(), 2, "both locations should be imported");
        let linked_event_id = locations.iter().find(|l| l.name == "王城").unwrap().linked_event_id.clone();
        assert!(
            linked_event_id.is_some(),
            "linked event id should be remapped"
        );
        let links = crate::services::location::list_links(&conn, &new_ws.id).unwrap();
        assert_eq!(links.len(), 1, "location link should be imported");
        assert_eq!(links[0].label, "主街道");

        let scenes = crate::services::vn::list_scenes(&conn, &new_ws.id).unwrap();
        assert_eq!(scenes.len(), 1, "VN scene should be imported");
        assert_eq!(scenes[0].background_asset_path, Some("assets/old-ws/bg.png".into()));
        let lines = crate::services::vn::list_lines(&conn, &scenes[0].id).unwrap();
        assert_eq!(lines.len(), 1, "VN line should be imported");
        assert_eq!(lines[0].text, "欢迎来到王城。");
        assert_eq!(lines[0].sprite_asset_path, Some("assets/old-ws/sprite.png".into()));
    }

    #[test]
    fn create_seeds_fantasy_template_in_transaction() {
        let conn = test_conn();
        let input = CreateWorkspaceInput {
            name: "奇幻测试".into(),
            description: None,
            template: Some("blank".into()),
            template_id: Some("fantasy-novel".into()),
            cover_color: None,
            cover_image: None,
        };

        let ws = create(&conn, input).unwrap();

        let tracks = crate::services::track::list(&conn, &ws.id).unwrap();
        let events = crate::services::event::list(&conn, &ws.id).unwrap();
        let characters = crate::services::character::list(&conn, &ws.id).unwrap();
        let locations = crate::services::location::list(&conn, &ws.id).unwrap();
        let outline = crate::services::outline::list(&conn, &ws.id).unwrap();

        assert!(!tracks.is_empty(), "fantasy template should seed tracks");
        assert!(!events.is_empty(), "fantasy template should seed events");
        assert!(!characters.is_empty(), "fantasy template should seed characters");
        assert!(!locations.is_empty(), "fantasy template should seed locations");
        assert!(!outline.is_empty(), "fantasy template should seed outline nodes");

        // 事件应关联到模板生成的轨道上
        let track_ids: std::collections::HashSet<String> =
            tracks.iter().map(|t| t.id.clone()).collect();
        for ev in &events {
            assert!(
                track_ids.contains(&ev.track_id),
                "event {} must belong to a seeded track",
                ev.title
            );
        }
    }

    #[test]
    fn create_seeds_urban_romance_template_in_transaction() {
        let conn = test_conn();
        let input = CreateWorkspaceInput {
            name: "都市言情测试".into(),
            description: None,
            template: Some("blank".into()),
            template_id: Some("urban-romance".into()),
            cover_color: None,
            cover_image: None,
        };

        let ws = create(&conn, input).unwrap();

        let tracks = crate::services::track::list(&conn, &ws.id).unwrap();
        let events = crate::services::event::list(&conn, &ws.id).unwrap();
        let characters = crate::services::character::list(&conn, &ws.id).unwrap();
        let locations = crate::services::location::list(&conn, &ws.id).unwrap();
        let outline = crate::services::outline::list(&conn, &ws.id).unwrap();

        assert!(!tracks.is_empty(), "urban romance template should seed tracks");
        assert!(!events.is_empty(), "urban romance template should seed events");
        assert!(!characters.is_empty(), "urban romance template should seed characters");
        assert!(!locations.is_empty(), "urban romance template should seed locations");
        assert!(!outline.is_empty(), "urban romance template should seed outline nodes");
    }

    #[test]
    fn create_seeds_ttrpg_template_in_transaction() {
        let conn = test_conn();
        let input = CreateWorkspaceInput {
            name: "跑团战役测试".into(),
            description: None,
            template: Some("blank".into()),
            template_id: Some("ttrpg-campaign".into()),
            cover_color: None,
            cover_image: None,
        };

        let ws = create(&conn, input).unwrap();

        let tracks = crate::services::track::list(&conn, &ws.id).unwrap();
        let events = crate::services::event::list(&conn, &ws.id).unwrap();
        let characters = crate::services::character::list(&conn, &ws.id).unwrap();
        let locations = crate::services::location::list(&conn, &ws.id).unwrap();
        let outline = crate::services::outline::list(&conn, &ws.id).unwrap();

        assert!(!tracks.is_empty(), "ttrpg template should seed tracks");
        assert!(!events.is_empty(), "ttrpg template should seed events");
        assert!(!characters.is_empty(), "ttrpg template should seed characters");
        assert!(!locations.is_empty(), "ttrpg template should seed locations");
        assert!(!outline.is_empty(), "ttrpg template should seed outline nodes");
    }

    #[test]
    fn create_legacy_templates_still_seed_tracks() {
        let conn = test_conn();
        for tpl in &["hero-journey", "three-act", "chronicle", "biography", "blank"] {
            let input = CreateWorkspaceInput {
                name: format!("legacy-{}", tpl),
                description: None,
                template: Some((*tpl).into()),
                template_id: None,
                cover_color: None,
                cover_image: None,
            };
            let ws = create(&conn, input).unwrap();
            let tracks = crate::services::track::list(&conn, &ws.id).unwrap();
            assert!(!tracks.is_empty(), "legacy template {} should seed at least one track", tpl);
        }
    }
}
