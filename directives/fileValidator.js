angular.module('RealizeApp')
    .constant('FILE_SIZE_VALIDATOR', {
        MIN_FILE_SIZE: 1024,
        MAX_FILE_SIZE: 10485760
    })
    .directive('fileValidator', [
        '$log',
        'FILE_SIZE_VALIDATOR',
        'FormService',
        function($log, FILE_SIZE_VALIDATOR, FormService) {
            'use strict';

            return {
                require: 'ngModel',
                link: function(scope, el, attrs, ctrl) {
                    var minSizeLimit = attrs.minSizeLimit || FILE_SIZE_VALIDATOR.MIN_FILE_SIZE,
                        sizeLimit = attrs.sizeLimit || FILE_SIZE_VALIDATOR.MAX_FILE_SIZE,
                        fileTypeValidator = function(filename) {
                            return FormService.isValidFileType(FormService.getExtension(filename));
                        },
                        fileNameValidator = function(fileName) {
                            return !FormService.containsRestrictedChars(fileName);
                        };

                    // allow for custom filetype validator method (TODO: support simple array and "accept")
                    if (attrs.fileTypeValidator) {
                        fileTypeValidator = scope.$eval(attrs.fileTypeValidator);
                    }

                    // can't render to file input
                    ctrl.$render = angular.noop;

                    ctrl.$parsers.push(function(viewValue) {
                        ctrl.$setValidity('isVirusFree', true);
                        if (angular.isDefined(viewValue) && angular.isObject(viewValue)) {
                            ctrl.$setValidity('minFileSize', (viewValue.size >= minSizeLimit));
                            ctrl.$setValidity('size', (viewValue.size <= sizeLimit));
                            ctrl.$setValidity('filetype', fileTypeValidator(viewValue.name));
                            ctrl.$setValidity('fileName', fileNameValidator(viewValue.name));
                        } else {
                            // if undefined, we are assuming that the browser is lame
                            ctrl.$setValidity('minFileSize', true);
                            ctrl.$setValidity('size', true);
                            ctrl.$setValidity(
                                'filetype',
                                angular.isString(viewValue) ? fileTypeValidator(viewValue) : true
                            );
                            ctrl.$setValidity(
                                'fileName',
                                angular.isString(viewValue) ? fileNameValidator(viewValue) : true
                            );
                        }

                        // don't alter the result, just validate
                        return viewValue;
                    });

                    var listener = function() {
                        scope.$applyAsync(function() {
                            //TODO: replace this whole this with the way we do it in CAT (with a real directive)
                            if (attrs.multiple) {
                                ctrl.$setViewValue(el[0].files);
                            } else {
                                ctrl.$setViewValue(el[0].files ? el[0].files[0] : el[0].form.file.value);
                            }
                        });
                    };

                    el.on('change', listener);
                }
            };
        }
    ]);
