angular.module('RealizeDirectives')
    .directive('placeholderShim', [
        '$log',
        'BrowserInfo',
        function($log, BrowserInfo) {
            'use strict';

            return {
                link: function(scope, el, attrs) {
                    //$log.log('has HTML5 Placeholder Support?', Modernizr.input.placeholder );
                    if (!Modernizr.input.placeholder) {
                        $(el).attr('placeholder', attrs.placeholder);
                        $(el).placeholder();
                    }
                    // Workaround for angularjs IE10 and IE11 issue with placeholder(github issue #4781)
                    if (BrowserInfo.browser.isMSIE) {
                        $log.log('IE10/IE11 placeholder detected');
                        var formName = el.context.form.name,
                            elName = el.context.name,
                            resetToPristine = false;
                        if (formName && elName) {
                            var watchThis = formName + '.' + elName;
                            var fieldWatch = scope.$watch(watchThis, function(newVal) {
                                $log.log('fieldWatch fired');
                                if (newVal) {
                                    var dirtyWatch = scope.$watch(watchThis + '.$dirty', function(newDirty) {
                                        $log.log('dirtyWatch fired');
                                        if (newDirty && !resetToPristine) {
                                            resetToPristine = true;
                                            scope.$eval(formName).$setPristine();
                                            dirtyWatch(); //We are done here, clear watches
                                            fieldWatch();
                                        }
                                    });
                                }
                            });
                        }
                    }
                }
            };
        }
    ])

    // allows for placeholder to be used for arbitrary things like a div or a span
    .directive('placeholderBinding', [
        '$log',
        '$filter',
        function($log, $filter) {
            'use strict';

            return function(scope, el, attrs) {
                //$log.log('placeholder link: ', el, attrs);
                scope.$watch(attrs.placeholderBinding, function(value) {
                    //$log.log('placeholder watch', value, attrs);
                    if (value && attrs.ellipses) {
                        value = $filter('ellipses')(value, attrs.ellipses);
                    }
                    $(el).text(value || attrs.placeholder);
                });
            };
        }
    ]);
