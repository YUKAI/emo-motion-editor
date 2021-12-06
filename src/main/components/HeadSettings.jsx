import React, { Component } from 'react';
import { css } from '@emotion/css';
import { connect } from 'react-redux';
import BezierCurveCanvas from './BezierCurveCanvas';
import autobind from 'autobind-decorator';
import SettingsBase from './SettingsBase';

@connect(({ timelinesSelection }) => {
    return {
        timelines: timelinesSelection.get('timelines')
    };
})
export default class HeadSettings extends Component {
    @autobind
    updatePoint({ x, y, index }) {
        const {
            props: { updatePoint }
        } = this;

        updatePoint({ x, y, index });
    }

    finishUpdatingPoint = () => {
        const {
            props: { finishUpdatingPoint }
        } = this;

        finishUpdatingPoint();
    };

    render() {
        const {
            props: { keyframe, x, y, toggleKeep }
        } = this;

        return (
            <SettingsBase x={x} y={y}>
                <div>
                    <fieldset>
                        <legend>Position</legend>
                        <label>
                            <input
                                type='checkbox'
                                checked={keyframe.get('keep')}
                                onChange={toggleKeep}
                                className={css({
                                    font: 'inherit'
                                })}
                            />
                            Keep
                        </label>
                    </fieldset>
                </div>
                <fieldset>
                    <legend>Easing</legend>
                    <div>
                        <BezierCurveCanvas
                            points={keyframe.get('bezierPoints')}
                            updatePoint={this.updatePoint}
                            finishUpdatingPoint={this.finishUpdatingPoint}
                            selectableIndexes={[2, 3]}
                        />
                    </div>
                </fieldset>
            </SettingsBase>
        );
    }
}
