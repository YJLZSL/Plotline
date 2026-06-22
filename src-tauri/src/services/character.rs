use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::models::{
    Character, CharacterRelationship, CreateCharacterInput, CreateRelationshipInput,
    UpdateCharacterInput, UpdateRelationshipInput,
};

fn parse_json_array(s: &str) -> Vec<String> {
    serde_json::from_str(s).unwrap_or_default()
}

pub fn list(conn: &Connection, workspace_id: &str) -> AppResult<Vec<Character>> {
    let mut stmt = conn.prepare(
        "SELECT id, workspace_id, name, aliases, avatar, description, appearance,
                backstory, goals, conflicts, arc, tags, color, created_at, updated_at
         FROM characters WHERE workspace_id = ?1 ORDER BY created_at ASC",
    )?;
    let rows = stmt.query_map(params![workspace_id], |row| {
        let aliases: String = row.get(3)?;
        let tags: String = row.get(11)?;
        Ok(Character {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            name: row.get(2)?,
            aliases: parse_json_array(&aliases),
            avatar: row.get(4)?,
            description: row.get(5)?,
            appearance: row.get(6)?,
            backstory: row.get(7)?,
            goals: row.get(8)?,
            conflicts: row.get(9)?,
            arc: row.get(10)?,
            tags: parse_json_array(&tags),
            color: row.get(12)?,
            event_ids: Vec::new(),
            created_at: row.get(13)?,
            updated_at: row.get(14)?,
        })
    })?;
    let mut characters: Vec<Character> = rows.collect::<Result<_, _>>()?;
    for c in characters.iter_mut() {
        c.event_ids = list_event_ids(conn, &c.id)?;
    }
    Ok(characters)
}

fn list_event_ids(conn: &Connection, character_id: &str) -> AppResult<Vec<String>> {
    let mut stmt =
        conn.prepare("SELECT event_id FROM event_characters WHERE character_id = ?1")?;
    let rows = stmt.query_map(params![character_id], |r| r.get::<_, String>(0))?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn get(conn: &Connection, id: &str) -> AppResult<Character> {
    let mut stmt = conn.prepare(
        "SELECT id, workspace_id, name, aliases, avatar, description, appearance,
                backstory, goals, conflicts, arc, tags, color, created_at, updated_at
         FROM characters WHERE id = ?1",
    )?;
    let mut character = stmt
        .query_row(params![id], |row| {
            let aliases: String = row.get(3)?;
            let tags: String = row.get(11)?;
            Ok(Character {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                name: row.get(2)?,
                aliases: parse_json_array(&aliases),
                avatar: row.get(4)?,
                description: row.get(5)?,
                appearance: row.get(6)?,
                backstory: row.get(7)?,
                goals: row.get(8)?,
                conflicts: row.get(9)?,
                arc: row.get(10)?,
                tags: parse_json_array(&tags),
                color: row.get(12)?,
                event_ids: Vec::new(),
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
            })
        })
        .map_err(|_| AppError::NotFound(format!("角色 {} 不存在", id)))?;
    character.event_ids = list_event_ids(conn, id)?;
    Ok(character)
}

pub fn create(conn: &Connection, input: CreateCharacterInput) -> AppResult<Character> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let now_str = now.to_rfc3339();
    let aliases = serde_json::to_string(&Vec::<String>::new())?;
    let tags = serde_json::to_string(&input.tags.unwrap_or_default())?;
    let color = input.color.unwrap_or_else(|| "#F4B6C2".into());
    conn.execute(
        "INSERT INTO characters
         (id, workspace_id, name, aliases, avatar, description, appearance, backstory,
          goals, conflicts, arc, tags, color, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, NULL, ?5, '', '', '', '', '', ?6, ?7, ?8, ?9)",
        params![
            id,
            input.workspace_id,
            input.name,
            aliases,
            input.description.unwrap_or_default(),
            tags,
            color,
            now_str,
            now_str,
        ],
    )?;
    get(conn, &id)
}

