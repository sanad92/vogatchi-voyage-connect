<?php
/**
 * Database-backed background job queue.
 */
class JobQueue {
    private static $instance = null;
    private $db;

    private function __construct() {
        $this->db = Database::getInstance();
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function dispatch(Job $job, string $queue = 'default', int $delaySeconds = 0): string {
        $availableAt = date('Y-m-d H:i:s', time() + max(0, $delaySeconds));
        $job->setQueue($queue);

        $this->db->insert('jobs_queue', [
            'job_uuid' => $job->getUuid(),
            'queue' => $job->getQueue(),
            'job_class' => get_class($job),
            'payload' => json_encode($job->getPayload(), JSON_UNESCAPED_UNICODE),
            'attempts' => 0,
            'max_retries' => $job->getMaxRetries(),
            'status' => 'pending',
            'available_at' => $availableAt,
            'timeout_seconds' => $job->getTimeout(),
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        Logger::activity('queue_job_dispatched', [
            'job_uuid' => $job->getUuid(),
            'job_class' => get_class($job),
            'queue' => $queue,
            'delay_seconds' => $delaySeconds,
        ]);

        return $job->getUuid();
    }

    public function push(Job $job, string $queue = 'default', int $delay = 0): string {
        return $this->dispatch($job, $queue, $delay);
    }

    public function reserveNext(string $queue = 'default'): ?array {
        try {
            $this->db->beginTransaction();

            $row = $this->db->selectOne(
                "SELECT * FROM jobs_queue
                 WHERE queue = ? AND status = 'pending' AND available_at <= NOW()
                 ORDER BY available_at ASC, id ASC
                 LIMIT 1 FOR UPDATE",
                [$queue]
            );

            if (!$row) {
                $this->db->rollback();
                return null;
            }

            $newAttempts = ((int)$row['attempts']) + 1;

            $this->db->query(
                "UPDATE jobs_queue
                 SET status = 'processing', attempts = ?, reserved_at = NOW(), updated_at = NOW()
                 WHERE id = ?",
                [$newAttempts, $row['id']]
            );

            $this->db->commit();

            $job = $this->hydrateJob($row, $newAttempts);
            return ['row' => $row, 'job' => $job, 'attempts' => $newAttempts];
        } catch (Throwable $e) {
            try {
                $this->db->rollback();
            } catch (Throwable $rollbackException) {
            }

            Logger::error('queue_reserve_failed', 'error', ['message' => $e->getMessage()]);
            throw $e;
        }
    }

    private function hydrateJob(array $row, int $attempts): Job {
        $payload = json_decode($row['payload'] ?? '{}', true) ?: [];
        $jobClass = $row['job_class'];

        if (!class_exists($jobClass)) {
            throw new RuntimeException('Unknown job class: ' . $jobClass);
        }

        $job = new $jobClass($payload);
        if (!$job instanceof Job) {
            throw new RuntimeException('Invalid job class type: ' . $jobClass);
        }

        $job->setUuid($row['job_uuid'])
            ->setQueue($row['queue'])
            ->setMaxRetries((int)$row['max_retries'])
            ->setAttempts($attempts)
            ->setTimeout((int)$row['timeout_seconds']);

        return $job;
    }

    public function markCompleted(int $id, ?string $result = null): void {
        $this->db->query(
            "UPDATE jobs_queue
             SET status = 'completed', completed_at = NOW(), result = ?, updated_at = NOW()
             WHERE id = ?",
            [$result, $id]
        );
    }

    public function releaseWithRetry(int $id, string $errorMessage, int $delaySeconds): void {
        $availableAt = date('Y-m-d H:i:s', time() + max(0, $delaySeconds));
        $this->db->query(
            "UPDATE jobs_queue
             SET status = 'pending', available_at = ?, last_error = ?, updated_at = NOW()
             WHERE id = ?",
            [$availableAt, $errorMessage, $id]
        );
    }

    public function markFailed(int $id, Job $job, Throwable $exception): void {
        $this->db->query(
            "UPDATE jobs_queue
             SET status = 'failed', failed_at = NOW(), last_error = ?, updated_at = NOW()
             WHERE id = ?",
            [$exception->getMessage(), $id]
        );

        $this->db->insert('job_failures', [
            'job_uuid' => $job->getUuid(),
            'queue_job_id' => $id,
            'job_class' => get_class($job),
            'payload' => json_encode($job->getPayload(), JSON_UNESCAPED_UNICODE),
            'attempts' => $job->getAttempts(),
            'error_message' => $exception->getMessage(),
            'stack_trace' => $exception->getTraceAsString(),
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        Logger::error('queue_job_failed', 'error', [
            'job_uuid' => $job->getUuid(),
            'job_class' => get_class($job),
            'attempts' => $job->getAttempts(),
            'message' => $exception->getMessage(),
        ]);
    }

    public function getStats(?string $queue = null): array {
        $where = $queue ? "WHERE queue = ?" : "";
        $params = $queue ? [$queue] : [];

        $sql = "SELECT 
            queue,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
            COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
            COUNT(*) as total
            FROM jobs_queue
            $where
            GROUP BY queue";

        return $this->db->select($sql, $params);
    }

    public function getJobDetails(string $jobUuid): ?array {
        return $this->db->selectOne("SELECT * FROM jobs_queue WHERE job_uuid = ?", [$jobUuid]);
    }

    public function getRecentFailures(int $limit = 20): array {
        $limit = max(1, min($limit, 500));
        return $this->db->select(
            "SELECT * FROM job_failures ORDER BY created_at DESC LIMIT $limit"
        );
    }

    public function clearOldJobs(int $days = 30): void {
        $date = date('Y-m-d', time() - ($days * 86400));

        $sql = "DELETE FROM jobs_queue 
                WHERE status IN ('completed', 'failed') 
                AND (DATE(completed_at) < ? OR DATE(failed_at) < ?)";

        $this->db->query($sql, [$date, $date]);

        Logger::activity('queue_cleanup', ['days' => $days]);
    }

    public function getQueueSize(?string $queue = null, string $status = 'pending'): int {
        $where = "status = ?";
        $params = [$status];

        if ($queue) {
            $where .= " AND queue = ?";
            $params[] = $queue;
        }

        $sql = "SELECT COUNT(*) as count FROM jobs_queue WHERE $where";
        $result = $this->db->selectOne($sql, $params);

        return (int)($result['count'] ?? 0);
    }
}
