<?php
/**
 * Response
 *
 * Unified JSON response structure. All API controllers should use this helper.
 */
class Response {
    public static function success($data = [], $message = '', $code = 200) {
        http_response_code($code);
        return json_encode([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('c')
        ]);
    }

    public static function error($message = '', $code = 400, $errors = []) {
        http_response_code($code);
        return json_encode([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
            'timestamp' => date('c')
        ]);
    }

    public static function rateLimited($retryAfter = 60) {
        http_response_code(429);
        header("Retry-After: {$retryAfter}");
        return json_encode([
            'success' => false,
            'message' => 'Too many requests, please try again later.',
            'retry_after' => $retryAfter,
            'timestamp' => date('c')
        ]);
    }
}
