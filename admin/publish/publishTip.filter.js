angular.module('Realize.admin.publish.publishTipFilter', [])
    .filter('publishTip', [
        function() {
            'use strict';

            return function(input) {
                if (!input) {
                    return;
                }

                var statusText = 'This item is in the ' + input + ' state.';

                if (input === 'PUBLISHED') {
                    statusText = 'This item is LIVE. If it has draft children, clicking ' +
                        'publish here will change them to the live state.';
                }

                if (input === 'PRIVATE') {
                    statusText = 'This item is in the DRAFT state.';
                }

                if (input === 'SUBMITTED') {
                    statusText = 'This item is in the MODERATING state.';
                }

                return statusText;
            };
        }
    ]);
