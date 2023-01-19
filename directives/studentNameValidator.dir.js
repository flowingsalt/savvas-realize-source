angular.module('RealizeApp')
    .directive('studentNameValidator', [function() {
        'use strict';

        return {
            priority: 2,
            require: 'ngModel',
            link: function(scope, el, attrs, ctrl) {
                var validate = function(viewValue) {
                    //$log.log('SNV', viewValue);
                    var isDefined = angular.isDefined(viewValue),
                        isString = angular.isString(viewValue),
                        val = (isDefined) ? (isString) ? viewValue : viewValue[attrs.studentNameValidator] : viewValue,
                        nameRgx = [
                            '[\\\']?',
                            '[0-9A-Za-zÁÉÍÓÚÑÜáéíóúñü\\- ]+',
                            '[\\\']?',
                            '(',
                            '[\\.]?',
                            '[0-9A-Za-zÁÉÍÓÚÑÜáéíóúñü\\- ]+',
                            '[\\\']?',
                            ')?'
                        ].join(''),
                        rgx = (val && (new RegExp('(^' + nameRgx + '(,\\s?)' + nameRgx + '$)')).test(val));

                    ctrl.$setValidity('studentName', rgx);
                    // we always return the value, we just want to invalidate it, not block the model
                    return viewValue;
                };

                ctrl.$parsers.push(validate);
                ctrl.$formatters.push(validate);
            }
        };
    }]);
