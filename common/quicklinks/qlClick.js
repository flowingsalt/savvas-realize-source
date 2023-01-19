    // since quicklinks must exist inside a quick-list, clicks should happen in parent scope
    angular.module('Realize.quicklinks.qlClick', [])
        .directive('qlClick', [
            '$parse',
            function($parse) {
                'use strict';

                return {
                    link: function(scope, el, attrs) {
                        var qlClickHandler = $parse(attrs.qlClick);

                        el.on('click', function(e) {
                            qlClickHandler(scope.$parent, {$event: e});
                            if (!scope.$$phase && !scope.$root.$$phase) {
                                scope.$apply();
                            }
                        });
                    }
                };
            }
        ]);
