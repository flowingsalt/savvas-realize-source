angular.module('RealizeDirectives')
    .directive('peteFade', [
        function() {
            'use strict';

            return {
                link: function(scope, el, attrs) {
                    scope.$watch(attrs.peteFade, function(value) {
                        if (value) {
                            $(el).fadeOut('slow');
                        } else {
                            $(el).fadeIn('slow');
                        }
                    });
                }
            };
        }
    ])

    .directive('removeCue', [
        '$log',
        '$timeout',
        function($log, $timeout) {
            'use strict';

            return {
                link: function(scope, el, attrs) {
                    var doAnimate, cancelAnimate, animatePromise;

                    doAnimate = function() {
                        var timeout = attrs.timeout || 0;

                        $(el).addClass('remove');
                        animatePromise = $timeout(function() {
                            $(el)
                            .fadeOut('slow', function() {
                                $(this).removeClass('remove');

                                if (angular.isDefined(attrs.onRemoveComplete)) {
                                    scope.$eval(attrs.onRemoveComplete);
                                    scope.$apply();
                                }

                                $(this).fadeIn('fast');
                            });
                        }, timeout);
                    };

                    cancelAnimate = function() {
                        $timeout.cancel(animatePromise);
                        $(el).removeClass('remove');
                    };

                    scope.$watch(attrs.removeCue, function(value, old) {
                        //$log.log('removeCue attr change', value, old);
                        if (value) {
                            doAnimate();
                        } else if (old) {
                            cancelAnimate();
                        }
                    });
                }
            };
        }
    ])

    .directive('fadeBackground', [
        '$log',
        '$timeout',
        function($log, $timeout) {
            'use strict';

            return {
                link: function(scope, el, attrs) {
                    if (scope.$eval(attrs.enabled)) {
                        $timeout(function() {
                            $(el).animate({
                                backgroundColor: attrs.fadeBackground
                            }, 1000, function() {
                                scope.$apply(scope.$eval(attrs.onComplete));
                            });
                        }, scope.$eval(attrs.timeout));
                    }
                }
            };
        }
    ])

    .directive('classCue', [
        '$log',
        '$timeout',
        function($log, $timeout) {
            'use strict';

            return {
                link: function(scope, el, attrs) {

                    var classTimeout = function(expiredClass) {
                        if (angular.isDefined(attrs.classTimeout)) {
                            var timeout = attrs.classTimeout || 1000;
                            $timeout(function() {
                                angular.element(el).removeClass(expiredClass);
                            }, timeout);
                        }
                    };

                    var oldClass;
                    scope.$watch(attrs.trigger, function(val, old) {
                        if (angular.isDefined(val) && angular.isDefined(old)) {
                            var newClass = scope.$eval(attrs.classCue);
                            if (newClass) {
                                angular.element(el).addClass(newClass);
                                oldClass = newClass;
                            }
                            if (oldClass && oldClass !== newClass) {
                                angular.element(el).removeClass(oldClass);
                            }
                            classTimeout(newClass);
                        }
                    });
                }
            };
        }
    ]);
