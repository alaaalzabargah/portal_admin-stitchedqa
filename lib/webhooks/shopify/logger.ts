/**
 * Structured JSON Logger for Webhooks
 * 
 * Provides structured logging with trace_id, PII masking, and performance tracking.
 */

// ============ TYPES ============

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
    traceId: string;
    topic?: string;
    resourceId?: string;
    payloadHash?: string;
    durationMs?: number;
    outcome?: 'success' | 'skipped' | 'failed' | 'unknown';
    error?: string;
    [key: string]: unknown;
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    traceId: string;
    topic?: string;
    resourceId?: string;
    payloadHash?: string;
    durationMs?: number;
    outcome?: string;
    error?: string;
    [key: string]: unknown;
}

// ============ PII MASKING ============

/**
 * Mask email address: show first 2 chars + domain
 * "john.doe@example.com" -> "jo***@example.com"
 */
export function maskEmail(email: string | null | undefined): string {
    if (!email) return '[no-email]';
    const [local, domain] = email.split('@');
    if (!domain) return '***@***';
    const maskedLocal = local.length > 2
        ? local.substring(0, 2) + '***'
        : '***';
    return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone number: show last 4 digits
 * "+1234567890" -> "***7890"
 */
export function maskPhone(phone: string | null | undefined): string {
    if (!phone) return '[no-phone]';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '****';
    return '***' + digits.slice(-4);
}

/**
 * Mask name: show first letter only
 * "John Doe" -> "J*** D***"
 */
export function maskName(name: string | null | undefined): string {
    if (!name) return '[no-name]';
    return name.split(' ').map(part =>
        part.length > 0 ? part[0] + '***' : '***'
    ).join(' ');
}

// ============ TRACE ID GENERATION ============

/**
 * Generate a unique trace ID for request tracking
 */
export function generateTraceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `wh_${timestamp}_${random}`;
}

// ============ LOGGER CLASS ============

class WebhookLogger {
    private traceId: string;
    private startTime: number;
    private context: Partial<LogContext>;

    constructor(traceId?: string) {
        this.traceId = traceId ?? generateTraceId();
        this.startTime = Date.now();
        this.context = {};
    }

    /**
     * Set context that will be included in all subsequent logs
     */
    setContext(ctx: Partial<LogContext>): this {
        this.context = { ...this.context, ...ctx };
        return this;
    }

    /**
     * Get the trace ID
     */
    getTraceId(): string {
        return this.traceId;
    }

    /**
     * Get elapsed time since logger creation
     */
    getElapsedMs(): number {
        return Date.now() - this.startTime;
    }

    /**
     * Create a log entry
     */
    private createEntry(level: LogLevel, message: string, extra?: Record<string, unknown>): LogEntry {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            traceId: this.traceId,
            ...this.context,
            durationMs: this.getElapsedMs(),
            ...extra,
        };
    }

    /**
     * Output log entry (using console for now, could be replaced with external service)
     */
    private output(entry: LogEntry): void {
        // Use structured JSON output
        const jsonOutput = JSON.stringify(entry);

        switch (entry.level) {
            case 'error':
                console.error(jsonOutput);
                break;
            case 'warn':
                console.warn(jsonOutput);
                break;
            case 'debug':
                // Only log debug in development
                if (process.env.NODE_ENV !== 'production') {
                    console.log(jsonOutput);
                }
                break;
            default:
                console.log(jsonOutput);
        }
    }

    debug(message: string, extra?: Record<string, unknown>): void {
        this.output(this.createEntry('debug', message, extra));
    }

    info(message: string, extra?: Record<string, unknown>): void {
        this.output(this.createEntry('info', message, extra));
    }

    warn(message: string, extra?: Record<string, unknown>): void {
        this.output(this.createEntry('warn', message, extra));
    }

    error(message: string, error?: Error | string, extra?: Record<string, unknown>): void {
        const errorMessage = error instanceof Error ? error.message : error;
        this.output(this.createEntry('error', message, {
            error: errorMessage,
            ...extra
        }));
    }

    /**
     * Log webhook received
     */
    webhookReceived(topic: string, resourceId: string, payloadHash: string): void {
        this.setContext({ topic, resourceId, payloadHash });
        this.info('Webhook received', { outcome: 'pending' });
    }

    /**
     * Log webhook processed successfully
     */
    webhookProcessed(): void {
        this.info('Webhook processed', { outcome: 'success' });
    }

    /**
     * Log webhook skipped (duplicate)
     */
    webhookSkipped(reason: string): void {
        this.info(`Webhook skipped: ${reason}`, { outcome: 'skipped' });
    }

    /**
     * Log webhook failed
     */
    webhookFailed(error: Error | string): void {
        this.error('Webhook processing failed', error, { outcome: 'failed' });
    }

    /**
     * Log validation error
     */
    validationFailed(error: string): void {
        this.warn(`Validation failed: ${error}`, { outcome: 'failed' });
    }
}

/**
 * Create a new logger instance for a webhook request
 */
export function createWebhookLogger(traceId?: string): WebhookLogger {
    return new WebhookLogger(traceId);
}

export type { WebhookLogger };
