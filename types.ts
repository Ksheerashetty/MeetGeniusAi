
export interface AuthFix {
  signin_required: boolean;
  email_captured: boolean;
  auth_provider: string | null;
  blocking_reason: string | null;
}

export interface AudioPipelineStatus {
  input_received: boolean;
  file_type: "audio" | "video" | null;
  audio_validated: boolean;
  audio_extracted: boolean;
  transcription_triggered: boolean;
  transcription_completed: boolean;
  transcript_available: boolean;
}

export interface BlockingError {
  is_blocking: boolean;
  reason: string | null;
}

export interface DiagnosticReport {
  diagnosis: {
    audio_access_ok: boolean;
    format_supported: boolean;
    audio_extracted: boolean;
    transcription_called: boolean;
    transcription_response_valid: boolean;
  };
  failure_point: string | null;
  root_cause: string | null;
  required_fix: Array<{
    step: string;
    action: string;
  }>;
  transcript_status: {
    available: boolean;
    length: number;
  };
  pipeline_state: "BLOCKED" | "READY_FOR_EXTRACTION";
}

export interface OutlookFix {
  outlook_ready: boolean;
  missing_prerequisites: string[];
  calendar_execution_ready: boolean;
  email_execution_ready: boolean;
}

export interface EmailPayload {
  to: string;
  subject: string;
  body: {
    contentType: "HTML" | "Text";
    content: string;
  };
}

export interface EmailExecutionIntent {
  intent: "SEND_MEETING_SUMMARY_EMAILS";
  sender: {
    email: string;
    auth_provider: string;
  };
  emails: EmailPayload[];
  blocking_error: {
    is_blocking: boolean;
    reason: string | null;
  };
}

export interface GraphMailPayload extends EmailPayload {
  id: string; // Internal tracking for UI
  status: 'STAGED' | 'SENDING' | 'SENT' | 'FAILED';
}

export interface Attendee {
  name: string;
  email: string | null;
}

export interface ActionItem {
  task: string;
  owner: string | null;
  deadline: string | null;
  confidence_score: number;
}

export interface SharedMeetingTemplate {
  summary: string;
  agenda_items: string[];
  key_discussions: string[];
  decisions: string[];
  action_items: ActionItem[];
}

export interface OrchestrationData {
  auth_fix: AuthFix;
  audio_pipeline_status: AudioPipelineStatus;
  transcript_preview: string | null;
  blocking_error: BlockingError;
  transcription_diagnostic?: DiagnosticReport;
  next_allowed_step: "NONE" | "TRANSCRIPT_READY";
  outlook_fix: OutlookFix;
  email_execution_intent: EmailExecutionIntent;
  next_actions: string[];
  shared_meeting_template?: SharedMeetingTemplate;
  meeting_metadata?: {
    meeting_title: string | null;
    attendees: Attendee[];
    meeting_date?: string;
  };
}

export enum AppStatus {
  IDLE = 'IDLE',
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface User {
  email: string;
  provider: 'google' | 'microsoft' | 'email';
  accessToken?: string;
}
