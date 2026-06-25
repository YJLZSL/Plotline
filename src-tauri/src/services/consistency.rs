use std::collections::HashMap;

use serde::Serialize;

use crate::models::event::Event;

/// 一致性冲突：同一角色在同一时间点（`date_value`）出现在多个不同 `track_id` 的事件上。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Conflict {
    pub character_id: String,
    pub date_value: String,
    pub event_ids: Vec<String>,
    pub track_ids: Vec<String>,
}

/// 在事件列表中检测"同一角色同一时间点出现在多个轨道"的冲突。
///
/// 设计权衡：
/// - 第三阶段先做最轻量的实现：基于 `date_value` 字符串相等做时间点判等。
/// - 不处理跨日期段的区间冲突（如"事件 A 持续 3 天 vs 事件 B 在第 2 天发生"），
///   PRD §8 后续阶段可在此基础上扩展。
pub fn check_event_conflicts(events: &[Event]) -> Vec<Conflict> {
    // 按 (character_id, date_value) 聚合事件。
    let mut buckets: HashMap<(String, String), Vec<&Event>> = HashMap::new();
    for event in events {
        if event.date_value.is_empty() {
            continue;
        }
        for character_id in &event.character_ids {
            buckets
                .entry((character_id.clone(), event.date_value.clone()))
                .or_default()
                .push(event);
        }
    }

    let mut conflicts: Vec<Conflict> = buckets
        .into_iter()
        .filter_map(|((character_id, date_value), bucket)| {
            // 不同 track 才算冲突。
            let mut track_ids: Vec<String> = bucket.iter().map(|e| e.track_id.clone()).collect();
            track_ids.sort();
            track_ids.dedup();
            if track_ids.len() < 2 {
                return None;
            }
            let mut event_ids: Vec<String> = bucket.iter().map(|e| e.id.clone()).collect();
            event_ids.sort();
            Some(Conflict {
                character_id,
                date_value,
                event_ids,
                track_ids,
            })
        })
        .collect();

    conflicts.sort_by(|a, b| {
        a.character_id
            .cmp(&b.character_id)
            .then(a.date_value.cmp(&b.date_value))
    });
    conflicts
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn event(id: &str, track: &str, date: &str, characters: &[&str]) -> Event {
        Event {
            id: id.to_string(),
            workspace_id: "w1".into(),
            track_id: track.to_string(),
            title: String::new(),
            description: String::new(),
            date_type: "absolute".into(),
            date_value: date.to_string(),
            sort_order: 0,
            status: "draft".into(),
            color: None,
            location_id: None,
            character_ids: characters.iter().map(|s| s.to_string()).collect(),
            connected_event_ids: Vec::new(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn no_conflict_when_same_track() {
        let events = vec![
            event("e1", "t1", "2025-01-01", &["c1"]),
            event("e2", "t1", "2025-01-01", &["c1"]),
        ];
        assert!(check_event_conflicts(&events).is_empty());
    }

    #[test]
    fn detects_same_character_across_tracks() {
        let events = vec![
            event("e1", "t1", "2025-01-01", &["c1", "c2"]),
            event("e2", "t2", "2025-01-01", &["c1"]),
        ];
        let conflicts = check_event_conflicts(&events);
        assert_eq!(conflicts.len(), 1);
        assert_eq!(conflicts[0].character_id, "c1");
        assert_eq!(conflicts[0].track_ids, vec!["t1", "t2"]);
    }

    #[test]
    fn ignores_empty_date_value() {
        let events = vec![
            event("e1", "t1", "", &["c1"]),
            event("e2", "t2", "", &["c1"]),
        ];
        assert!(check_event_conflicts(&events).is_empty());
    }
}
