<?php

function renderContentWrapperStart(): void
{
    echo '<main class="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100 lg:ms-72">';
}

function renderContentWrapperEnd(): void
{
    echo '</main>';
}

function renderPageContainerStart(): void
{
    echo '<div class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">';
}

function renderPageContainerEnd(): void
{
    echo '</div>';
}
