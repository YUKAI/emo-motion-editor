import React, { Component } from 'react';
import { css } from '@emotion/css';
import { L_BLACK, LL_BLACK, BASE_BLACK } from '../shared/styles';
import { delKey } from '../shared/funcs';
import os from 'os';
import { Scrollbars } from 'react-custom-scrollbars-2';

export default class SettingsBase extends Component {
    scrollbarRenderThumbVertical({ style, ...props }) {
        return (
            <div
                data-not-unselect
                className={css([
                    style,
                    {
                        backgroundColor: `${LL_BLACK}`,
                        borderRadius: '4px',
                    },
                ])}
                {...props}
            />
        );
    }

    scrollbarRenderThumbHorizontal({ style, ...props }) {
        return (
            <div
                data-not-unselect
                className={css([
                    style,
                    {
                        backgroundColor: `${LL_BLACK}`,
                        borderRadius: '4px',
                    },
                ])}
                {...props}
            />
        );
    }

    scrollbarRenderTrackVertical({ style, ...props }) {
        return (
            <div
                data-not-unselect
                className={css([
                    style,
                    {
                        backgroundColor: `${BASE_BLACK}`,
                        height: '100%',
                        width: 8,
                        right: 0,
                    },
                ])}
                {...props}
            />
        );
    }

    scrollbarRenderTrackHorizontal({ style, ...props }) {
        return (
            <div
                data-not-unselect
                className={css([
                    style,
                    {
                        backgroundColor: `${BASE_BLACK}`,
                        width: '100%',
                        height: 8,
                        bottom: 0,
                    },
                ])}
                {...props}
            />
        );
    }

    scrollbarRenderView = ({ style, ...props }) => {
        return (
            <div
                className={css([
                    style,
                    {
                        paddingRight: 10,
                        paddingBottom: 10,
                    },
                ])}
                {...props}
            />
        );
    }

    render() {
        const {
            props: { children, cssStyle }
        } = this;

        return (
            <Scrollbars
                data-not-unselect
                renderView={this.scrollbarRenderView}
                renderThumbHorizontal={this.scrollbarRenderThumbHorizontal}
                renderThumbVertical={this.scrollbarRenderThumbVertical}
                renderTrackHorizontal={this.scrollbarRenderTrackHorizontal}
                renderTrackVertical={this.scrollbarRenderTrackVertical}
            >
                <div
                    className={css([
                        cssStyle,
                        {
                            backgroundColor: L_BLACK,
                            margin: 5,
                            border: `1px solid ${LL_BLACK}`,
                            userSelect: 'none',
                            width: 'fit-content',
                            height: 'fit-content',
                            padding: 10,
                        }
                    ])}
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
            </Scrollbars>
        );
    }
}
