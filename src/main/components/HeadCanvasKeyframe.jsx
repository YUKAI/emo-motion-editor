import React, { Component, Fragment } from 'react';
import { BASE_WHITE, BASE_BLUE } from '../shared/styles';
import { connect } from 'react-redux';
import autobind from 'autobind-decorator';
import _ from 'lodash';
import { HEAD_CANVAS_KEYFRAME_RADIUS } from '../shared/constants';

@connect(({ keymaster }) => ({ keymaster }))
export default class HeadCanvasKeyframe extends Component {
    @autobind
    selectKeyframe() {
        const {
            props: { index, selectKeyframe }
        } = this;

        selectKeyframe({ index });
    }

    @autobind
    selectControlPoint({
        currentTarget: {
            dataset: { cpindex }
        }
    }) {
        const {
            props: { index, selectControlPoint }
        } = this;

        selectControlPoint({ path: [index, parseInt(cpindex)] });
    }

    render() {
        const {
            props: {
                keyframe,
                selectedIndexes,
                keymaster,
                index,
                last,
                rate,
                dx,
                dy
            }
        } = this;
        const ax = keyframe.get('x') * rate + dx;
        const ay = keyframe.get('y') * rate + dy;
        const selected = _.includes(selectedIndexes, index);
        const selectedControlPoints = _.includes(selectedIndexes, index)
            ? last
                ? [0]
                : [0, 1]
            : [];

        return (
            <>
                {keyframe.get('controlPoints').map((a, i) => {
                    const { x, y } = a;
                    const bx = ax + x * rate;
                    const by = ay + y * rate;
                    const selected = _.includes(selectedControlPoints, i);

                    if (last && i === 1) {
                        return null;
                    }

                    return (
                        <Fragment key={`cp-${i}`}>
                            <line
                                x1={ax}
                                y1={ay}
                                x2={bx}
                                y2={by}
                                strokeWidth={1}
                                stroke={selected ? BASE_BLUE : BASE_WHITE}
                                pointerEvents={
                                    selected && keymaster.get('ctrl')
                                        ? 'auto'
                                        : 'none'
                                }
                            />
                            <circle
                                data-cpindex={i}
                                cx={bx}
                                cy={by}
                                r={HEAD_CANVAS_KEYFRAME_RADIUS}
                                fill={selected ? BASE_BLUE : BASE_WHITE}
                                onMouseDown={this.selectControlPoint}
                                pointerEvents={
                                    selected && keymaster.get('ctrl')
                                        ? 'auto'
                                        : 'none'
                                }
                            />
                        </Fragment>
                    );
                })}
                <circle
                    data-index={index}
                    cx={ax}
                    cy={ay}
                    r={HEAD_CANVAS_KEYFRAME_RADIUS}
                    fill={selected ? BASE_BLUE : BASE_WHITE}
                    onMouseDown={this.selectKeyframe}
                    pointerEvents={
                        selected && !keymaster.get('ctrl') ? 'auto' : 'none'
                    }
                />
            </>
        );
    }
}
