<?php
/**
 * Queue worker for processing background jobs.
 */
class JobWorker {
    private $queue;
    private $queueName = 'default';
    private $memoryLimitMb = 128;
    private $processed = 0;
    private $failed = 0;
    private $start_time;

    public function __construct(string $queue_name = 'default') {
        $this->queue = JobQueue::getInstance();
        $this->queueName = $queue_name;
        $this->start_time = time();
    }

    public function processOnce(): bool {
        $reserved = $this->queue->reserveNext($this->queueName);
        if (!$reserved) {
            return false;
        }

        $this->runReserved($reserved);
        return true;
    }

    public function runLoop(int $maxJobs = 100, int $sleepSeconds = 1): array {
        $executed = 0;
        while ($executed < $maxJobs && !$this->shouldStop()) {
            $worked = $this->processOnce();
            if ($worked) {
                $executed++;
            } else {
                sleep(max(1, $sleepSeconds));
            }
        }

        return $this->getReport();
    }

    private function runReserved(array $reserved): void {
        $id = (int)$reserved['row']['id'];
        $job = $reserved['job'];
        $start_time = microtime(true);

        try {
            set_time_limit($job->getTimeout());
            $job->handle();
            $duration = microtime(true) - $start_time;

            $this->queue->markCompleted($id, json_encode([
                'duration_ms' => (int)round($duration * 1000),
            ]));

            Logger::activity('queue_job_completed', [
                'job_uuid' => $job->getUuid(),
                'job_class' => get_class($job),
                'duration_ms' => (int)round($duration * 1000),
                'queue' => $job->getQueue(),
            ]);

            $this->processed++;
        } catch (Throwable $e) {
            $duration = microtime(true) - $start_time;

            $job->failed($e);

            if ($job->shouldRetry()) {
                $this->queue->releaseWithRetry($id, $e->getMessage(), $job->retryDelaySeconds());
                Logger::error('queue_job_retry', 'warning', [
                    'job_uuid' => $job->getUuid(),
                    'job_class' => get_class($job),
                    'attempts' => $job->getAttempts(),
                    'message' => $e->getMessage(),
                    'duration_ms' => (int)round($duration * 1000),
                ]);
            } else {
                $this->queue->markFailed($id, $job, $e);
                $this->failed++;
            }
        }
    }

    private function shouldStop(): bool {
        $memory_usage = $this->getMemoryUsageMB();

        if ($memory_usage > $this->memoryLimitMb * 0.9) {
            Logger::error('queue_worker_memory_limit', 'warning', [
                'current_mb' => $memory_usage,
                'limit_mb' => $this->memoryLimitMb,
            ]);
            return true;
        }

        return false;
    }

    private function getMemoryUsageMB(): float {
        return round(memory_get_usage(true) / 1024 / 1024, 2);
    }

    public function getReport(): array {
        $duration = time() - $this->start_time;

        return [
            'queue' => $this->queueName,
            'processed' => $this->processed,
            'failed' => $this->failed,
            'duration_seconds' => $duration,
            'memory_usage_mb' => $this->getMemoryUsageMB(),
        ];
    }

    public function setMemoryLimit(int $mb): self {
        $this->memoryLimitMb = max(32, $mb);
        return $this;
    }
}
