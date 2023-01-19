angular.module('RealizeDirectives')
    .directive('focusOnDropdown', ['$timeout',
        function($timeout) {
            'use strict';

            return {
                link: function(scope, el, attrs) {
                    var id = attrs.focusOnDropdown,
                        $dropdownToggle = el.find('.dropdown-toggle'),
                        eventNamespace = '.focusOnDropdown',
                        timer;

                    $dropdownToggle.on('click' + eventNamespace, function() {
                        timer = $timeout(function() {
                            if (id && el.hasClass('open')) {
                                el.find(id).focus();
                            }
                        }, 100);
                    });

                    scope.$on('$destroy', function() {
                        $dropdownToggle.off(eventNamespace);
                        $timeout.cancel(timer);
                    });
                }
            };
        }
    ]);
