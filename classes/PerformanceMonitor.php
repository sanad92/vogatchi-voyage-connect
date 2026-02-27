<?php

/**
 * PerformanceMonitor - Track and analyze system performance
 * 
 * Provides:
 * - Query profiling
 * - Slow query detection
 * - Memory usage tracking
 * - Request timing
 * - Performance baselines
 */
class PerformanceMonitor
{
    private static $instance;
    private $start_time;
    private $start_memory;
    private $queries = [];
    private $slow_queries = [];
    private $slow_query_threshold = 100; // ms
    private $enabled = true;

    private function __construct()
    {
        $this->start_time = microtime(true);
        $this->start_memory = memory_get_usage(true);
    }

    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Mark the start of an operation
     */
    public function startTimer($operation_name)
    {
        return [
            'name' => $operation_name,
            'start_time' => microtime(true),
            'start_memory' => memory_get_usage(true)
        ];
    }

    /**
     * Record query performance
     */
    public function recordQuery($query, $duration_ms, $rows_affected = 0)
    {
        if (!$this->enabled) {
            return;
        }

        $record = [
            'query' => mb_substr($query, 0, 200), // Truncate long queries
            'duration_ms' => $duration_ms,
            'rows_affected' => $rows_affected,
            'timestamp' => microtime(true)
        ];

        $this->queries[] = $record;

        if ($duration_ms > $this->slow_query_threshold) {
            $this->slow_queries[] = $record;
            error_log("SLOW QUERY ({$duration_ms}ms): " . substr($query, 0, 100));
        }
    }

    /**
     * End operation and get metrics
     */
    public function endTimer($timer)
    {
        $duration = microtime(true) - $timer['start_time'];
        $memory_used = (memory_get_usage(true) - $timer['start_memory']) / (1024 * 1024);

        return [
            'name' => $timer['name'],
            'duration_ms' => round($duration * 1000, 2),
            'memory_used_mb' => round($memory_used, 2),
            'memory_peak_mb' => round(memory_get_peak_usage(true) / (1024 * 1024), 2)
        ];
    }

    /**
     * Get performance summary
     */
    public function getSummary()
    {
        $total_time_ms = (microtime(true) - $this->start_time) * 1000;
        $total_memory_mb = (memory_get_usage(true) - $this->start_memory) / (1024 * 1024);
        $peak_memory_mb = memory_get_peak_usage(true) / (1024 * 1024);

        return [
            'total_time_ms' => round($total_time_ms, 2),
            'total_memory_mb' => round($total_memory_mb, 2),
            'peak_memory_mb' => round($peak_memory_mb, 2),
            'total_queries' => count($this->queries),
            'slow_queries' => count($this->slow_queries),
            'avg_query_ms' => count($this->queries) > 0 
                ? round(array_sum(array_column($this->queries, 'duration_ms')) / count($this->queries), 2)
                : 0,
            'max_query_ms' => count($this->queries) > 0
                ? max(array_column($this->queries, 'duration_ms'))
                : 0
        ];
    }

    /**
     * Get slowest queries
     */
    public function getSlowestQueries($limit = 10)
    {
        usort($this->queries, function($a, $b) {
            return $b['duration_ms'] <=> $a['duration_ms'];
        });

        return array_slice($this->queries, 0, $limit);
    }

    /**
     * Get query frequency (detect N+1 patterns)
     */
    public function getQueryFrequency()
    {
        $frequency = [];

        foreach ($this->queries as $query) {
            $normalized = $this->normalizeQuery($query['query']);
            if (!isset($frequency[$normalized])) {
                $frequency[$normalized] = [
                    'count' => 0,
                    'total_time_ms' => 0,
                    'sample_query' => $query['query']
                ];
            }
            $frequency[$normalized]['count']++;
            $frequency[$normalized]['total_time_ms'] += $query['duration_ms'];
        }

        // Sort by count (most repeated first)
        uasort($frequency, function($a, $b) {
            return $b['count'] <=> $a['count'];
        });

        return $frequency;
    }

