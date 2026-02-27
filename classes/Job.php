<?php
/**
 * Base class for background jobs.
 */
abstract class Job {
    protected $uuid;
    protected $queue = 'default';
    protected $maxRetries = 3;
    protected $attempts = 0;
    protected $timeout = 120;
    protected $payload = [];

    public function __construct(array $payload = []) {
        $this->uuid = uniqid('job_', true);
        $this->payload = $payload;
    }

    abstract public function handle(): void;

    public function failed(Throwable $exception): void {
        Logger::error('Background job failed', 'error', [
            'job_uuid' => $this->uuid,
            'job_class' => static::class,
            'attempts' => $this->attempts,
            'message' => $exception->getMessage(),
        ]);
    }

    public function shouldRetry(): bool {
        return $this->attempts < $this->maxRetries;
    }

    public function retryDelaySeconds(): int {
        return min(300, (int) pow(2, max(0, $this->attempts - 1)) * 30);
    }

    public function getUuid(): string {
        return $this->uuid;
    }

    public function setUuid(string $uuid): self {
        $this->uuid = $uuid;
        return $this;
    }

    public function getQueue(): string {
        return $this->queue;
    }

    public function setQueue(string $queue): self {
        $this->queue = $queue;
        return $this;
    }

    public function getMaxRetries(): int {
        return $this->maxRetries;
    }

    public function setMaxRetries(int $maxRetries): self {
        $this->maxRetries = $maxRetries;
        return $this;
    }

    public function getAttempts(): int {
        return $this->attempts;
    }

    public function setAttempts(int $attempts): self {
        $this->attempts = $attempts;
        return $this;
    }

    public function getTimeout(): int {
        return $this->timeout;
    }

    public function setTimeout(int $timeout): self {
        $this->timeout = $timeout;
        return $this;
    }

    public function getPayload(): array {
        return $this->payload;
    }
}
