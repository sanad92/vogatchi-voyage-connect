<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../classes/QueueBootstrap.php';

$queue = $argv[1] ?? 'default';
$mode = $argv[2] ?? 'once';   // once | loop
$maxJobs = isset($argv[3]) ? (int)$argv[3] : 100;

$worker = new JobWorker($queue);

if ($mode === 'loop') {
    $report = $worker->runLoop($maxJobs);
} else {
    $worker->processOnce();
    $report = $worker->getReport();
}

echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
