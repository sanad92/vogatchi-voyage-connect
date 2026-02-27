<?php

require_once __DIR__ . '/sidebar.php';
require_once __DIR__ . '/header.php';
require_once __DIR__ . '/content.php';
require_once __DIR__ . '/components.php';

function renderAdminLayoutStart(array $config): void
{
    $pageTitle = $config['pageTitle'] ?? 'Admin';
    $userName = $config['userName'] ?? '';
    $currentPage = $config['currentPage'] ?? 'dashboard';
    $dir = $config['dir'] ?? 'rtl';
    $lang = $config['lang'] ?? ($dir === 'rtl' ? 'ar' : 'en');
    $htmlTitle = $config['htmlTitle'] ?? $pageTitle;
    $breadcrumbs = $config['breadcrumbs'] ?? [];
    $pageDescription = $config['pageDescription'] ?? '';

    if (empty($breadcrumbs)) {
        $defaultCrumbs = [
            'dashboard' => [
                ['label' => 'لوحة التحكم', 'href' => 'dashboard.php'],
            ],
            'customers' => [
                ['label' => 'لوحة التحكم', 'href' => 'dashboard.php'],
                ['label' => 'العملاء', 'href' => 'customers.php'],
            ],
            'hotel-bookings' => [
                ['label' => 'لوحة التحكم', 'href' => 'dashboard.php'],
                ['label' => 'حجوزات الفنادق', 'href' => 'hotel-bookings.php'],
            ],
        ];
        $breadcrumbs = $defaultCrumbs[$currentPage] ?? [
            ['label' => 'لوحة التحكم', 'href' => 'dashboard.php'],
            ['label' => $pageTitle],
        ];
    }

    if ($pageDescription === '') {
        $defaultDescriptions = [
            'dashboard' => 'ملخص سريع للأداء والعمليات الأساسية اليوم.',
            'customers' => 'إدارة بيانات العملاء وتقسيمهم ومتابعة نشاطهم.',
            'hotel-bookings' => 'متابعة الحجوزات وحالاتها والمدفوعات في مكان واحد.',
        ];
        $pageDescription = $defaultDescriptions[$currentPage] ?? 'عرض المعلومات الأساسية وإدارة العمليات المرتبطة بهذه الصفحة.';
    }

    echo '<!DOCTYPE html>';
    echo '<html lang="' . htmlspecialchars($lang, ENT_QUOTES, 'UTF-8') . '" dir="' . htmlspecialchars($dir, ENT_QUOTES, 'UTF-8') . '" class="js-loading">';
    echo '<head>';
    echo '<meta charset="UTF-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
    echo '<title>' . htmlspecialchars($htmlTitle, ENT_QUOTES, 'UTF-8') . '</title>';
    echo '<script src="https://cdn.tailwindcss.com"></script>';
    echo '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">';
    echo '<script>';
    echo 'tailwind.config = {';
    echo 'darkMode: "class",';
    echo 'theme: { extend: { screens: { mobile: "0px", tablet: "768px", laptop: "1024px", desktop: "1280px", ultrawide: "1600px" } } }';
    echo '};';
    echo '(function(){ try { var stored = localStorage.getItem("theme"); if (stored === "dark") { document.documentElement.classList.add("dark"); } } catch(e) {} })();';
    echo '</script>';
    renderAdminComponentStyles();
    echo '</head>';
    echo '<body class="overflow-x-hidden bg-slate-50 dark:bg-slate-950">';

    renderAdminSidebar($currentPage, $dir);
    renderContentWrapperStart();
    renderAdminHeader($pageTitle, $userName, $dir);
    renderPageContainerStart();
    renderPageIntro($pageTitle, $pageDescription, $breadcrumbs);
}

function renderAdminLayoutEnd(): void
{
    renderPageContainerEnd();
    renderContentWrapperEnd();

    echo '<script>';
    echo '(function(){';
    echo 'var sidebar = document.getElementById("appSidebar");';
    echo 'var sidebarToggle = document.getElementById("sidebarToggle");';
    echo 'var backdrop = document.createElement("div");';
    echo 'backdrop.id = "sidebarBackdrop";';
    echo 'backdrop.className = "ui-sidebar-backdrop";';
    echo 'document.body.appendChild(backdrop);';

    echo 'function isDesktop(){ return window.matchMedia("(min-width: 1024px)").matches; }';
    echo 'function openSidebar(){ if(!sidebar) return; sidebar.classList.remove("-translate-x-full"); if (document.documentElement.getAttribute("dir") === "rtl") { sidebar.classList.remove("rtl:translate-x-full"); } backdrop.classList.add("show"); document.body.classList.add("overflow-hidden"); }';
    echo 'function closeSidebar(){ if(!sidebar) return; sidebar.classList.add("-translate-x-full"); if (document.documentElement.getAttribute("dir") === "rtl") { sidebar.classList.add("rtl:translate-x-full"); } backdrop.classList.remove("show"); document.body.classList.remove("overflow-hidden"); }';
    echo 'function toggleSidebar(){ if(!sidebar) return; var isOpen = !sidebar.classList.contains("-translate-x-full") && (document.documentElement.getAttribute("dir") !== "rtl" || !sidebar.classList.contains("rtl:translate-x-full")); if(isOpen){ closeSidebar(); } else { openSidebar(); } }';

    echo 'if (sidebar && sidebarToggle) {';
    echo 'sidebarToggle.addEventListener("click", function(){ toggleSidebar(); });';
    echo '}';
    echo 'backdrop.addEventListener("click", function(){ closeSidebar(); });';
    echo 'document.addEventListener("keydown", function(e){ if(e.key === "Escape") closeSidebar(); });';
    echo 'window.addEventListener("resize", function(){ if(isDesktop()){ backdrop.classList.remove("show"); document.body.classList.remove("overflow-hidden"); } else { closeSidebar(); } });';
    echo 'var themeToggle = document.getElementById("themeToggle");';
    echo 'if (themeToggle) {';
    echo 'themeToggle.addEventListener("click", function(){';
    echo 'var isDark = document.documentElement.classList.toggle("dark");';
    echo 'try { localStorage.setItem("theme", isDark ? "dark" : "light"); } catch (e) {}';
    echo '});';
    echo '}';
    echo '})();';
    echo '</script>';

    renderAdminComponentRuntimeBindings();

    echo '</body>';
    echo '</html>';
}
