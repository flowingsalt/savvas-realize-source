angular.module('Realize.common.toolTipSupport.keyboardAccess', [])
// provides keyboard access to tooltips, requires the tooltip markup to be wrapped with an anchor
// Usage:
// <a href="javascript://" class="help-icon" keyboard-access ui-options="{ ... }" data-content="{msg}">
//     <i class="icon-question-sign"></i>
// </a>
    .directive('keyboardAccess', [
        function() {
            'use strict';

            return function(scope, el) {

                el.on('focusin', function() {
                    el.trigger('mouseover');
                });

                el.on('focusout', function() {
                    el.trigger('mouseleave');
                });

            };
        }
    ]);