pub fn update(conn: &Connection, input: UpdateCharacterInput) -> AppResult<Character> {
    let existing = get(conn, &input.id)?;
    let name = input.name.unwrap_or(existing.name);
    let aliases = input.aliases.unwrap_or(existing.aliases);
    let aliases_str = serde_json::to_string(&aliases)?;
    let avatar = input.avatar.unwrap_or(existing.avatar);
    let description = input.description.unwrap_or(existing.description);
    let appearance = input.appearance.unwrap_or(existing.appearance);
    let backstory = input.backstory.unwrap_or(existing.backstory);
    let goals = input.goals.unwrap_or(existing.goals);
    let conflicts = input.conflicts.unwrap_or(existing.conflicts);
    let arc = input.arc.unwrap_or(existing.arc);
    let tags = input.tags.unwrap_or(existing.tags);
    let tags_str = serde_json::to_string(&tags)?;
    let color = input.color.unwrap_or(existing.color);
    let now_str = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE characters SET name=?1, aliases=?2, avatar=?3, description=?4,
            appearance=?5, backstory=?6, goals=?7, conflicts=?8, arc=?9, tags=?10,
            color=?11, updated_at=?12 WHERE id=?13",
        params![
            name,
            aliases_str,
            avatar,
            description,
            appearance,
            backstory,
            goals,
            conflicts,
            arc,
            tags_str,
            color,
            now_str,
            input.id,
        ],
    )?;
    get(conn, &input.id)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM characters WHERE id=?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("角色 {} 不存在", id)));
    }
    Ok(())
}

pub fn list_relationships(conn: &Connection, workspace_id: &str) -> AppResult<Vec<CharacterRelationship>> {
    let mut stmt = conn.prepare(
        "SELECT id, workspace_id, source_id, target_id, type, description, strength
         FROM character_relationships WHERE workspace_id = ?1",
    )?;
    let rows = stmt.query_map(params![workspace_id], |row| {
        Ok(CharacterRelationship {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            source_id: row.get(2)?,
            target_id: row.get(3)?,
            r#type: row.get(4)?,
            description: row.get(5)?,
            strength: row.get(6)?,
        })
    })?;
    rows.collect::<Result<_, _>>().map_err(Into::into)
}

pub fn create_relationship(
    conn: &Connection,
    input: CreateRelationshipInput,
) -> AppResult<CharacterRelationship> {
    let id = Uuid::new_v4().to_string();
    let rtype = input.relationship_type.unwrap_or_else(|| "friend".into());
    let strength = input.strength.unwrap_or(3).clamp(1, 5);
    conn.execute(
        "INSERT INTO character_relationships
         (id, workspace_id, source_id, target_id, type, description, strength)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            id,
            input.workspace_id,
            input.source_id,
            input.target_id,
            rtype,
            input.description.unwrap_or_default(),
            strength,
        ],
    )?;
    let mut stmt = conn.prepare(
        "SELECT id, workspace_id, source_id, target_id, type, description, strength
         FROM character_relationships WHERE id=?1",
    )?;
    stmt.query_row(params![id], |row| {
        Ok(CharacterRelationship {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            source_id: row.get(2)?,
            target_id: row.get(3)?,
            r#type: row.get(4)?,
            description: row.get(5)?,
            strength: row.get(6)?,
        })
    })
    .map_err(Into::into)
}

pub fn update_relationship(
    conn: &Connection,
    input: UpdateRelationshipInput,
) -> AppResult<CharacterRelationship> {
    let existing = conn.query_row(
        "SELECT id, workspace_id, source_id, target_id, type, description, strength
         FROM character_relationships WHERE id=?1",
        params![input.id],
        |row| {
            Ok(CharacterRelationship {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                source_id: row.get(2)?,
                target_id: row.get(3)?,
                r#type: row.get(4)?,
                description: row.get(5)?,
                strength: row.get(6)?,
            })
        },
    )?;
    let rtype = input.relationship_type.unwrap_or(existing.r#type);
    let description = input.description.unwrap_or(existing.description);
    let strength = input.strength.unwrap_or(existing.strength).clamp(1, 5);
    conn.execute(
        "UPDATE character_relationships SET type=?1, description=?2, strength=?3 WHERE id=?4",
        params![rtype, description, strength, input.id],
    )?;
    let mut stmt = conn.prepare(
        "SELECT id, workspace_id, source_id, target_id, type, description, strength
         FROM character_relationships WHERE id=?1",
    )?;
    stmt.query_row(params![input.id], |row| {
        Ok(CharacterRelationship {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            source_id: row.get(2)?,
            target_id: row.get(3)?,
            r#type: row.get(4)?,
            description: row.get(5)?,
            strength: row.get(6)?,
        })
    })
    .map_err(Into::into)
}

pub fn delete_relationship(conn: &Connection, id: &str) -> AppResult<()> {
    let affected =
        conn.execute("DELETE FROM character_relationships WHERE id=?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("关系 {} 不存在", id)));
    }
    Ok(())
}
