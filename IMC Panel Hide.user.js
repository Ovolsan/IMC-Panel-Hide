// ==UserScript==
// @name         IMC Panel Hide
// @namespace    http://tampermonkey.net/
// @version      20260624
// @description  На HPE IMC видаляє ліву панель та панель заголовку центра (All Alarms / Real-Time Alarms...). Переносить кнопку "Alarm Statistics" на тулбар. Приховує заголовок центру та "advanced" панель.
// @author       Ovolya
// @match        *://*/imc/*
// @updateURL    https://github.com/Ovolsan/IMC-Panel-Hide/raw/refs/heads/main/IMC%20Panel%20Hide.user.js
// @downloadURL  https://github.com/Ovolsan/IMC-Panel-Hide/raw/refs/heads/main/IMC%20Panel%20Hide.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    var BTN_ID  = 'imc-alarm-stat-btn';
    var NAV_SEL = 'a[id*="_faultXpPanelOfBrowse_com_h3c_imc_fault_statistic"]';

    function triggerNavigation() {
        // 1. Ищем ссылку в текущем документе
        var navLink = document.querySelector(NAV_SEL);

        // 2. Если не нашли — ищем в родительском фрейме
        if (!navLink) {
            try {
                if (window.parent !== window) {
                    navLink = window.parent.document.querySelector(NAV_SEL);
                }
            } catch (e) {}
        }

        if (navLink) {
            // .click() выполняет onclick в контексте того документа,
            // где живёт ссылка — там и есть #conter_content
            navLink.click();
            return;
        }

        // 3. Запасной: ищем loadCenterContent вверх по иерархии фреймов
        var targetWin = window;
        try {
            while (targetWin.parent !== targetWin) {
                targetWin = targetWin.parent;
                if (typeof targetWin.loadCenterContent === 'function') break;
            }
        } catch (e) { targetWin = window; }

        if (typeof targetWin.centerLoading === 'function') targetWin.centerLoading();
        if (typeof targetWin.loadCenterContent === 'function') {
            targetWin.loadCenterContent('/imc/fault/statistic/faultStatMain_contentOnly.jsf');
        }
    }

    function insertButton() {
        var moreBtn = document.getElementById('mainForm:dynaButton');
        if (!moreBtn || document.getElementById(BTN_ID)) return;

        var btn = document.createElement('button');
        btn.id = BTN_ID;
        btn.type = 'button';
        btn.className = 'ui-button ui-widget ui-state-default ui-corner-all ui-button-text-icon-left';
        btn.setAttribute('role', 'button');
        btn.setAttribute('aria-disabled', 'false');
        btn.innerHTML =
            '<span class="ui-button-icon-left ui-icon ui-c" ' +
            'style="background:url(\'/imc/resources/images/classic/fault/icon_fault_statistics_16x16.png\')' +
            ' no-repeat center/contain;"></span>' +
            '<span class="ui-button-text ui-c">Alarm Statistics</span>';

        btn.addEventListener('click', triggerNavigation);
        moreBtn.insertAdjacentElement('afterend', btn);
    }

    new MutationObserver(function () {
        if (document.getElementById('mainForm:dynaButton') &&
            !document.getElementById(BTN_ID)) {
            insertButton();
        }
    }).observe(document.body, { childList: true, subtree: true });

    setTimeout(insertButton, 500);

})();

(function() {
    'use strict';

    // ===== CSS: ТОЛЬКО левая панель и заголовок центра =====
    const hidePanels = document.createElement('style');
    hidePanels.textContent = `
        #west, .ui-layout-pane-west,
        #west-resizer, .ui-layout-resizer-west {
            display: none !important;
        }
        .imc_ui_centerHeaderContainer {
            display: none !important;
        }
        .ui-layout-center, .ui-layout-pane-center {
            left: 0 !important;
            width: 100% !important;
        }
    `;
    (document.head || document.documentElement).appendChild(hidePanels);

    let timer = null;
    let tick = 0;
    const MAX_TICKS = 5;

    function isVisible(el) {
        return el && el.offsetParent !== null && getComputedStyle(el).display !== 'none';
    }

    function stop() {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    }

    function start() {
        stop();
        tick = 0;

        const state = {
            advanced: { done: false },
            left: { done: true },   // уже скрыта CSS
            top: { phase: 0, done: false }
        };

        timer = setInterval(() => {
            tick++;
            if (tick > MAX_TICKS) { stop(); return; }

            // --- Advanced: AJAX-клик, но с проверкой что кнопка реально есть ---
            if (!state.advanced.done) {
                const btn = document.getElementById('mainForm:simpleQuery:searchBoxAdvancedBtn1');
                const panel = document.getElementById('mainForm:queryPanel_content');

                // Если панели нет или она уже скрыта — считаем готово
                if (!panel) {
                    state.advanced.done = true;
                } else if (getComputedStyle(panel).display === 'none') {
                    state.advanced.done = true;
                } else if (btn && isVisible(btn)) {
                    // Панель видна и кнопка есть — кликаем
                    btn.click();
                    // Ждём, пока панель реально скроется
                    if (getComputedStyle(panel).display === 'none') {
                        state.advanced.done = true;
                    }
                }
                // Если кнопки нет — ждём следующего тика (PrimeForms ещё инициализируется)
            }

            // --- Left: уже скрыта CSS, пропускаем ---

            // --- Top ---
            if (!state.top.done) {
                const collapse = document.getElementById('leftTopImg');
                const expand = document.getElementById('exitLeftTopImg');
                if (!collapse || !expand) return;

                if (state.top.phase === 0) {
                    if (isVisible(expand) && !isVisible(collapse)) {
                        expand.click();
                        state.top.phase = 1;
                    } else if (isVisible(collapse)) {
                        collapse.click();
                        state.top.phase = 1;
                    }
                } else if (state.top.phase === 1) {
                    if (isVisible(collapse)) {
                        collapse.click();
                        state.top.phase = 2;
                        setTimeout(() => {
                            window.dispatchEvent(new Event('resize'));
                            state.top.done = true;
                        }, 400);
                    }
                    if (tick > 10 && state.top.phase === 1) {
                        state.top.done = true;
                    }
                }
            }

            if (state.advanced.done && state.left.done && state.top.done) {
                stop();
            }
        }, 350);
    }

    // Обычная загрузка
    start();

    // При возврате из bfcache — увеличенная задержка
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            setTimeout(start, 800);
        }
    });
})();
