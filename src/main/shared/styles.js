import Color from 'color';
import { css } from '@emotion/css';

export const BASE_WHITE = 'rgb(255, 255, 255)';
export const BASE_BLACK = 'rgb(30, 30, 30)';
export const BASE_BLUE = 'rgb(0, 122, 211)';
export const D_WHITE = Color(BASE_WHITE)
    .darken(0.2)
    .toString();
export const L_BLACK = Color(BASE_BLACK)
    .lighten(0.2)
    .toString();
export const LL_BLACK = Color(BASE_BLACK)
    .lighten(0.4)
    .toString();
export const SHADOW = css({
    boxShadow:
        '0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 3px 1px -2px rgba(0, 0, 0, 0.12), 0 1px 5px 0 rgba(0, 0, 0, 0.2)'
});
export const A_BLUE = Color(BASE_BLUE)
    .alpha(0.5)
    .toString();
export const A_WHITE = Color(BASE_WHITE)
    .alpha(0.5)
    .toString();
