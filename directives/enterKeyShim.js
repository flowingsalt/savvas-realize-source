angular.module('RealizeDirectives')
    .directive('enterKeyShim', ['BrowserInfo',
        function(BrowserInfo) {
            'use strict';

            return {
                link: function(scope, el) {
                    var ie8 = BrowserInfo.browser.msieVersion === 8,
                        ie9 = BrowserInfo.browser.msieVersion === 9,
                        ieKeypressHandler,
                        $input;

                    if (ie8 || ie9) {
                        ieKeypressHandler = function(e) {
                            if (e.which === 13) {
                                angular.element('body').focus();
                                el.find('button[type="submit"]').click();
                            }
                        };
                        $input = el.find('input');
                        $input.on('keypress', ieKeypressHandler);
                    }

                    scope.$on('$destroy', function() {
                        if ($input) {
                            $input.off('keypress', ieKeypressHandler);
                        }
                    });
                }
            };
        }
    ]);
