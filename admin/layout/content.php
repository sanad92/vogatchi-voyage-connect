<?php

function renderContentWrapperStart(): void
{
    echo '<main class="min-h-screen min-w-0 overflow-x-hidden bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100 laptop:ms-72">';
}

function renderContentWrapperEnd(): void
{
    echo '</main>';
}

function renderPageContainerStart(): void
{
    echo '<div class="mx-auto w-full min-w-0 max-w-7xl px-4 py-6 tablet:px-6 tablet:py-7 laptop:px-8 laptop:py-8 ultrawide:max-w-[1600px]">';
}

function renderPageContainerEnd(): void
{
    echo '</div>';
}

function renderPageIntro(string $title, string $description, array $breadcrumbs = []): void
{
    echo '<section class="mb-6 tablet:mb-8">';

    if (!empty($breadcrumbs)) {
        echo '<nav class="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400" aria-label="breadcrumb">';
        $total = count($breadcrumbs);
        foreach ($breadcrumbs as $index => $crumb) {
            $isLast = $index === $total - 1;
            $label = htmlspecialchars((string)($crumb['label'] ?? ''), ENT_QUOTES, 'UTF-8');
            $href = isset($crumb['href']) ? trim((string)$crumb['href']) : '';

            if (!$isLast && $href !== '') {
                echo '<a href="' . htmlspecialchars($href, ENT_QUOTES, 'UTF-8') . '" class="hover:text-slate-700 dark:hover:text-slate-200">' . $label . '</a>';
            } else {
                echo '<span class="font-medium text-slate-700 dark:text-slate-200">' . $label . '</span>';
            }

            if (!$isLast) {
                echo '<i class="fa-solid fa-chevron-left text-[10px] opacity-60"></i>';
            }
        }
        echo '</nav>';
    }

    echo '<h2 class="text-xl tablet:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</h2>';
    echo '<p class="mt-1 text-sm text-slate-600 dark:text-slate-300">' . htmlspecialchars($description, ENT_QUOTES, 'UTF-8') . '</p>';
    echo '</section>';
}
