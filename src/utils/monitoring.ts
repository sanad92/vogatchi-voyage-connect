import { supabase } from "@/integrations/supabase/client";

// Get org ID from context - caller must provide it
let _currentOrgId: string | null = null;
let _currentUserId: string | null = null;

export function setMonitoringContext(orgId: string | null, userId: string | null) {
  _currentOrgId = orgId;
  _currentUserId = userId;
}

// ===== Error Tracking =====

export async function trackError(
  error: Error | string,
  options?: {
    component?: string;
    severity?: 'warning' | 'error' | 'critical';
    metadata?: Record<string, any>;
    errorType?: 'client' | 'server' | 'edge_function';
  }
) {
  try {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;

    await supabase.from('error_logs').insert({
      organization_id: _currentOrgId,
      error_type: options?.errorType || 'client',
      error_message: errorMessage,
      error_stack: errorStack,
      component_name: options?.component,
      url: window.location.href,
      user_id: _currentUserId,
      user_agent: navigator.userAgent,
      severity: options?.severity || 'error',
      metadata: options?.metadata || {},
    });
  } catch (e) {
    console.error('Failed to track error:', e);
  }
}

// ===== Performance Monitoring =====

export async function trackPagePerformance() {
  try {
    // Wait for page load to complete
    if (document.readyState !== 'complete') {
      await new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
    }

    // Small delay for metrics to settle
    await new Promise((r) => setTimeout(r, 1000));

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navigation) return;

    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find((e) => e.name === 'first-contentful-paint');

    // Get LCP via PerformanceObserver if available
    let lcpValue: number | undefined;
    try {
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      if (lcpEntries.length > 0) {
        lcpValue = Math.round(lcpEntries[lcpEntries.length - 1].startTime);
      }
    } catch (_) {}

    await supabase.from('performance_logs').insert({
      organization_id: _currentOrgId,
      page_url: window.location.pathname,
      load_time_ms: Math.round(navigation.loadEventEnd - navigation.startTime),
      ttfb_ms: Math.round(navigation.responseStart - navigation.requestStart),
      fcp_ms: fcp ? Math.round(fcp.startTime) : null,
      lcp_ms: lcpValue || null,
      user_id: _currentUserId,
      user_agent: navigator.userAgent,
      connection_type: (navigator as any).connection?.effectiveType || null,
    });
  } catch (e) {
    console.error('Failed to track performance:', e);
  }
}

// ===== Global Error Handler =====

export function initGlobalErrorTracking() {
  window.addEventListener('error', (event) => {
    trackError(event.error || event.message, {
      component: 'global',
      severity: 'error',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    trackError(
      event.reason instanceof Error ? event.reason : String(event.reason),
      {
        component: 'promise',
        severity: 'error',
        metadata: { type: 'unhandled_rejection' },
      }
    );
  });
}

// ===== Audit Trail =====

export async function logAuditAction(
  action: string,
  targetTable?: string,
  targetId?: string,
  details?: Record<string, any>
) {
  try {
    await supabase.from('admin_audit_log').insert({
      action,
      target_table: targetTable,
      target_id: targetId,
      details: details || {},
      organization_id: _currentOrgId,
      user_id: _currentUserId,
    });
  } catch (e) {
    console.error('Failed to log audit action:', e);
  }
}
