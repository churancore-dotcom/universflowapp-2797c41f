import { supabase } from '@/integrations/supabase/client';

export type AuditSeverity = 'info' | 'warn' | 'error' | 'critical';

/**
 * Log a security/audit event. Safe to call from any client context;
 * silently no-ops if Supabase is unavailable so it never breaks UX.
 */
export async function logAuditEvent(
  eventType: string,
  details: Record<string, unknown> = {},
  severity: AuditSeverity = 'info'
): Promise<void> {
  try {
    await supabase.rpc('admin_log_event', {
      p_event_type: eventType,
      p_severity: severity,
      p_details: details as never,
    });
  } catch {
    // Never throw from a logger.
  }
}

/** Convenience helpers */
export const auditLog = {
  loginSuccess: (email?: string) =>
    logAuditEvent('login_success', { email }, 'info'),
  loginFailed: (email?: string, reason?: string) =>
    logAuditEvent('login_failed', { email, reason }, 'warn'),
  logout: () => logAuditEvent('logout', {}, 'info'),
  passwordChange: () => logAuditEvent('password_change', {}, 'info'),
  adminAction: (action: string, target?: string) =>
    logAuditEvent('admin_action', { action, target }, 'info'),
  suspicious: (description: string, meta?: Record<string, unknown>) =>
    logAuditEvent('suspicious_activity', { description, ...meta }, 'warn'),
  subscriptionExpired: (userId: string) =>
    logAuditEvent('subscription_expired', { userId }, 'info'),
};
