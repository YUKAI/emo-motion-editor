import React, { Component } from 'react';
import { css } from '@emotion/css';
import { L_BLACK, LL_BLACK } from '../shared/styles';
import { delKey } from '../shared/funcs';
import os from 'os';

export default class SettingsBase extends Component {
    render() {
        const {
            props: { children, cssStyle }
        } = this;

        return (
            <div
                data-not-unselect
                className={css(cssStyle, {
                    backgroundColor: L_BLACK,
                    margin: 5,
                    border: `1px solid ${LL_BLACK}`,
                    userSelect: 'none',
                    width: 'fit-content',
                    height: 'fit-content',
                    padding: 10,
                })}
                onKeyDown={
                    (e) => {
                        if (os.platform() === 'darwin' && delKey(e)) {
                            e.stopPropagation();
                        }
                    }
                }
            >
                {children}
            </div>
        );
    }
}
