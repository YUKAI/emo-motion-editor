import { Component } from 'react';
import _ from 'lodash';
import Immutable, { Map } from 'immutable';

export default class C extends Component {
    _checkedPropsForRender = [];

    shouldComponentUpdate(nextProps) {
        const { props } = this;
        let nowMap = Map();
        let nextMap = Map();

        _.forEach(this._checkedPropsForRender, (key) => {
            nowMap = nowMap.set(key, props[key]);
            nextMap = nextMap.set(key, nextProps[key]);
        });

        return !Immutable.is(nowMap, nextMap);
    }
}
