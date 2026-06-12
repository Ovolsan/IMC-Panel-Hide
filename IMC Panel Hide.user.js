// ==UserScript==
// @name         IMC Panel Hide
// @namespace    http://tampermonkey.net/
// @version      12062026
// @description  На HPE IMC приховує верхню, ліву та "advanced" панелі на сторінці всіх критичний тривог.
// @author       Ovolya
// @match        *://*/imc/*
// @updateURL    https://github.com/Ovolsan/IMC-Panel-Hide/raw/refs/heads/main/IMC%20Panel%20Hide.user.js
// @downloadURL  https://github.com/Ovolsan/IMC-Panel-Hide/raw/refs/heads/main/IMC%20Panel%20Hide.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

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
            left: { done: false },
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

            // --- Left: принудительный клик, если видна кнопка collapse ---
            if (!state.left.done) {
                const collapse = document.getElementById('leftImg');
                const expand = document.getElementById('exitLeftImg');

                if (!collapse || !expand) {
                    // Кнопок ещё нет — ждём
                    return;
                }

                if (isVisible(collapse)) {
                    collapse.click();
                } else if (isVisible(expand)) {
                    state.left.done = true;
                }
            }

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
