<?php

function renderAdminHeader(string $pageTitle, string $userName, string $dir = 'rtl'): void
{
    $spaceClass = $dir === 'rtl' ? 'space-x-reverse' : '';

    echo '<header class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">';
    echo '<div class="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">';

    echo '<div class="flex items-center ' . $spaceClass . ' space-x-3">';
    echo '<button id="sidebarToggle" type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm lg:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">';
    echo '<i class="fa-solid fa-bars"></i>';
    echo '</button>';
    echo '<h1 class="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-lg">' . htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') . '</h1>';
    echo '</div>';

    echo '<div class="flex items-center ' . $spaceClass . ' space-x-3">';
    echo '<button id="themeToggle" type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">';
    echo '<i class="fa-solid fa-moon"></i>';
    echo '</button>';
    echo '<span class="hidden text-sm font-medium text-slate-600 dark:text-slate-300 sm:inline">' . htmlspecialchars($userName, ENT_QUOTES, 'UTF-8') . '</span>';
    echo '<a href="/logout.php" class="inline-flex h-9 items-center rounded-lg bg-rose-600 px-3.5 text-sm font-medium text-white shadow-sm hover:bg-rose-700">';
    echo 'تسجيل الخروج';
    echo '</a>';
    echo '</div>';

    echo '</div>';
    echo '</header>';
}
