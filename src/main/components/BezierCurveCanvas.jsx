import React, { Component, createRef } from 'react';
import { css } from '@emotion/css';
import { bezierCurvePoints } from '../shared/funcs';
import autobind from 'autobind-decorator';
import { Point } from '../models';
import _ from 'lodash';

export default class BezierCurveCanvas extends Component {
    static defaultProps = {
        width: 200,
        height: 200,
        margin: 10,
        selectableIndexes: [0, 1, 2, 3]
    };

    static limit = (n, min = 0, max = 1) => {
        return Math.max(Math.min(n, max), min);
    };

    state = {
        targetIndex: null
    };

    _$div = createRef();

    get $div() {
        const {
            _$div: { current }
        } = this;

        return current;
    }

    @autobind
    onMouseDownPoint({
        currentTarget: {
            dataset: { index }
        }
    }) {
        const {
            props: { selectableIndexes }
        } = this;
        const targetIndex = parseInt(index);

        if (_.includes(selectableIndexes, targetIndex)) {
            this.setState({
                targetIndex
            });
        }

        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
    }

    @autobind
    onMouseMove({ clientX, clientY }) {
        const {
            state: { targetIndex }
        } = this;

        if (targetIndex === null) {
            return;
        }

        const {
            props: { margin, updatePoint, width, height },
            $div
        } = this;
        const { left, top } = $div.getBoundingClientRect();
        const x = BezierCurveCanvas.limit((clientX - left - margin) / width);
        const y = BezierCurveCanvas.limit((clientY - top - margin) / height);

        updatePoint({
            x,
            y,
            index: targetIndex
        });
    }

    @autobind
    onMouseUp() {
        const {
            props: { finishUpdatingPoint }
        } = this;

        finishUpdatingPoint();
        this.setState({ targetIndex: null });
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
    }

    render() {
        const {
            state: { targetIndex },
            props: { width, height, margin, points }
        } = this;
        const processed = points.map(
            (a) =>
                new Point({
                    x: a.get('x') * width + margin,
                    y: a.get('y') * height + margin
                })
        );

        return (
            <div
                ref={this._$div}
                className={css({
                    width: width + margin * 2,
                    height: height + margin * 2
                })}
            >
                <svg
                    className={css({
                        display: 'block',
                        backgroundColor: 'white',
                        width: '100%',
                        height: '100%'
                    })}
                >
                    <polyline
                        points={bezierCurvePoints(processed)}
                        fill='none'
                        stroke='black'
                        strokeWidth={3}
                    />

                    <line
                        stroke='black'
                        x1={processed.getIn([0, 'x'])}
                        y1={processed.getIn([0, 'y'])}
                        x2={processed.getIn([2, 'x'])}
                        y2={processed.getIn([2, 'y'])}
                    />
                    <line
                        stroke='black'
                        x1={processed.getIn([1, 'x'])}
                        y1={processed.getIn([1, 'y'])}
                        x2={processed.getIn([3, 'x'])}
                        y2={processed.getIn([3, 'y'])}
                    />
                    {processed.map((a, i) => {
                        return (
                            <circle
                                cx={a.get('x')}
                                cy={a.get('y')}
                                r={5}
                                key={`p-${i}`}
                                data-index={i}
                                fill={i === targetIndex ? 'red' : 'black'}
                                onMouseDown={this.onMouseDownPoint}
                            />
                        );
                    })}
                </svg>
            </div>
        );
    }
}
