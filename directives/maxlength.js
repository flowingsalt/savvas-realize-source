angular.module('RealizeDirectives')
     // Usage: <textarea maxlength='{num}' maxlength-shim /></textarea>
    .directive('maxlengthShim', [
        '$log',
        function($log) {
            'use strict';

            return {
                require: 'ngModel',
                link: function(scope, el, attrs, ngModelCtrl) {
                    var hasMaxlengthAttr = el.is('[maxlength]');
                    var noMaxlengthSupport = !Modernizr.input.max;
                    var isTextarea = el.is('textarea');

                    if (hasMaxlengthAttr && noMaxlengthSupport && isTextarea) {
                        $log.log('maxlength polyfilled');

                        var maxlength = attrs.maxlength;
                        var checkLength = function(text) {
                            if (text.length > maxlength) {
                                var transformedInput = text.substring(0, maxlength);
                                ngModelCtrl.$setViewValue(transformedInput);
                                ngModelCtrl.$render();
                                return transformedInput;
                            }
                            return text;
                        };
                        ngModelCtrl.$parsers.push(checkLength);
                    }
                }
            };
        }
    ])

    .directive('characterCounter', [
        function() {
            'use strict';

            return function(scope, el, attrs) {
                var characterLimit = scope.$eval(attrs.characterLimit);

                el.html(characterLimit);

                scope.$watch(attrs.characterCounter, function(text) {
                    if (angular.isString(text)) {
                        el.html(characterLimit - text.length);
                    }
                });
            };
        }
    ]);
