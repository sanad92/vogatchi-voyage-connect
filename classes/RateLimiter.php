<?php
/**
 * RateLimiter
 *
 * Simple token-bucket rate limiter stored in memory/redis.
 * Designed for API endpoints to prevent brute-force and abuse.
 */
class RateLimiter {
    private $storage;
    private $limit;
    private $window; // seconds

    /**
     * @param $storage object must implement get($key), set($key,$value,$ttl)
     *        could be Redis or an array wrapper for testing
     * @param int $limit max requests per window
     * @param int $window window size in seconds
     */
    public function __construct($storage, int $limit = 60, int $window = 60) {
        $this->storage = $storage;
        $this->limit   = $limit;
        $this->window  = $window;
    }

    /**
     * Attempt to consume a token.
     * Returns true if allowed, false if rate limited.
     */
    public function allow(string $key): bool {
        $now = time();
        $data = $this->storage->get($key);

        if (!$data) {
            $bucket = ['tokens' => $this->limit - 1, 'timestamp' => $now];
            $this->storage->set($key, json_encode($bucket), $this->window);
            return true;
        }

        $bucket = json_decode($data, true);
        $elapsed = $now - $bucket['timestamp'];
        $tokens = $bucket['tokens'] + ($elapsed * ($this->limit / $this->window));
        if ($tokens > $this->limit) {
            $tokens = $this->limit;
        }

        if ($tokens < 1) {
            // rate limit exceeded
            return false;
        }

        $tokens -= 1;
        $newBucket = ['tokens' => $tokens, 'timestamp' => $now];
        $this->storage->set($key, json_encode($newBucket), $this->window - $elapsed);

        return true;
    }
}
