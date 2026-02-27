<?php

function renderAdminSidebar(string $currentPage = 'dashboard', string $dir = 'rtl'): void
{
    $items = [
        ['key' => 'dashboard', 'label' => 'لوحة التحكم', 'href' => 'dashboard.php', 'icon' => 'fa-solid fa-chart-line'],
        ['key' => 'customers', 'label' => 'العملاء', 'href' => 'customers.php', 'icon' => 'fa-solid fa-users'],
        ['key' => 'hotel-bookings', 'label' => 'حجوزات الفنادق', 'href' => 'hotel-bookings.php', 'icon' => 'fa-solid fa-hotel'],
    ];

    $itemSpacingClass = $dir === 'rtl' ? 'mr-3' : 'ml-3';

    echo '<aside id="appSidebar" class="fixed inset-y-0 z-40 w-72 -translate-x-full border-e border-slate-200/80 bg-white/95 shadow-sm transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900/95 laptop:translate-x-0 rtl:translate-x-full laptop:rtl:translate-x-0">';
    echo '<div class="flex h-16 items-center border-b border-slate-200/80 px-6 dark:border-slate-800">';
    echo '<span class="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">Vogatchi Admin</span>';
    echo '</div>';
    echo '<nav class="p-5">';
    echo '<ul class="space-y-1.5">';

    foreach ($items as $item) {
        $isActive = $currentPage === $item['key'];
        $baseClass = 'group flex items-center rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40';
        $activeClass = $isActive
            ? ' bg-slate-100 text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700'
            : ' text-slate-600 hover:bg-slate-100 hover:text-slate-900 hover:-translate-y-px dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100';

        echo '<li>';
        echo '<a href="' . htmlspecialchars($item['href'], ENT_QUOTES, 'UTF-8') . '" class="' . $baseClass . $activeClass . '">';
        echo '<i class="' . htmlspecialchars($item['icon'], ENT_QUOTES, 'UTF-8') . ' w-5 text-[0.95rem] opacity-90 group-hover:opacity-100"></i>';
        echo '<span class="' . $itemSpacingClass . '">' . htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8') . '</span>';
        echo '</a>';
        echo '</li>';
    }

    echo '</ul>';
    echo '</nav>';
    echo '</aside>';
}
