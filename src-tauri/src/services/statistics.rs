use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use crate::error::AppResult;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Statistics {
    pub workspace_id: String,
    pub total_events: i64,
    pub total_characters: i64,
    pub total_tracks: i64,
    pub total_notes: i64,
    pub total_outline_nodes: i64,
    pub status_breakdown: StatusBreakdown,
    pub character_appearances: Vec<CharacterAppearance>,
    pub track_event_counts: Vec<TrackEventCount>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusBreakdown {
    pub draft: i64,
    pub done: i64,
    pub revise: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterAppearance {
    pub character_id: String,
    pub character_name: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackEventCount {
    pub track_id: String,
    pub track_name: String,
    pub count: i64,
}

pub fn get(conn: &Connection, workspace_id: &str) -> AppResult<Statistics> {
    let total_events: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM events WHERE workspace_id=?1",
            params![workspace_id],
            |r| r.get(0),
        )
        .unwrap_or(0);
    let total_characters: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM characters WHERE workspace_id=?1",
            params![workspace_id],
            |r| r.get(0),
        )
        .unwrap_or(0);
    let total_tracks: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM tracks WHERE workspace_id=?1",
            params![workspace_id],
            |r| r.get(0),
        )
        .unwrap_or(0);
    let total_notes: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM notes WHERE workspace_id=?1",
            params![workspace_id],
            |r| r.get(0),
        )
        .unwrap_or(0);
    let total_outline_nodes: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM outline_nodes WHERE workspace_id=?1",
            params![workspace_id],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let draft: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM events WHERE workspace_id=?1 AND status='draft'",
            params![workspace_id],
            |r| r.get(0),
        )
        .unwrap_or(0);
    let done: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM events WHERE workspace_id=?1 AND status='done'",
            params![workspace_id],
            |r| r.get(0),
        )
        .unwrap_or(0);
    let revise: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM events WHERE workspace_id=?1 AND status='revise'",
            params![workspace_id],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let mut stmt = conn.prepare(
        "SELECT c.id, c.name, COUNT(ec.event_id) AS cnt
         FROM characters c
         LEFT JOIN event_characters ec ON ec.character_id = c.id
         WHERE c.workspace_id=?1
         GROUP BY c.id, c.name
         ORDER BY cnt DESC, c.name ASC
         LIMIT 20",
    )?;
    let rows = stmt.query_map(params![workspace_id], |row| {
        Ok(CharacterAppearance {
            character_id: row.get(0)?,
            character_name: row.get(1)?,
            count: row.get(2)?,
        })
    })?;
    let character_appearances: Vec<CharacterAppearance> = rows.collect::<Result<_, _>>()?;

    let mut stmt = conn.prepare(
        "SELECT t.id, t.name, COUNT(e.id) AS cnt
         FROM tracks t
         LEFT JOIN events e ON e.track_id = t.id
         WHERE t.workspace_id=?1
         GROUP BY t.id, t.name
         ORDER BY t.sort_order ASC",
    )?;
    let rows = stmt.query_map(params![workspace_id], |row| {
        Ok(TrackEventCount {
            track_id: row.get(0)?,
            track_name: row.get(1)?,
            count: row.get(2)?,
        })
    })?;
    let track_event_counts: Vec<TrackEventCount> = rows.collect::<Result<_, _>>()?;

    Ok(Statistics {
        workspace_id: workspace_id.to_string(),
        total_events,
        total_characters,
        total_tracks,
        total_notes,
        total_outline_nodes,
        status_breakdown: StatusBreakdown {
            draft,
            done,
            revise,
        },
        character_appearances,
        track_event_counts,
    })
}
