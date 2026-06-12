// ==UserScript==
// @name         IMC Panel Hide
// @namespace    http://tampermonkey.net/
// @version      12062026
// @description  На HPE IMC приховує верхню, ліву та "advanced" панелі на сторінці всіх критичний тривог.
// @author       Ovolya
// @match        *://*/imc/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let advancedDone = false;
    let leftDone = false;
    let topStarted = false;
    let topDone = false;

    function checkDone() {
        if (advancedDone && leftDone && topDone) {
            observer.disconnect();
        }
    }

    function collapseAdvanced() {
        if (advancedDone) return;
        const btn = document.getElementById('mainForm:simpleQuery:searchBoxAdvancedBtn1');
        if (!btn) return;
        btn.click();
        advancedDone = true;
        checkDone();
    }

    function collapseLeft() {
        if (leftDone) return;
        const btn = document.getElementById('leftImg');
        if (!btn) return;
        btn.click();
        leftDone = true;
        checkDone();
    }

    function collapseTop() {
        if (topStarted) return; // уже запустили процесс
        const expandBtn = document.getElementById('exitLeftTopImg');
        const collapseBtn = document.getElementById('leftTopImg');
        if (!expandBtn || !collapseBtn) return;

        topStarted = true;

        // Шаг 1: «Открыть» (синхронизация внутреннего состояния IMC)
        expandBtn.click();

        // Шаг 2: «Закрыть» полностью
        setTimeout(() => {
            const cb = document.getElementById('leftTopImg');
            if (cb) cb.click();

            // Шаг 3: Форсировать пересчёт layout
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
                topDone = true;
                checkDone();
            }, 300);
        }, 400);
    }

    const observer = new MutationObserver(() => {
        collapseAdvanced();
        collapseLeft();
        collapseTop();
    });

    // Первоначальная попытка сразу
    collapseAdvanced();
    collapseLeft();
    collapseTop();

    // Если что-то ещё не готово (или top ещё в процессе), ждём через MutationObserver
    if (!(advancedDone && leftDone && topDone)) {
        observer.observe(document.body, { childList: true, subtree: true });
    }
})();
