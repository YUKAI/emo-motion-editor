import React, { Component } from 'react';
import { css } from '@emotion/css';
import { VERTICAL_BAR_WIDTH } from '../shared/constants';
import { connect } from 'react-redux';
import actions from '../actions';
import { LL_BLACK } from '../shared/styles';

@connect(({ leftPanelWidth }) => {
    return {
        leftPanelWidth
    };
})
export default class VerticalBar extends Component {
    mouseDwonStartX = 0;
    startWidth = 0;

    onMouseDown = ({ clientX }) => {
        const {
            props: { leftPanelWidth }
        } = this;

        this.mouseDwonStartX = clientX;
        this.startWidth = leftPanelWidth;

        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
    };

    onMouseMove = ({ clientX }) => {
        const {
            mouseDwonStartX,
            startWidth,
            props: { dispatch }
        } = this;

        dispatch(
            actions.resizeLeftPanel({
                width: startWidth + (clientX - mouseDwonStartX)
            })
        );
    };

    onMouseUp = () => {
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
    };

    shouldComponentUpdate = () => {
        return false;
    };

    render = () => {
        return (
            <div
                data-not-unselect
                onMouseDown={this.onMouseDown}
                className={css({
                    width: VERTICAL_BAR_WIDTH,
                    height: '100%',
                    backgroundColor: 'transparent',
                    cursor: 'col-resize',
                    borderLeft: `${LL_BLACK} 1px solid`,
                    borderRight: `${LL_BLACK} 1px solid`,
                    boxSizing: 'border-box'
                })}
            />
        );
    };
}
