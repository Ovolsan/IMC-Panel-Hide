// ==UserScript==
// @name         IMC Panel Hide
// @namespace    http://tampermonkey.net/
// @version      12062026
// @description  На HPE IMC приховує верхню, ліву, заголовок центру та "advanced" панелі.
// @author       Ovolya
// @match        *://*/imc/*
// @updateURL    https://github.com/Ovolsan/IMC-Panel-Hide/raw/refs/heads/main/IMC%20Panel%20Hide.user.js
// @downloadURL  https://github.com/Ovolsan/IMC-Panel-Hide/raw/refs/heads/main/IMC%20Panel%20Hide.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ===== CSS: скрываем всё лишнее =====
    const hidePanels = document.createElement('style');
    hidePanels.textContent = `
        /* Левая панель */
        #west, .ui-layout-pane-west,
        #west-resizer, .ui-layout-resizer-west {
            display: none !important;
        }

        /* Верхняя панель (north) */
        .ui-layout-pane-north,
        .ui-layout-resizer-north {
            display: none !important;
        }

        /* Заголовок центральной области (All Alarms, Real-Time Alarms, Browse Trap...) */
        .imc_ui_centerHeaderContainer {
            display: none !important;
        }

        /* Растягиваем центр на всё оставшееся пространство */
        .ui-layout-center, .ui-layout-pane-center {
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
        }
    `;
    (document.head || document.documentElement).appendChild(hidePanels);

    let timer = null;
    let tick = 0;
    const MAX_TICKS = 30;

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
            top: { done: true },    // уже скрыта CSS
            header: { done: true }  // уже скрыта CSS
        };

        timer = setInterval(() => {
            tick++;
            if (tick > MAX_TICKS) { stop(); return; }

            // --- Advanced: один клик ---
            if (!state.advanced.done) {
                const btn = document.getElementById('mainForm:simpleQuery:searchBoxAdvancedBtn1');
                const panel = document.getElementById('mainForm:queryPanel_content');

                if (!panel) {
                    state.advanced.done = true;
                } else if (getComputedStyle(panel).display === 'none') {
                    state.advanced.done = true;
                } else if (btn && isVisible(btn)) {
                    btn.click();
                    if (getComputedStyle(panel).display === 'none') {
                        state.advanced.done = true;
                    }
                }
            }

            if (state.advanced.done) {
                stop();
            }
        }, 350);
    }

    // Обычная загрузка
    start();

    // При возврате из bfcache
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            setTimeout(start, 300);
        }
    });
})();
