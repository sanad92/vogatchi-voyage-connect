<?php
/**
 * ErrorHandler
 *
 * Centralized exception handler that converts thrown Exceptions into
 * standardized JSON responses and logs them if necessary.
 */
class ErrorHandler {
    public static function handle(Exception $e) {
        // Log the exception both to PHP log and our error_logs table
        error_log("[ERROR] " . $e->getMessage() . " in " . $e->getFile() .":" . $e->getLine());
        if (class_exists('Logger')) {
            Logger::error($e->getMessage(), 'error', [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'stack' => $e->getTraceAsString()
            ]);
        }

        // Determine status code
        $code = 500;
        if (method_exists($e, 'getCode') && is_int($e->getCode()) && $e->getCode() >= 400 && $e->getCode() < 600) {
            $code = $e->getCode();
        }

        // Prevent leaking sensitive info in production
        $message = $code === 500 ? 'Internal server error' : $e->getMessage();

        // Return unified error response
        echo Response::error($message, $code);
        exit;
    }
}
