use crate::models::AiActionType;

const MARKDOWN_HINT: &str = "请使用 Markdown 格式（**粗体**、*斜体*、`代码`、列表、标题、引用）以便界面正确渲染。";

pub fn system_prompt_for_action(action: AiActionType) -> &'static str {
    match action {
        AiActionType::OptimizeEvent => {
            "你是 Plotline 的 AI 创作助手。请针对用户提供的事件进行优化：改进标题、精炼描述、检查日期/状态一致性，并给出修改建议。保持简洁，用中文回答。"
        }
        AiActionType::OptimizeTimelineSegment => {
            "你是 Plotline 的 AI 创作助手。请分析用户提供的时间轴片段（若干事件），指出节奏、逻辑和叙事上的问题，并给出优化建议。保持简洁，用中文回答。"
        }
        AiActionType::SummarizeWorkspace => {
            "你是 Plotline 的 AI 创作助手。请根据提供的工作区资料生成一段结构化的摘要，包括核心设定、主要角色、关键事件和当前进度。保持简洁，用中文回答。"
        }
        AiActionType::CheckTimelineConsistency => {
            "你是 Plotline 的 AI 创作助手。请检查用户提供的时间轴与角色、地点、大纲等资料之间是否存在逻辑矛盾或漏洞，列出问题并给出修改建议。保持简洁，用中文回答。"
        }
    }
}

pub fn system_prompt_for_action_with_markdown(action: AiActionType) -> String {
    format!("{} {}", system_prompt_for_action(action), MARKDOWN_HINT)
}

pub fn user_prompt_for_action(action: AiActionType) -> &'static str {
    match action {
        AiActionType::OptimizeEvent => "请优化下面这个事件。",
        AiActionType::OptimizeTimelineSegment => "请优化以下时间轴片段。",
        AiActionType::SummarizeWorkspace => "请总结整个工作区。",
        AiActionType::CheckTimelineConsistency => "请检查时间轴的逻辑一致性。",
    }
}
