angular.module('RealizeDataServices')
    .directive('rumbaEmailValidate', [
        function() {
            'use strict';

            return {
                require: 'ngModel',
                link: function(scope, el, attrs, ctrl) {
                    var validator = function(viewValue) {
                        if (!angular.isString(viewValue) || _.isEmpty(viewValue)) {
                            return scope.$eval(attrs.ngDisabled);
                        }

                        var email, domain = '',
                            parts = viewValue.split('@');

                        email = parts[0];
                        if (parts.length === 2) { // we have something that looks like email
                            domain = parts[1];
                        }

                        var domainRequired = (domain && domain.length > 0);
                        var domainHyphenStart = (domain && domain[0] !== '-');
                        var domainUnderscoreRule = (domain && domain[0] !== '_' && domain[domain.length - 1] !== '_');
                        var domainPeriodRule = (domain && (/^([^\.]+\.[^\.]+)+$/g).test(domain));
                        var emailPeriodRule = (email && !email.match(/\.\./));

                        ctrl.$setValidity('emailDomainRequired', domainRequired);
                        ctrl.$setValidity('emailDomainHyphenStart', domainHyphenStart);
                        ctrl.$setValidity('emailDomainUnderscoreRule', domainUnderscoreRule);
                        ctrl.$setValidity('emailDomainPeriodRule', domainPeriodRule);
                        ctrl.$setValidity('emailPeriodRule', emailPeriodRule);

                        return domainRequired && domainHyphenStart && domainUnderscoreRule &&
                            domainPeriodRule && emailPeriodRule;
                    };

                    // add a parser that will process each time the value is
                    // parsed into the model when the user updates it.
                    ctrl.$parsers.unshift(function(value) {
                        var valid = validator(value);
                        ctrl.$setValidity('email', valid);

                        // if it's valid, return the value to the model,
                        // otherwise return undefined.
                        return valid ? value : undefined;
                    });

                    // add a formatter that will process each time the value
                    // is updated on the DOM element.
                    ctrl.$formatters.unshift(function(value) {
                        // validate.
                        ctrl.$setValidity('email', validator(value));

                        // return the value or nothing will be written to the DOM.
                        return value;
                    });
                }
            };
        }
    ]);
