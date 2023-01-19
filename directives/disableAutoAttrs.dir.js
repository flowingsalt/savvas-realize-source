/*
 * Use this directive to disable : auto complete, auto correct, spell check and auto capitalize.
 * Simply add it to you existing input element ( or any text entry element) like this :
 * <input type="password" disable-auto-attrs />
 *
 */
angular.module('realize-lib.ui.disable-auto-attrs', [])
    .directive('disableAutoAttrs', [
        function() {
            'use strict';

            return {
                restrict: 'A',
                link: function(scope, elem) {
                    elem.attr('autocomplete', 'off');
                    elem.attr('autocorrect', 'off');
                    elem.attr('autocapitalize', 'off');
                    elem.attr('spellcheck', 'false');
                }
            };
        }
    ]);
