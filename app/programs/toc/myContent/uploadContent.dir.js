angular.module('Realize.content.upload', [
    'Realize.constants.contentUploadTypes',
    'Realize.constants.fileUploadErrorResponse',
    'Realize.paths',
    'Realize.content',
    'rlzComponents.components.i18n',
    'Realize.alerts.inlineAlertService',
    'Realize.myContent.myContentDataService'
])
    .directive('uploadContent', [
        '$log',
        '$location',
        '$routeParams',
        'Modal',
        'REST_PATH',
        'PATH',
        'InlineAlertService',
        'lwcI18nFilter',
        'MyContent',
        'Content',
        'FormService',
        'FILE_UPLOAD_ERROR_RESPONSE',
        'CONTENT_UPLOAD_TYPES',
        function($log, $location, $routeParams, Modal, REST_PATH, PATH, InlineAlertService, lwcI18nFilter,
            MyContent, Content, FormService, FILE_UPLOAD_ERROR_RESPONSE, CONTENT_UPLOAD_TYPES) {
            'use strict';
            return {
                scope: {
                    uploadType: '@',
                    closeUploadView: '&',
                    containerId: '@',
                    onUploadSuccess: '&',
                    onUploadFailure: '&'
                },
                templateUrl: PATH.TEMPLATE_CACHE + '/app/programs/toc/myContent/uploadContent.dir.html',

                link: function(scope) {

                    scope.isFileUpload = scope.uploadType === CONTENT_UPLOAD_TYPES.FILE;
                    scope.isLinkUpload = scope.uploadType === CONTENT_UPLOAD_TYPES.LINK;
                    scope.isGoogleDrive = scope.uploadType === CONTENT_UPLOAD_TYPES.GOOGLE_DRIVE;
                    scope.showTermsofUse = scope.isFileUpload || scope.isGoogleDrive;
                    scope.serverError = false;
                    scope.googleDriveMessage = lwcI18nFilter('googleIntegrations.googleDrive.additionalMessage');

                    scope.item = {
                        filename: lwcI18nFilter('attachmentModal.action.noFileChosen')
                    };

                    scope.actionText =
                        lwcI18nFilter(scope.isFileUpload ? 'myContent.action.upload' : 'myContent.action.add');

                    var progressModal,
                        initialized = false,
                        getFormFields = function(withText) {
                            var formFields = [];
                            if (scope.isFileUpload) {
                                formFields = ['file', 'title', 'agreedToTerms'];
                            } else if (scope.isLinkUpload) {
                                formFields = ['url', 'title'];
                            } else {
                                formFields = ['url', 'title', 'agreedToTerms'];
                            }
                            if (withText) {
                                formFields.push('text');
                            }
                            return formFields;
                        },
                        formFields = getFormFields(),
                        formFieldsWithText = getFormFields(true),
                        getAlertData = function() {
                            var msg = 'myContent.successNotification.type.message',
                                type = 'fileUploaded';
                            if (scope.isGoogleDrive) {
                                type = 'driveFileAdded';
                            } else if (scope.isLinkUpload) {
                                type = 'linkAdded';
                            }
                            return {
                                type: 'success',
                                msg: [
                                    '<strong>', lwcI18nFilter('myContent.successNotification.linkAdded.title'),
                                    '</strong> ', lwcI18nFilter(msg.replace('type', type))
                                ]
                            };
                        },
                        showInlineAlert = function(newContentId) {
                            InlineAlertService.addAlert(newContentId, getAlertData());
                        },
                        showProgress = function() {
                            progressModal = Modal.progressDialog(scope.$new(true), {
                                progressHeader: lwcI18nFilter('myContent.uploadProgress.title'),
                                progressMessage: lwcI18nFilter('myContent.uploadProgress.message')
                            }).then(function() {
                                progressModal.fakeProgress(500);
                            });
                        },
                        hideProgress = function(isSuccess) {
                            if (!isSuccess) {
                                scope.uploadInProgress = isSuccess;
                            }
                            if (progressModal && isSuccess) {
                                progressModal
                                    .then(function() {
                                        return progressModal.progressComplete();
                                    })
                                    .then(function() {
                                        Modal.hideDialog();
                                    });
                            } else if (progressModal && !isSuccess) {
                                Modal.hideDialog();
                                progressModal.$destroy();
                            }
                        },
                        uploadSuccessHandler = function(data) {
                            MyContent.setSuccessMsgFlag(scope.uploadType, true);
                            showInlineAlert(data.item.id);
                            hideProgress(true);
                            // notify parent
                            scope.onUploadSuccess({type: scope.uploadType, data: data});
                        },
                        linkSubmitFailureHandler = function(error) {
                            hideProgress(false);
                            // notify parent
                            scope.onUploadFailure({type: scope.uploadType, error: error});
                        },
                        doSubmitLink = function(linkObj) {
                            var linkToGo = {
                                    title: linkObj.title,
                                    text: linkObj.text || '',
                                    fileType: 'URL',
                                    mediaType: 'Link',
                                    // set the externalSource to drive for drive links to show the drive icon
                                    // even if the mediaType is link
                                    externalSource: scope.isGoogleDrive ? CONTENT_UPLOAD_TYPES.GOOGLE_DRIVE : '',
                                },
                                data = {
                                    url: linkObj.url,
                                    json: angular.toJson(linkToGo)
                                };
                            showProgress();
                            MyContent.addContentItemToMyLibrary(data, scope.containerId)
                                .then(uploadSuccessHandler, linkSubmitFailureHandler);
                        },
                        linkSubmitHandler = function(linkObj) {
                            if (scope.validateForm()) {
                                $log.log('LINK SUBMITTED', linkObj);
                                doSubmitLink(linkObj);
                            }
                        },
                        fileUploadFailureHandler = function(error) {
                            $log.error('upload file error:', error);

                            hideProgress(false);
                            scope.uploadInProgress = false;

                            if (error.status === 200) {
                                scope.serverError = true;
                                return;
                            }

                            var realizeError,
                                chooseFile = scope.uploadContentForm.file;
                            if (error.responseText.trim() === FILE_UPLOAD_ERROR_RESPONSE.AV_SCAN_RESPONSE_TEXT) {
                                chooseFile.$setValidity('isVirusFree', false);
                                realizeError = error;
                            } else {
                                realizeError = angular.fromJson(error.responseText) || error;
                            }

                            if (realizeError.errorCode === '500' || realizeError.error === 'aborted') {
                                scope.serverError = true;
                            } else if (realizeError.errorCode === 'filesize') {
                                chooseFile.$setValidity('size', false);
                            }
                            // notify parent
                            scope.onUploadFailure({type: scope.uploadType, error: error});
                        },
                        onAjaxSubmit = function(e, promise) {
                            $log.log('onAjaxSubmit', e, promise);
                            scope.uploadContentForm.file.$setValidity('isVirusFree', true);
                            showProgress();
                            promise.then(uploadSuccessHandler, fileUploadFailureHandler);
                        },
                        isFileFieldEmpty = function() {
                            return scope.isFileUpload &&
                                !FormService.isFormContainingAnyNonEmptyFields(scope.uploadContentForm, ['file']);
                        },
                        isFormLackingAnyNonEmptyFields = function() {
                            return !FormService.isFormContainingAnyNonEmptyFields(scope.uploadContentForm,
                                formFieldsWithText);
                        },
                        isInitializationComplete = function() {
                            if (!initialized) {
                                initialized = formFields.every(function(field) {
                                    return angular.isDefined(scope.uploadContentForm[field]);
                                });
                            }
                            return initialized;
                        };

                    scope.showHideChooseFileError = function() {
                        var chooseFile = scope.uploadContentForm.file;
                        return scope.isFileUpload && (chooseFile.$error.required || chooseFile.$error.filetype ||
                            chooseFile.$error.fileName || chooseFile.$error.size || chooseFile.$error.isVirusFree ||
                            chooseFile.$error.minFileSize);
                    };

                    scope.validateForm = function() {
                        FormService.setFormFieldsDirty(scope.uploadContentForm, formFields);
                        scope.uploadInProgress = scope.uploadContentForm.$valid;
                        scope.$applyAsync();
                        return scope.uploadInProgress;
                    };

                    scope.validateUploadFileForm = function() {
                        return scope.isFileUpload && scope.validateForm();
                    };

                    /**
                     * open a static page in a new window
                     * /userAgreement depends on a server side route
                     */
                    scope.openUserAgreement = scope.showTermsofUse ? FormService.openUserAgreement : angular.noop;

                    if (scope.isFileUpload) {
                        scope.enctype = 'multipart/form-data';
                        scope.getUploadFileData = FormService.getUploadFileData;

                        scope.getFileUploadUrl = function() {
                            return REST_PATH + '/item/upsert/myLibraryContentItem/' +
                                scope.containerId + '?file=' + scope.uploadContentForm.file;
                        };

                        scope.$on('onAjaxSubmit', onAjaxSubmit);

                        scope.getFileUploadErrorMessage = function() {
                            var chooseFile = scope.uploadContentForm.file;
                            if (chooseFile.$error.required) {
                                return lwcI18nFilter('myContent.uploadFileForm.file.error.required');
                            }
                            if (chooseFile.$error.filetype) {
                                return lwcI18nFilter('myContent.uploadFileForm.file.error.fileTypeNotSupported');
                            }
                            if (chooseFile.$error.fileName) {
                                return lwcI18nFilter('myContent.uploadFileForm.file.error.fileNameNotSupportedChar');
                            }
                            if (chooseFile.$error.size) {
                                return lwcI18nFilter('myContent.uploadFileForm.file.error.fileOverSizeLimit');
                            }
                            if (chooseFile.$error.isVirusFree) {
                                return lwcI18nFilter('myContent.uploadFileForm.file.error.isVirusFree');
                            }
                            if (chooseFile.$error.minFileSize) {
                                return lwcI18nFilter('myContent.uploadFileForm.file.error.fileMinSizeLimit');
                            }
                            return '';
                        };
                    } else {
                        scope.submitLink = linkSubmitHandler;
                    }

                    scope.isUploadButtonDisabled = function() {
                        return scope.uploadInProgress || !isInitializationComplete() ||
                            isFormLackingAnyNonEmptyFields() ||
                            (!isFileFieldEmpty() && scope.showHideChooseFileError());
                    };

                    scope.onDrive = function(docs) {
                        if (docs.length) {
                            scope.item.url = docs[0].url;
                            scope.item.filename = scope.item.title = docs[0].name;
                        }
                    };
                }
            };
        }
    ]);
