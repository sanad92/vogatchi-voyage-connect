<?php

/**
 * CacheManager - High-performance caching layer with multiple backends
 * 
 * Supports:
 * - In-memory (runtime) caching
 * - File-based caching
 * - Redis caching (optional)
 * - Query result caching
 * - Cache tags and invalidation
 */
class CacheManager
{
    private static $instance;
    private $runtime_cache = [];
    private $cache_dir;
    private $ttl_default = 3600; // 1 hour default
    private $redis;
    private $use_redis = false;

    private function __construct()
    {
        $this->cache_dir = __DIR__ . '/../storage/cache';
        
        // Create cache directory if needed
        if (!is_dir($this->cache_dir)) {
            @mkdir($this->cache_dir, 0755, true);
        }

        // Try to initialize Redis if available
        try {
            if (extension_loaded('redis')) {
                $this->redis = new Redis();
                if (@$this->redis->connect('127.0.0.1', 6379, 1)) {
                    $this->use_redis = true;
                }
            }
        } catch (Exception $e) {
            // Redis not available, use file cache instead
        }
    }

    /**
     * Get singleton instance
     */
    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Get cached value
     * 
     * @param string $key Cache key
     * @param callable $callback Function to call if cache miss
     * @param int $ttl Time to live in seconds (0 = no expiry)
     * @return mixed
     */
    public function get($key, $callback = null, $ttl = null)
    {
        $ttl = $ttl ?? $this->ttl_default;

        // Check runtime cache first (fastest)
        if (isset($this->runtime_cache[$key])) {
            $cached = $this->runtime_cache[$key];
            if ($cached['expires'] === 0 || time() < $cached['expires']) {
                return $cached['value'];
            }
            unset($this->runtime_cache[$key]);
        }

        // Check Redis if enabled
        if ($this->use_redis) {
            $value = $this->redis->get($key);
            if ($value !== false) {
                $data = unserialize($value);
                $this->runtime_cache[$key] = [
                    'value' => $data,
                    'expires' => time() + $ttl
                ];
                return $data;
            }
        }

        // Check file cache
        $file = $this->getFilePath($key);
        if (file_exists($file)) {
            $data = @unserialize(file_get_contents($file));
            if ($data !== false && $data['expires'] > time()) {
                $this->runtime_cache[$key] = [
                    'value' => $data['value'],
                    'expires' => $data['expires']
                ];
                return $data['value'];
            } else {
                @unlink($file);
            }
        }

        // Cache miss - call callback if provided
        if ($callback === null) {
            return null;
        }

        $value = $callback();
        $this->set($key, $value, $ttl);
        return $value;
    }

    /**
     * Set cache value
     */
    public function set($key, $value, $ttl = null)
    {
        $ttl = $ttl ?? $this->ttl_default;
        $expires = ($ttl === 0) ? 0 : (time() + $ttl);

        // Store in runtime cache
        $this->runtime_cache[$key] = [
            'value' => $value,
            'expires' => $expires
        ];

        // Store in Redis if enabled
        if ($this->use_redis) {
            $ttl_redis = ($ttl === 0) ? 0 : $ttl;
            if ($ttl_redis === 0) {
                $this->redis->set($key, serialize($value));
            } else {
                $this->redis->setex($key, $ttl_redis, serialize($value));
            }
        }

        // Store in file cache
        $file = $this->getFilePath($key);
        @file_put_contents($file, serialize(['value' => $value, 'expires' => $expires]), LOCK_EX);

        return true;
    }

    /**
     * Delete cache entry
     */
    public function delete($key)
    {
        unset($this->runtime_cache[$key]);

        if ($this->use_redis) {
            $this->redis->del($key);
        }

        $file = $this->getFilePath($key);
        if (file_exists($file)) {
            @unlink($file);
        }

        return true;
    }

    /**
     * Delete by pattern (useful for invalidating related keys)
     * e.g., delete('customer_*') deletes all customer-related caches
     */
    public function deletePattern($pattern)
    {
        $count = 0;

        // Runtime cache
        foreach (array_keys($this->runtime_cache) as $key) {
            if ($this->matchesPattern($key, $pattern)) {
                unset($this->runtime_cache[$key]);
                $count++;
            }
        }

        // Redis
        if ($this->use_redis) {
            $keys = $this->redis->keys($pattern);
            if (!empty($keys)) {
                $this->redis->del($keys);
                $count += count($keys);
            }
        }

        // File cache
        $glob_pattern = str_replace('*', '*', $pattern);
        $files = @glob($this->cache_dir . '/' . $glob_pattern);
        if ($files) {
            foreach ($files as $file) {
                @unlink($file);
                $count++;
            }
        }

        return $count;
    }

    /**
     * Clear all caches
     */
    public function flush()
    {
        $this->runtime_cache = [];

        if ($this->use_redis) {
            $this->redis->flushDb();
        }

        array_map('unlink', glob($this->cache_dir . '/*'));
    }

    /**
     * Cache a database query result
     */
    public function cacheQuery($query_key, $query_fn, $ttl = 300)
    {
        return $this->get($query_key, $query_fn, $ttl);
    }

    /**
     * Get cache stats
     */
    public function stats()
    {
        $runtime_size = count($this->runtime_cache);
        $file_count = count(@glob($this->cache_dir . '/*'));
        $redis_info = $this->use_redis ? $this->redis->info() : null;

        return [
            'runtime_entries' => $runtime_size,
            'file_entries' => $file_count,
            'redis_enabled' => $this->use_redis,
            'redis_memory' => $redis_info['used_memory'] ?? null
        ];
    }

    // ========== PRIVATE HELPERS ==========

    private function getFilePath($key)
    {
        $hashed = md5($key);
        $subdir = substr($hashed, 0, 2);
        $dir = $this->cache_dir . '/' . $subdir;
        
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }

        return $dir . '/' . $hashed;
    }

    private function matchesPattern($key, $pattern)
    {
        $regex = str_replace('\\*', '.*', preg_quote($pattern, '/'));
        return preg_match('/^' . $regex . '$/', $key) === 1;
    }
}
