import React, { Component, forwardRef } from 'react';
import _ from 'lodash';

window._synchronizedScrollIndex = null;

class SynchronizedScroll extends Component {
    es = [];
    timer = -1;

    onScroll = ({ currentTarget: { scrollLeft } }) => {
        const {
            props: { index },
            es
        } = this;

        if (
            window._synchronizedScrollIndex === null ||
            window._synchronizedScrollIndex === index
        ) {
            window._synchronizedScrollIndex = index;
            clearTimeout(this.timer);

            _.forEach(es, ($e) => {
                const {
                    dataset: { synchronized }
                } = $e;

                if (index !== parseInt(synchronized)) {
                    $e.scrollTo({ left: scrollLeft });
                }
            });

            // Wait for scroll to complete
            this.timer = setTimeout(() => {
                window._synchronizedScrollIndex = null;
            }, 100);
        }
    };

    componentDidMount() {
        this.es = document.querySelectorAll('[data-synchronized]');
    }

    render = () => {
        const {
            props: { children, index, className, forwardedRef }
        } = this;

        return (
            <div
                onMouseOver={this.onMouseOver}
                onScroll={this.onScroll}
                data-synchronized={index}
                className={className}
                ref={forwardedRef}
            >
                {children}
            </div>
        );
    };
}

export default forwardRef(function ForwardedSynchronizedScroll(props, ref) {
    return <SynchronizedScroll forwardedRef={ref} {...props} />;
});
