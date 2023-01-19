angular.module('RealizeDataServices')
    .factory('FormService', [
        'Modal',
        '$window',
        '$log',
        'ROOT_PATH',
        function(Modal, $window, $log, rootPath) {
            'use strict';

            var service = {}, defaultRestrictedChars = ['%'];

            service.shouldBeDownloadOnly = function(type) {
                var downloadOnlyTypes = ['DOC', 'DOCX', 'PDF', 'PPT', 'PPTX', 'RTF', 'TXT'];
                return $.inArray(type, downloadOnlyTypes) >= 0;
            };

            service.getExtension = function(filename) {
                if (filename.lastIndexOf('.') >= 0) {
                    return filename.substring(filename.lastIndexOf('.') + 1).toUpperCase();
                }
            };

            service.getMediaType = function(type) {
                // default to 'Unknown' type - provide map for exceptions based on
                // file type.
                var fileTypeToMediaType = {
                    'JPG': 'Image',
                    'GIF': 'Image',
                    'PNG': 'Image',
                    'MP3': 'Audio',
                    'MP4': 'Video',
                    'DOC': 'Document',
                    'DOCX': 'Document',
                    'PPT': 'Document',
                    'PPTX': 'Document',
                    'PDF': 'Document',
                    'TXT': 'Document',
                    'RTF': 'Document'
                };

                return fileTypeToMediaType[type] || 'Unknown';
            };

            service.isValidFileType = function(fileType) {
                if (angular.isDefined(fileType)) {
                    return service.getMediaType(fileType) !== 'Unknown';
                }
                return false;
            };

            service.containsRestrictedChars = function(fileName, chars) {
                var isFileNameContainsRestrictedChar = false,
                    restrictedChars = defaultRestrictedChars;

                if (angular.isDefined(chars) && angular.isArray(chars)) {
                    restrictedChars = defaultRestrictedChars.concat(chars);
                }

                angular.forEach(restrictedChars, function(restrictedChar) {
                    if (fileName.lastIndexOf(restrictedChar) >= 0) {
                        isFileNameContainsRestrictedChar = true;
                    }
                });
                return isFileNameContainsRestrictedChar;
            };

            // open a static page in a new window
            //userAgreement depends on a server side route
            service.openUserAgreement = function(e) {
                e.stopPropagation();
                e.preventDefault(); //prevent angular to mark form as dirty on click

                $window.open(
                    rootPath + '/prelogin/userAgreement.html',
                    '_blank'
                    );
            };

            service.setFileValidity = function(scope, element, fileInput, supportedFileTypeCheck, sizeLimit) {
                var defaultFileTypeCheck = function(filename) {
                    var fileType = service.getExtension(filename);
                    return service.isValidFileType(fileType);
                };

                sizeLimit = sizeLimit || 10485760;
                supportedFileTypeCheck = supportedFileTypeCheck || defaultFileTypeCheck;

                scope.$apply(function() {

                    //If browser has html5 file API support ...
                    if (element.files) {
                        var fileObject = element.files[0];

                        //if user clicks cancels on select file, then file was not set
                        if (!angular.isDefined(fileObject)) {
                            fileInput.$setValidity('required', false);
                            return;
                        }

                        fileInput.$setValidity('size', (fileObject.size <= sizeLimit));
                    } else {
                        // The Case where we are not using a browser that has html5 file support
                        // Set filetype by extension of the file
                        if (element.value.length < 1) {
                            fileInput.$setValidity('required', false);
                            return;
                        }

                        // Need to wait until server side comes back with an error if size is too big
                        fileInput.$setValidity('size', true);
                    }

                    fileInput.$setValidity('required', true); // We know we have selected a file
                    fileInput.$setValidity('filetype', supportedFileTypeCheck(element.value));
                });
            };

            service.getUploadFileData = function(item) {
                $log.log('getUploadFileData', item);

                // update some details (todo: move to MyLibraryItem class/service)
                // for IE, file might be a path instead of an object
                if (angular.isString(item.file)) {
                    item.fileType = service.getExtension(item.file);
                } else if (item.file) {
                    item.fileType = service.getExtension(item.file.name);
                }

                item.mediaType = service.getMediaType(item.fileType);
                // Attached documents need to be download only because we won't be running
                // them through the preview engine.  Other asset types should be stream/view
                if (service.shouldBeDownloadOnly(item.fileType)) {
                    item.restrictedDownloadContent = 'Download Only';
                } else {
                    item.restrictedDownloadContent = 'Stream/View';
                }

                //needed for $getTitle to work
                item.associativeProps = {};

                return {json: angular.toJson(item)};
            };

            service.setFormFieldsDirty = function(form, fields) {
                angular.forEach(fields, function(field) {
                    form[field].$dirty = true;
                });
            };

            service.isFormContainingAnyNonEmptyFields = function(form, fields) {
                fields = Array.isArray(fields) ? fields : [fields];

                return fields.filter(function(field) {
                    if (angular.isDefined(form[field].$modelValue)) {
                        return (typeof form[field].$modelValue === 'boolean' ||
                            typeof form[field].$modelValue === 'object') ?
                            form[field].$modelValue : form[field].$modelValue.length > 0;
                    }
                    return false;
                }).length > 0;
            };

            service.forceValidPassword = function(formObj) {
                var errorKeys = ['pwdLength', 'pwdLetter', 'pwdNumber', 'required'];
                angular.forEach(errorKeys, function(key) {
                    formObj.password.$setValidity(key, true);
                });
            };

            return service;
        }
    ]);
