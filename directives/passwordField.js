angular.module('RealizeApp')
    .directive('passwordField', [
        '$log',
        '$browser',
        '$sniffer',
        'KEY_CODES',
        function($log, $browser, $sniffer, KEY_CODES) {
            'use strict';

            // helper
            function isEmpty(value) {
                return angular.isUndefined(value) || value === '' || value === null;
            }

            return {
                require: 'ngModel',
                restrict: 'EA',
                template: [
                    '<div>',
                        '<input type="text" autocorrect="off" autocapitalize="off" />',
                        '<input type="password" />',
                    '</div>'
                ].join(''),
                replace: true,
                compile: function(tElement, tAttrs) {
                    // forward some directives to inner inputs
                    tElement.find('input').each(function(idx, input) {
                        if (tAttrs.ngDisabled) {
                            $(input).attr('ng-disabled', tAttrs.ngDisabled);
                        }
                        if (tAttrs.ngClass) {
                            $(input).attr('ng-class', tAttrs.ngClass);
                        }
                        if (tAttrs.focus) {
                            $(input).attr('auto-focus', '');
                        }
                        if (tAttrs.maxlength) {
                            $(input).attr('maxlength', tAttrs.maxlength);
                        }
                    });

                    tElement.find('input[type="text"]').each(function(idx, input) {
                        if (tAttrs.passwordFieldId) {
                            $(input).attr('id', tAttrs.passwordFieldId);
                        }
                    });

                    tElement.find('input[type="password"]').each(function(idx, input) {
                        if (tAttrs.passwordFieldId) {
                            $(input).attr('id', 'passwordIndex-' + tAttrs.passwordFieldId);
                        }
                    });

                    return function passwordFieldPostLink(scope, el, attr, ctrl) {
                        var elementChildren = el.children(),
                            textInput = elementChildren.eq(0),
                            pwInput = elementChildren.eq(1),
                            inputChangeListener,
                            timeout,
                            keydownListener,
                            eventNamespace = '.passwordField';

                        inputChangeListener = function(e) {
                            var target = e.target, value = angular.element(target).val();

                            if (ctrl.$viewValue !== value) {
                                scope.$applyAsync(function() {
                                    ctrl.$setViewValue(value);
                                    ctrl.$render();
                                });
                            }
                        };

                        // if the browser does support "input" event, we are fine - except on IE9 which doesn't fire the
                        // input event on backspace, delete or cut
                        if ($sniffer.hasEvent('input')) {
                            textInput.on('input' + eventNamespace, inputChangeListener);
                            pwInput.on('input' + eventNamespace, inputChangeListener);
                        } else {
                            keydownListener = function(event) {
                                var key = event.keyCode;

                                if (key === KEY_CODES.CMD_LEFT || (KEY_CODES.SHIFT <= key && key <= KEY_CODES.ALT) ||
                                    (KEY_CODES.LEFT <= key && key <= KEY_CODES.DOWN)) {

                                    return;
                                }

                                if (!timeout) {
                                    timeout = $browser.defer(function() {
                                        inputChangeListener(event);
                                        timeout = null;
                                    });
                                }
                            };

                            textInput.on('keydown' + eventNamespace, keydownListener);
                            pwInput.on('keydown' + eventNamespace, keydownListener);

                            // if user paste into input using mouse, we need "change" event to catch it
                            textInput.on('change' + eventNamespace, inputChangeListener);
                            pwInput.on('change' + eventNamespace, inputChangeListener);
                        }

                        ctrl.$render = function() {
                            textInput.val(isEmpty(ctrl.$viewValue) ? '' : ctrl.$viewValue);
                            pwInput.val(isEmpty(ctrl.$viewValue) ? '' : ctrl.$viewValue);
                        };

                        scope.$watch(attr.toggle, function(val) {
                            if (val === true) {
                                textInput.css('display', 'none');
                                pwInput.css('display', 'block');
                            } else {
                                textInput.css('display', 'block');
                                pwInput.css('display', 'none');
                            }
                        });

                        scope.$on('$destroy', function() {
                            textInput.off(eventNamespace);
                            pwInput.off(eventNamespace);
                        });
                    };
                }
            };
        }
    ]);
