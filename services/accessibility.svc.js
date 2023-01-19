angular.module('RealizeApp')
    .service('AccessibilityService', [
        '$log',
        '$rootScope',
        function($log, $rootScope) {
            'use strict';

            var svc,
                toggleInteractionState,
                setKeyInteractionHandler,
                mousedownHandler,
                keydownHandler,
                $body = angular.element('body');

            svc = this;

            toggleInteractionState = function() {
                $rootScope.isKeyboardInUse = !$rootScope.isKeyboardInUse;

                if ($rootScope.isKeyboardInUse) {
                    mousedownHandler = function(mouseDetection) {
                        $(this).unbind(mouseDetection);
                        toggleInteractionState();
                        svc.applyStyleToFocusableElements();
                    };
                    // detect mouse interaction
                    $body.on('mousedown', mousedownHandler);
                }
            };

            setKeyInteractionHandler = function() {
                keydownHandler = function() {
                    if (!$rootScope.isKeyboardInUse) {
                        toggleInteractionState();
                    }
                    // since we can't easily determine when angular is done building the DOM,
                    // persist the listener on body, re-apply css hooks to newly rendered markup
                    svc.applyStyleToFocusableElements();
                };
                // detect keyboard interaction
                $body.on('keydown', keydownHandler);
            };
            svc.init = function() {
                $rootScope.isKeyboardInUse = false;
                setKeyInteractionHandler();
            };

            svc.setFocusElements = function(elements) {
                svc.keyboardFocusableElements = elements;
            };

            svc.applyStyleToFocusableElements = function() {
                // display visual focus indicators, based on keyboard use
                $(svc.keyboardFocusableElements).toggleClass('kb-mode', $rootScope.isKeyboardInUse);
            };

            $rootScope.skipNav = function(event) {
                event.stopPropagation();
                $('#skipTarget').next('div').find(':focusable').first().focus();
            };

            // if the user is in keyboard mode,
            // elements that have focus on new page views need this in order to see the focus outline
            $rootScope.$on('$viewContentLoaded', function() {
                // $log.log('[$viewContentLoaded]');
                svc.applyStyleToFocusableElements();
            });

            $rootScope.$on('$destroy', function() {
                if (mousedownHandler) {
                    $body.off('mousedown', mousedownHandler);
                }
                if (keydownHandler) {
                    $body.off('keydown', keydownHandler);
                }
            });

            return svc;
        }
    ]);
