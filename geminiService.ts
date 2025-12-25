
import { GoogleGenAI, Type } from "@google/genai";
import { OrchestrationData } from "./types";

const SYSTEM_PROMPT = `You are a dual-role Intelligence, Enforcement & Email Orchestration AI.

1. CORE ROLE: Audio-to-Transcript Enforcement & Debugger.
   - Ensure all audio/video is converted to text before intelligence extraction.
   - If transcript is missing, block execution.

2. SECONDARY ROLE: Email Orchestration AI.
   - Prepare EXECUTABLE, AUTHENTICATED email payloads (Microsoft Graph /me/sendMail compatible).
   - Emails must be sent FROM the logged-in user TO meeting attendees.
   - One email per attendee with their personalized to-dos.
   - Body MUST include: Meeting title, Agenda (bulleted), Key decisions, Attendee-specific to-dos, and Next steps.
   - DO NOT include tasks owned by other attendees in a personalized email.
   - If attendee email is missing -> skip that attendee.
   - CRITICAL: Per current testing instructions, ensure 'ksheerashetty@gmail.com' is prioritized as a recipient for consolidated reporting if relevant, but otherwise follow attendee extraction.
   - SENDER email MUST equal the logged_in_user_email provided.

STRICT TRANSCRIPTION RULES:
- NO TRANSCRIPT = NO MEETING PROCESSING.
- If transcript is missing, next_allowed_step MUST be "NONE" and blocking_error.is_blocking MUST be true.

OUTPUT:
- Provide 'email_execution_intent' matching the requested schema.
- 'emails' is an array of recipient-specific payloads.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    auth_fix: {
      type: Type.OBJECT,
      properties: {
        signin_required: { type: Type.BOOLEAN },
        email_captured: { type: Type.BOOLEAN },
        auth_provider: { type: Type.STRING, nullable: true },
        blocking_reason: { type: Type.STRING, nullable: true }
      },
      required: ["signin_required", "email_captured"]
    },
    audio_pipeline_status: {
      type: Type.OBJECT,
      properties: {
        input_received: { type: Type.BOOLEAN },
        file_type: { type: Type.STRING, nullable: true },
        audio_validated: { type: Type.BOOLEAN },
        audio_extracted: { type: Type.BOOLEAN },
        transcription_triggered: { type: Type.BOOLEAN },
        transcription_completed: { type: Type.BOOLEAN },
        transcript_available: { type: Type.BOOLEAN }
      },
      required: ["input_received", "audio_validated", "transcription_triggered", "transcription_completed", "transcript_available"]
    },
    transcription_diagnostic: {
      type: Type.OBJECT,
      properties: {
        diagnosis: {
          type: Type.OBJECT,
          properties: {
            audio_access_ok: { type: Type.BOOLEAN },
            format_supported: { type: Type.BOOLEAN },
            audio_extracted: { type: Type.BOOLEAN },
            transcription_called: { type: Type.BOOLEAN },
            transcription_response_valid: { type: Type.BOOLEAN }
          },
          required: ["audio_access_ok", "format_supported", "audio_extracted", "transcription_called", "transcription_response_valid"]
        },
        failure_point: { type: Type.STRING, nullable: true },
        root_cause: { type: Type.STRING, nullable: true },
        required_fix: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              step: { type: Type.STRING },
              action: { type: Type.STRING }
            },
            required: ["step", "action"]
          }
        },
        transcript_status: {
          type: Type.OBJECT,
          properties: {
            available: { type: Type.BOOLEAN },
            length: { type: Type.NUMBER }
          },
          required: ["available", "length"]
        },
        pipeline_state: { type: Type.STRING }
      },
      required: ["diagnosis", "required_fix", "transcript_status", "pipeline_state"]
    },
    transcript_preview: { type: Type.STRING, nullable: true },
    blocking_error: {
      type: Type.OBJECT,
      properties: {
        is_blocking: { type: Type.BOOLEAN },
        reason: { type: Type.STRING, nullable: true }
      },
      required: ["is_blocking"]
    },
    next_allowed_step: { type: Type.STRING },
    outlook_fix: {
      type: Type.OBJECT,
      properties: {
        outlook_ready: { type: Type.BOOLEAN },
        missing_prerequisites: { type: Type.ARRAY, items: { type: Type.STRING } },
        calendar_execution_ready: { type: Type.BOOLEAN },
        email_execution_ready: { type: Type.BOOLEAN }
      },
      required: ["outlook_ready", "missing_prerequisites", "calendar_execution_ready", "email_execution_ready"]
    },
    email_execution_intent: {
      type: Type.OBJECT,
      properties: {
        intent: { type: Type.STRING },
        sender: {
          type: Type.OBJECT,
          properties: {
            email: { type: Type.STRING },
            auth_provider: { type: Type.STRING }
          },
          required: ["email", "auth_provider"]
        },
        emails: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              to: { type: Type.STRING },
              subject: { type: Type.STRING },
              body: {
                type: Type.OBJECT,
                properties: {
                  contentType: { type: Type.STRING },
                  content: { type: Type.STRING }
                },
                required: ["contentType", "content"]
              }
            },
            required: ["to", "subject", "body"]
          }
        },
        blocking_error: {
          type: Type.OBJECT,
          properties: {
            is_blocking: { type: Type.BOOLEAN },
            reason: { type: Type.STRING, nullable: true }
          },
          required: ["is_blocking"]
        }
      },
      required: ["intent", "sender", "emails", "blocking_error"]
    },
    next_actions: { type: Type.ARRAY, items: { type: Type.STRING } },
    shared_meeting_template: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        summary: { type: Type.STRING },
        agenda_items: { type: Type.ARRAY, items: { type: Type.STRING } },
        key_discussions: { type: Type.ARRAY, items: { type: Type.STRING } },
        decisions: { type: Type.ARRAY, items: { type: Type.STRING } },
        action_items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              task: { type: Type.STRING },
              owner: { type: Type.STRING, nullable: true },
              deadline: { type: Type.STRING, nullable: true },
              confidence_score: { type: Type.NUMBER }
            },
            required: ["task", "confidence_score"]
          }
        }
      }
    }
  },
  required: ["auth_fix", "audio_pipeline_status", "blocking_error", "next_allowed_step", "outlook_fix", "email_execution_intent", "next_actions"]
};

export const runCorrectiveOrchestration = async (
  input: string,
  userEmail: string | null,
  authProvider: string | null,
  isAudio: boolean
): Promise<OrchestrationData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

  try {
    const prompt = `
      LOGGED-IN USER CONTEXT:
      Email: ${userEmail || "MISSING"}
      Provider: ${authProvider || "NONE"}
      
      INPUT DATA:
      ${input}
      
      TASK:
      Generate authenticated email execution payloads for all meeting attendees found in the input. 
      Ensure each email is sent FROM ${userEmail || "unknown"} and contains only that attendee's specific tasks.
      If sender email is missing, the execution MUST be blocked.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Orchestration failed to generate response.");

    return JSON.parse(text) as OrchestrationData;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
