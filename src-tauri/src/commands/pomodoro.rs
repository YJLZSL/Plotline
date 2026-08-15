use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

use crate::error::{AppError, AppResult};

/// C3: 番茄钟专注/休息结束的系统通知。
/// 仅在桌面端调用；通知失败不阻断主流程（前端会以声音 + toast 兜底）。
#[tauri::command]
pub fn send_pomodoro_notification(app: AppHandle, title: String, body: String) -> AppResult<()> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|err| AppError::Internal(format!("系统通知失败: {err}")))?;
    Ok(())
}
