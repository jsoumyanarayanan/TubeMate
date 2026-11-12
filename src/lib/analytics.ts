// src/lib/analytics.ts
// Console logging for now. Replace the body with the analytics provider call.
export type AnalyticsEvent = 'sign_up' | 'upgrade' | 'token_purchase' | 'tip' | 'call_start' | 'ai_chat_start' | 'share' | 'prompt_shown' | 'experiment_assigned'
export const track = (event: AnalyticsEvent, props: Record<string, unknown> = {}) => console.log('[analytics]', event, props)
