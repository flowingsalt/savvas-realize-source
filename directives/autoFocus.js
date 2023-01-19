angular.module('RealizeDirectives')
    .directive('autoFocus', [
        'AccessibilityService',
        function(A11y) {
            'use strict';

            return {
                priority: -2, // run last
                link: function(scope, el, attrs) {
                    var isFocused = false; // only do it once

                    scope.$watch(attrs.autoFocus, function(focus) {
                        if (isFocused) {
                            return;
                        }

                        if (focus !== false) {
                            el[0].focus();
                            isFocused = true;
                        }
                        // ensure that the appropriate focus style is applied, if in keyboard mode
                        A11y.applyStyleToFocusableElements();
                    });
                }
            };
        }
    ]);