    /**
     * Detect N+1 query problems
     */
    public function detectNPlusOne()
    {
        $frequency = $this->getQueryFrequency();
        $issues = [];

        foreach ($frequency as $pattern => $data) {
            if ($data['count'] > 5) {
                $issues[] = [
                    'pattern' => $pattern,
                    'repetitions' => $data['count'],
                    'total_time_ms' => round($data['total_time_ms'], 2),
                    'avg_time_ms' => round($data['total_time_ms'] / $data['count'], 2),
                    'recommendation' => 'Use batch query or eager loading instead of N+1 pattern',
                    'example_query' => $data['sample_query']
                ];
            }
        }

        return $issues;
    }

    /**
     * Get memory usage breakdown
     */
    public function getMemoryUsage()
    {
        return [
            'current_mb' => round(memory_get_usage(true) / (1024 * 1024), 2),
            'peak_mb' => round(memory_get_peak_usage(true) / (1024 * 1024), 2),
            'limit_mb' => round($this->parseBytes(ini_get('memory_limit')) / (1024 * 1024), 2),
            'percent_used' => round((memory_get_usage(true) / $this->parseBytes(ini_get('memory_limit'))) * 100, 1)
        ];
    }

    /**
     * Generate HTML report for debugging
     */
    public function generateHTMLReport()
    {
        $summary = $this->getSummary();
        $slowest = $this->getSlowestQueries(20);
        $frequency = $this->getQueryFrequency();
        $nplusone = $this->detectNPlusOne();
        $memory = $this->getMemoryUsage();

        ob_start();
        ?>
        <!DOCTYPE html>
        <html>
        <head>
            <title>Performance Report</title>
            <style>
                body { font-family: Arial; margin: 20px; background: #f5f5f5; }
                .container { max-width: 1200px; margin: 0 auto; }
                .metric { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                .metric h3 { margin-top: 0; color: #333; }
                .metric.warning { border-left: 4px solid #ff9800; }
                .metric.error { border-left: 4px solid #f44336; }
                .metric.success { border-left: 4px solid #4caf50; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background: #2196F3; color: white; }
                tr:hover { background: #f5f5f5; }
                .value { font-weight: bold; color: #2196F3; }
                .warning-value { color: #ff9800; }
                .error-value { color: #f44336; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Performance Monitoring Report</h1>
                <p>Generated: <?php echo date('Y-m-d H:i:s'); ?></p>

                <!-- Summary -->
                <div class="metric">
                    <h3>Overall Performance</h3>
                    <table>
                        <tr>
                            <td>Total Execution Time</td>
                            <td class="value"><?php echo $summary['total_time_ms']; ?> ms</td>
                        </tr>
                        <tr>
                            <td>Peak Memory Usage</td>
                            <td class="value <?php echo $memory['percent_used'] > 80 ? 'error-value' : ''; ?>">
                                <?php echo $memory['peak_mb']; ?> MB / <?php echo $memory['limit_mb']; ?> MB (<?php echo $memory['percent_used']; ?>%)
                            </td>
                        </tr>
                        <tr>
                            <td>Total Queries Executed</td>
                            <td class="value"><?php echo $summary['total_queries']; ?></td>
                        </tr>
                        <tr>
                            <td>Slow Queries (&gt;<?php echo $this->slow_query_threshold; ?>ms)</td>
                            <td class="value <?php echo $summary['slow_queries'] > 5 ? 'warning-value' : ''; ?>">
                                <?php echo $summary['slow_queries']; ?>
                            </td>
                        </tr>
                        <tr>
                            <td>Average Query Time</td>
                            <td class="value"><?php echo $summary['avg_query_ms']; ?> ms</td>
                        </tr>
                        <tr>
                            <td>Slowest Query</td>
                            <td class="value"><?php echo $summary['max_query_ms']; ?> ms</td>
                        </tr>
                    </table>
                </div>

                <!-- N+1 Detection -->
                <?php if (!empty($nplusone)): ?>
                <div class="metric error">
                    <h3>⚠️ N+1 Query Problems Detected</h3>
                    <p>The following query patterns are repeated multiple times. Consider using batch queries or eager loading.</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Query Pattern</th>
                                <th>Repetitions</th>
                                <th>Total Time</th>
                                <th>Recommendation</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($nplusone as $issue): ?>
                            <tr>
                                <td><code><?php echo htmlspecialchars($issue['example_query']); ?></code></td>
                                <td class="warning-value"><?php echo $issue['repetitions']; ?>x</td>
                                <td><?php echo $issue['total_time_ms']; ?> ms</td>
                                <td><?php echo $issue['recommendation']; ?></td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?php endif; ?>

                <!-- Slowest Queries -->
                <div class="metric">
                    <h3>Top 20 Slowest Queries</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Query</th>
                                <th>Time (ms)</th>
                                <th>Rows Affected</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($slowest as $query): ?>
                            <tr>
                                <td><code><?php echo htmlspecialchars($query['query']); ?></code></td>
                                <td class="<?php echo $query['duration_ms'] > 200 ? 'error-value' : 'warning-value'; ?>">
                                    <?php echo round($query['duration_ms'], 2); ?>
                                </td>
                                <td><?php echo $query['rows_affected']; ?></td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>

                <!-- Query Frequency -->
                <div class="metric">
                    <h3>Most Frequently Executed Queries</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Query Pattern</th>
                                <th>Count</th>
                                <th>Total Time</th>
                                <th>Avg Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach (array_slice($frequency, 0, 15) as $pattern => $data): ?>
                            <tr>
                                <td><code><?php echo htmlspecialchars(substr($pattern, 0, 100)); ?></code></td>
                                <td><?php echo $data['count']; ?></td>
                                <td><?php echo round($data['total_time_ms'], 2); ?> ms</td>
                                <td><?php echo round($data['total_time_ms'] / $data['count'], 2); ?> ms</td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>

                <!-- Recommendations -->
                <div class="metric">
                    <h3>Performance Recommendations</h3>
                    <ul>
                        <?php if ($summary['slow_queries'] > 5): ?>
                        <li>❌ Too many slow queries (<?php echo $summary['slow_queries']; ?>). Review query optimization.</li>
                        <?php endif; ?>
                        
                        <?php if (!empty($nplusone)): ?>
                        <li>❌ N+1 query problems detected. Use batch queries or eager loading.</li>
                        <?php endif; ?>

                        <?php if ($memory['percent_used'] > 80): ?>
                        <li>❌ Memory usage is high (<?php echo $memory['percent_used']; ?>%). Consider pagination or lazy loading.</li>
                        <?php endif; ?>

                        <?php if ($summary['total_queries'] > 100): ?>
                        <li>⚠️ High query count (<?php echo $summary['total_queries']; ?>). Implement caching for frequently accessed data.</li>
                        <?php endif; ?>

                        <?php if ($summary['avg_query_ms'] < 50): ?>
                        <li>✓ Good query performance on average.</li>
                        <?php endif; ?>
                    </ul>
                </div>
            </div>
        </body>
        </html>
        <?php
        return ob_get_clean();
    }

    /**
     * Export metrics to JSON
     */
    public function exportJSON()
    {
        return json_encode([
            'summary' => $this->getSummary(),
            'slowest_queries' => $this->getSlowestQueries(20),
            'query_frequency' => $this->getQueryFrequency(),
            'nplusone_issues' => $this->detectNPlusOne(),
            'memory' => $this->getMemoryUsage()
        ], JSON_PRETTY_PRINT);
    }

    /**
     * Set slow query threshold
     */
    public function setSlowQueryThreshold($ms)
    {
        $this->slow_query_threshold = $ms;
    }

    /**
     * Enable/disable monitoring
     */
    public function setEnabled($enabled)
    {
        $this->enabled = $enabled;
    }

    // ========== PRIVATE HELPERS ==========

    private function normalizeQuery($query)
    {
        $normalized = preg_replace('/WHERE .+$/i', 'WHERE ...', $query);
        $normalized = preg_replace('/VALUES .+$/i', 'VALUES ...', $normalized);
        $normalized = preg_replace('/(\d+)/', 'N', $normalized);
        return trim($normalized);
    }

    private function parseBytes($value)
    {
        $units = ['B' => 1, 'K' => 1024, 'M' => 1048576, 'G' => 1073741824];
        $value = trim($value);
        $unit = strtoupper(substr($value, -1));
        $value = (int)substr($value, 0, -1);
        return $value * ($units[$unit] ?? 1);
    }
}
