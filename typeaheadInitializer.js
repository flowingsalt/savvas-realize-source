angular.module('TypeaheadInitializer', [
    'ui.bootstrap.typeahead'
])
    .constant('LIB_PATH', window.mediaPath + '/lib')
    .config([
        '$provide',
        function($provide) {
            'use strict';

            $provide.decorator('typeaheadDirective', [
                '$delegate',
                function($delegate) {
                    var typeahead = $delegate[0];

                    typeahead.priority = -1;

                    var linkOriginal = typeahead.link;

                    typeahead.compile = function() {
                        var linkNew = function(scope, element, attrs, modelCtrl) {
                            var typeaheadPopup = '[typeahead-popup]';

                            //fixes RGHT-10592 - tab should move focus away without selecting item
                            var closeOnTab = scope.$eval(attrs.typeaheadCloseOnTab);

                            if (angular.isDefined(closeOnTab)) {
                                element.on('keydown', function(event) {
                                    var popupEl = angular.element(typeaheadPopup);

                                    if (event.which === 9) { //tab(9)
                                        event.stopImmediatePropagation();
                                        popupEl.scope().matches = [];
                                        popupEl.scope().active = -1;
                                        scope.$digest();
                                    }
                                });
                            }

                            //on focus, open popup with matches
                            element.on('focus', function() {
                                modelCtrl.$setViewValue(modelCtrl.$viewValue); //triggers getMatches
                                //scope.$apply();
                            });

                            linkOriginal.apply(this, arguments);
                        };

                        return linkNew;
                    };

                    return $delegate;
                }
            ]);

            $provide.decorator('typeaheadPopupDirective', [
                '$delegate',
                function($delegate) {
                    var typeaheadPopup = $delegate[0];

                    typeaheadPopup.templateUrl = 'templates/partials/typeahead.html';

                    var linkOriginal = typeaheadPopup.link;

                    typeaheadPopup.compile = function() {
                        var linkNew = function(scope) {
                            linkOriginal.apply(this, arguments);

                            var typeaheadDropdown = angular.element('.typeahead.dropdown-menu'),
                                typeaheadEl = angular.element('[typeahead]'),
                                scrollDownIntervalAttr = typeaheadEl.attr('typeahead-scroll-down-interval'),
                                scrollDownInterval = scope.$eval(scrollDownIntervalAttr) || 3,
                                hasScrolledDown,
                                hasScrolledUp,
                                hasScrolledToBottom;

                            scope.$watch('active', function(active, oldVal) {
                                hasScrolledDown = active > oldVal && active % scrollDownInterval === 0;
                                hasScrolledUp = active < oldVal;
                                hasScrolledToBottom = active === scope.matches.length - 1;

                                if (hasScrolledDown || hasScrolledUp || hasScrolledToBottom) {
                                    //fixes RGHT-10591 - scroll for keyboard mode
                                    typeaheadDropdown.scrollTo('li:eq(' + active + '):has(a.kb-mode)', 0, {
                                        axis: 'y'
                                    });
                                }
                            });

                            scope.isOpen = function() {
                                var isOpen = scope.matches.length > 0;

                                if (!isOpen) {
                                    scope.$emit('typeaheadPopup.noMatches');
                                } else {
                                    scope.$emit('typeaheadPopup.hasMatches');
                                }

                                return isOpen;
                            };
                        };

                        return linkNew;
                    };

                    return $delegate;
                }
            ]);

            $provide.decorator('typeaheadMatchDirective', [
                '$delegate',
                'Messages',
                function($delegate, Messages) {
                    var typeaheadMatch = $delegate[0];

                    var linkOriginal = typeaheadMatch.link;

                    typeaheadMatch.compile = function() {
                        var linkNew = function(scope) {
                            linkOriginal.apply(this, arguments);
                            scope.Messages = Messages;
                        };

                        return linkNew;
                    };

                    return $delegate;
                }
            ]);
        }
    ]);
