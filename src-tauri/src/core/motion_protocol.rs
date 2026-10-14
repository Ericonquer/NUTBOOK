//! Page ACK and motion ACK are distinct. Only the applied audience state
//! confirms native step and background playback; pending intent is not applied.
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MotionCapabilities {
    pub contract: String,
    pub supports_steps: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum PlaybackStatus { Static, Playing, Paused, Finished }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MotionPlaybackState {
    pub page_id: String,
    pub step_id: Option<String>,
    pub step_index: u32,
    pub playback_status: PlaybackStatus,
    pub logical_time_ms: f64,
    pub background_time_ms: f64,
    pub motion_revision: u64,
}

impl MotionPlaybackState {
    pub fn valid(&self) -> bool {
        fn id(value: &str) -> bool {
            !value.is_empty() && value.len() <= 80
                && value.bytes().all(|byte| byte.is_ascii_alphanumeric() || b"_:-".contains(&byte))
        }
        id(&self.page_id) && self.step_id.as_deref().is_none_or(id)
            && (self.step_index == 0) == self.step_id.is_none()
            && self.step_index <= 256
            && self.logical_time_ms.is_finite() && self.logical_time_ms >= 0.0
            && self.background_time_ms.is_finite() && self.background_time_ms >= 0.0
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MotionAppliedAck {
    pub session_id: String,
    pub generation: u64,
    pub sequence: u64,
    // Deliberately different from the existing page report type.
    #[serde(rename = "type")]
    pub kind: MotionAckKind,
    pub state: MotionPlaybackState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MotionAckKind { #[serde(rename = "motion-applied")] Applied }

#[derive(Debug, Clone)]
pub struct PendingMotionCommand {
    pub session_id: String,
    pub generation: u64,
    pub sequence: u64,
    pub page_id: String,
    pub step_id: Option<String>,
    pub step_index: u32,
    pub motion_revision: u64,
}

impl PendingMotionCommand {
    /// Sending an intent never confirms state. Only its exact audience ACK does.
    pub fn accepts(&self, ack: &MotionAppliedAck, last_confirmed_sequence: u64) -> bool {
        ack.state.valid()
            && ack.session_id == self.session_id && ack.generation == self.generation
            && ack.sequence == self.sequence && ack.sequence > last_confirmed_sequence
            && ack.state.page_id == self.page_id && ack.state.step_id == self.step_id
            && ack.state.step_index == self.step_index && ack.state.motion_revision == self.motion_revision
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn state() -> MotionPlaybackState {
        MotionPlaybackState { page_id: "opening".into(), step_id: Some("action-1".into()), step_index: 1,
            playback_status: PlaybackStatus::Paused, logical_time_ms: 400.0, background_time_ms: 0.0, motion_revision: 3 }
    }
    #[test]
    fn accepts_only_exact_new_audience_ack() {
        let pending = PendingMotionCommand { session_id: "session".into(), generation: 2, sequence: 5,
            page_id: "opening".into(), step_id: Some("action-1".into()), step_index: 1, motion_revision: 3 };
        let ack = MotionAppliedAck { session_id: "session".into(), generation: 2, sequence: 5, kind: MotionAckKind::Applied, state: state() };
        assert!(pending.accepts(&ack, 4));
        assert!(!pending.accepts(&ack, 5));
        let mut old = ack.clone(); old.generation = 1; assert!(!pending.accepts(&old, 4));
        let mut old = ack.clone(); old.sequence = 4; assert!(!pending.accepts(&old, 3));
        let mut old = ack.clone(); old.state.motion_revision = 2; assert!(!pending.accepts(&old, 4));
        let mut old = ack.clone(); old.state.page_id = "other".into(); assert!(!pending.accepts(&old, 4));
        let mut old = ack.clone(); old.state.step_id = Some("other-step".into()); assert!(!pending.accepts(&old, 4));
        let mut old = ack.clone(); old.session_id = "other-session".into(); assert!(!pending.accepts(&old, 4));
        let mut old = ack.clone(); old.state.step_index = 2; assert!(!pending.accepts(&old, 4));
    }
    #[test]
    fn rejects_bad_time_and_page_ack_type() {
        for time in [f64::NAN, f64::INFINITY, -1.0] { let mut s = state(); s.logical_time_ms = time; assert!(!s.valid()); }
        let mut s = state(); s.step_id = None; assert!(!s.valid());
        s.step_index = 0; assert!(s.valid());
        let page_ack = r#"{"sessionId":"s","generation":1,"sequence":1,"type":"page","state":{}}"#;
        assert!(serde_json::from_str::<MotionAppliedAck>(page_ack).is_err());
    }
}
