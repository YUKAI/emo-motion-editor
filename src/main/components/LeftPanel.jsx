import React, { Component } from 'react';
import { css } from '@emotion/css';
import HeadCanvas from './HeadCanvas';
import { connect } from 'react-redux';


@connect(({ leftPanelWidth }) => {
    return { leftPanelWidth };
})
export default class LeftPanel extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        const {
            props: { leftPanelWidth }
        } = this;

        return (
            <div
                className={css({
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    width: leftPanelWidth,
                })}
            >
                <div
                    className={css({
                        position: 'relative'
                    })}
                >
                    <HeadCanvas />
                </div>
            </div>
        );
    }
}
