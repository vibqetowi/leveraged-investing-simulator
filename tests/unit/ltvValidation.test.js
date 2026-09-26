import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

function setLtv(value) {
    const slider = document.getElementById('ltvSlider');
    slider.value = String(value);
    slider.dispatchEvent(new Event('input', { bubbles: true }));
}
;
