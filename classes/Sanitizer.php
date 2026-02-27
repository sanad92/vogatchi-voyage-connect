<?php
/**
 * Sanitizer
 *
 * Centralizes input sanitization routines to protect against XSS, SQL injection
 * and other injection vulnerabilities. Works on arrays recursively.
 */
class Sanitizer {
    /**
     * Recursively sanitize an array or string
     */
    public static function sanitize($input) {
        if (is_array($input)) {
            $output = [];
            foreach ($input as $key => $value) {
                $cleanKey = self::sanitize($key);
                $output[$cleanKey] = self::sanitize($value);
            }
            return $output;
        }

        if (is_string($input)) {
            // strip tags, trim whitespace, convert special chars
            $clean = trim($input);
            $clean = filter_var($clean, FILTER_SANITIZE_STRING, FILTER_FLAG_NO_ENCODE_QUOTES);
            return $clean;
        }

        // numbers, bools, null unaffected
        return $input;
    }

    /**
     * Sanitize numeric input, enforcing integer/float
     */
    public static function sanitizeNumber($input) {
        if (is_numeric($input)) {
            // return as int if no decimal, otherwise float
            return strpos((string)$input, '.') === false ? intval($input) : floatval($input);
        }
        return 0;
    }

    /**
     * Clean HTML allowing a whitelist of tags
     */
    public static function sanitizeHtml($html, $allowedTags = '<p><a><br><strong><em><ul><ol><li>') {
        return strip_tags($html, $allowedTags);
    }
}
