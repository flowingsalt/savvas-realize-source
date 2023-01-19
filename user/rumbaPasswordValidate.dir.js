angular.module('RealizeDataServices')
    .directive('rumbaPasswordValidate', [
        function() {
            'use strict';

            return {
                require: 'ngModel',
                restrict: 'A',
                link: function(scope, elm, attrs, ctrl) {
                    if (!attrs.rumbaPasswordValidate) {
                        throw ('You must supply the user object to validate against as the value of the ' +
                            'directive attribute.');
                    }

                    var validator = function(viewValue) {
                        // the directive relies on this:
                        var user = scope.$eval(attrs.rumbaPasswordValidate);

                        var escapeRegExp = function(str) {
                            return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
                        };

                        if (!attrs.disallowEmpty && (!angular.isString(viewValue) || !viewValue)) {

                            // this is necessary in case they do a ctrl + x (cut) and remove the entire
                            // password value at once (RGHT-11755)
                            ctrl.$setValidity('pwdLength', false);
                            ctrl.$setValidity('pwdNumber', true);
                            ctrl.$setValidity('pwdLetter', true);

                            return undefined;
                        }

                        var pwdValidLength = viewValue.length >= 8;
                        var pwdValidMaxLength = viewValue.length <= 32;
                        var pwdHasLetter = /[A-z]/.test(viewValue);
                        var pwdHasNumber = /\d/.test(viewValue) ||
                            /[\~\!\@\#\$\%\^\&\*\(\)\_\-\+\=\|\,\.\]\[\'\:\;\?\\\/><\`\{\}\"]/.test(viewValue);
                        var pwdUsername = (
                                angular.isDefined(user.userName) &&
                                user.userName.length &&
                                viewValue.search(new RegExp(escapeRegExp(user.userName), 'ig')) < 0
                            ) ||
                            !(user.userName && user.userName.length && viewValue.length);
                        var pwdFirst = !angular.isDefined(user.firstName) ?
                            true : viewValue.search(new RegExp(user.firstName, 'ig')) < 0 ||
                            !(user.firstName && user.firstName.length && viewValue.length);
                        var pwdLast = !angular.isDefined(user.lastName) ?
                            true : viewValue.search(new RegExp(user.lastName, 'ig')) < 0 ||
                            !(user.lastName && user.lastName.length && viewValue.length);
                        var pwdSpaces = /^\S*$/.test(viewValue);

                        ctrl.$setValidity('pwdLength', pwdValidLength);
                        ctrl.$setValidity('pwdMaxLength', pwdValidMaxLength);
                        ctrl.$setValidity('pwdLetter', pwdHasLetter);
                        ctrl.$setValidity('pwdNumber', pwdHasNumber);
                        ctrl.$setValidity('pwdUsername', pwdUsername);
                        ctrl.$setValidity('pwdFirst', pwdFirst);
                        ctrl.$setValidity('pwdLast', pwdLast);
                        ctrl.$setValidity('pwdSpaces', pwdSpaces);

                        ctrl.$setValidity('pwd', (pwdValidLength && pwdHasLetter && pwdHasNumber &&
                            pwdUsername && pwdFirst && pwdLast && pwdSpaces));

                        // we only want to validate, allow the model to update (for the pw/text sync)
                        return viewValue;
                    };

                    ctrl.$parsers.unshift(validator);
                    ctrl.$formatters.unshift(validator);

                    if (attrs.revalidateWith) {
                        scope.$watch(attrs.revalidateWith, function() {
                            validator(ctrl.$viewValue);
                        });
                    }
                }
            };
        }
    ]);
